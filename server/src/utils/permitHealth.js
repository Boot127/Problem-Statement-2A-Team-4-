// Dev 2 — permit information health (completeness score, review state, warnings).
//
// This answers the client's core complaint: compliance information that is
// incomplete or silently out of date. It is deliberately DERIVED rather than
// stored — a stored completeness score would go stale the moment someone adds
// a process step, and a stale "85% complete" badge is worse than none.
//
// Pure functions only, so both the list and detail paths can reuse them and
// they can be tested without a database.

const PROCESS_TYPES = ['NEW', 'RENEWAL', 'CANCELLATION'];

// A permit whose next review date is inside this window is "due soon" rather
// than merely current, giving staff warning before it actually lapses.
const DUE_SOON_DAYS = 14;

// Below this, the permit is treated as INCOMPLETE regardless of its dates:
// a half-filled record is not trustworthy even if it was reviewed yesterday.
const INCOMPLETE_THRESHOLD = 70;

// Default review cadence used when suggesting a next review date.
const DEFAULT_REVIEW_INTERVAL_MONTHS = 6;

function hasText(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function hasNumber(value) {
  return value !== undefined && value !== null && value !== '' && !Number.isNaN(Number(value));
}

// The 16 checks from the improvement plan, Section 3.4. `childCounts` is
// { steps: {NEW,RENEWAL,CANCELLATION}, documents: {...} }.
function buildChecks(permit, childCounts) {
  const steps = childCounts?.steps || {};
  const documents = childCounts?.documents || {};

  const checks = [
    { key: 'title', label: 'Title', done: hasText(permit.title) },
    { key: 'permitType', label: 'Permit type', done: hasText(permit.permitType) },
    { key: 'country', label: 'Country', done: hasText(permit.countryCode) },
    { key: 'description', label: 'Description', done: hasText(permit.description) },
    { key: 'eligibility', label: 'Eligibility criteria', done: hasText(permit.eligibilityCriteria) },
    { key: 'processingTime', label: 'Processing time', done: hasNumber(permit.processingTimeDays) },
    { key: 'validity', label: 'Validity period', done: hasNumber(permit.validityMonths) },
    { key: 'fee', label: 'Government fee', done: hasNumber(permit.governmentFee) },
    { key: 'currency', label: 'Currency code', done: hasText(permit.currencyCode) },
    {
      key: 'source',
      label: 'Official source',
      // Either a source URL or an uploaded source document satisfies this.
      done: hasText(permit.sourceUrl) || Number(permit.sourceDocumentCount || 0) > 0,
    },
  ];

  PROCESS_TYPES.forEach((type) => {
    const label = type === 'NEW' ? 'New application' : type === 'RENEWAL' ? 'Renewal' : 'Cancellation';
    checks.push({
      key: `steps${type}`,
      label: `${label} process steps`,
      done: Number(steps[type] || 0) > 0,
    });
  });

  PROCESS_TYPES.forEach((type) => {
    const label = type === 'NEW' ? 'New application' : type === 'RENEWAL' ? 'Renewal' : 'Cancellation';
    checks.push({
      key: `documents${type}`,
      label: `${label} document checklist`,
      done: Number(documents[type] || 0) > 0,
    });
  });

  return checks;
}

// completed / total * 100, rounded. Also returns the labels of what is missing
// so the UI can list gaps instead of only showing a percentage.
function computeCompleteness(permit, childCounts) {
  const checks = buildChecks(permit, childCounts);
  const completed = checks.filter((c) => c.done).length;
  const total = checks.length;

  return {
    score: total === 0 ? 0 : Math.round((completed / total) * 100),
    completed,
    total,
    checks,
    missing: checks.filter((c) => !c.done).map((c) => c.label),
  };
}

// Days from `now` until an ISO date string. Negative means overdue.
// Returns null when the date is absent or unparseable, so callers can tell
// "no date recorded" apart from "due today".
function daysUntil(isoDate, now) {
  if (!hasText(isoDate)) return null;
  const target = new Date(`${String(isoDate).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((target - today) / 86_400_000);
}

// A permit is unusable without the New-application flow, whatever its overall
// percentage says: a record with every metadata field filled but no steps and
// no checklist is precisely the "looks complete, tells you nothing" case the
// client complained about. Renewal and Cancellation are NOT required here —
// some permit types genuinely have neither — so they only affect the score.
function isMissingCoreProcess(completeness) {
  const byKey = Object.fromEntries(completeness.checks.map((c) => [c.key, c.done]));
  return !byKey.stepsNEW || !byKey.documentsNEW;
}

// The badge a user actually sees. Precedence is deliberate:
//   OUTDATED  — an officer has explicitly flagged it; nothing overrides that
//   INCOMPLETE— too little content to rely on, whatever the dates say
//   REVIEW_DUE— the review date has passed
//   DUE_SOON  — the review date is within the warning window
//   CURRENT   — nothing to flag
function deriveReviewState(permit, completeness, now = new Date()) {
  if (permit.informationStatus === 'OUTDATED') return 'OUTDATED';
  if (completeness.score < INCOMPLETE_THRESHOLD || isMissingCoreProcess(completeness)) {
    return 'INCOMPLETE';
  }
  if (permit.informationStatus === 'INCOMPLETE') return 'INCOMPLETE';

  const days = daysUntil(permit.nextReviewAt, now);
  if (permit.informationStatus === 'REVIEW_DUE') return 'REVIEW_DUE';
  if (days === null) return 'CURRENT';
  if (days < 0) return 'REVIEW_DUE';
  if (days <= DUE_SOON_DAYS) return 'DUE_SOON';
  return 'CURRENT';
}

// Actionable warnings (improvement plan Section 3.5). Ordered most to least
// urgent so the UI can render them top-down without re-sorting.
function buildWarnings(permit, completeness, childCounts, reviewState, now = new Date()) {
  const warnings = [];
  const steps = childCounts?.steps || {};
  const documents = childCounts?.documents || {};

  if (permit.informationStatus === 'OUTDATED') {
    warnings.push({
      severity: 'error',
      message: 'This permit is marked as outdated and should not be relied on until it is reviewed.',
    });
  }

  const days = daysUntil(permit.nextReviewAt, now);
  if (reviewState === 'REVIEW_DUE') {
    warnings.push({
      severity: 'warning',
      message:
        days !== null && days < 0
          ? `Review is overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'}.`
          : 'This permit is flagged as due for review.',
    });
  } else if (reviewState === 'DUE_SOON') {
    warnings.push({
      severity: 'info',
      message: `Review is due in ${days} day${days === 1 ? '' : 's'}.`,
    });
  }

  if (!hasText(permit.lastReviewedAt)) {
    warnings.push({
      severity: 'warning',
      message: 'This permit has never been recorded as reviewed.',
    });
  }

  if (!hasText(permit.sourceUrl) && Number(permit.sourceDocumentCount || 0) === 0) {
    warnings.push({
      severity: 'warning',
      message: 'No official source URL or source document is attached, so the content cannot be verified.',
    });
  }

  PROCESS_TYPES.forEach((type) => {
    const label = type === 'NEW' ? 'New application' : type === 'RENEWAL' ? 'Renewal' : 'Cancellation';
    if (Number(steps[type] || 0) === 0) {
      warnings.push({ severity: 'info', message: `The ${label} process has no steps recorded.` });
    }
    if (Number(documents[type] || 0) === 0) {
      warnings.push({ severity: 'info', message: `The ${label} process has no document checklist.` });
    }
  });

  if (!hasNumber(permit.processingTimeDays)) {
    warnings.push({ severity: 'info', message: 'Processing time is missing.' });
  }
  if (!hasNumber(permit.validityMonths)) {
    warnings.push({ severity: 'info', message: 'Validity period is missing.' });
  }
  if (!hasNumber(permit.governmentFee)) {
    warnings.push({ severity: 'info', message: 'Government fee is missing.' });
  }

  if (permit.status === 'DRAFT') {
    warnings.push({
      severity: 'info',
      message: 'This permit is still a draft and is not published to readers.',
    });
  }

  return warnings;
}

// Everything the detail page needs, in one call.
function buildHealth(permit, childCounts, now = new Date()) {
  const completeness = computeCompleteness(permit, childCounts);
  const reviewState = deriveReviewState(permit, completeness, now);
  return {
    completeness: completeness.score,
    completedChecks: completeness.completed,
    totalChecks: completeness.total,
    missing: completeness.missing,
    checks: completeness.checks,
    reviewState,
    daysUntilReview: daysUntil(permit.nextReviewAt, now),
    warnings: buildWarnings(permit, completeness, childCounts, reviewState, now),
  };
}

// The lean version for list rows — no per-check detail, no warning prose.
function buildHealthSummary(permit, childCounts, now = new Date()) {
  const completeness = computeCompleteness(permit, childCounts);
  return {
    completeness: completeness.score,
    missingCount: completeness.missing.length,
    reviewState: deriveReviewState(permit, completeness, now),
  };
}

// Suggests a next review date one cadence period after the given date, used to
// prefill the form when a user records a review.
function suggestNextReviewDate(fromIsoDate, months = DEFAULT_REVIEW_INTERVAL_MONTHS) {
  const base = hasText(fromIsoDate)
    ? new Date(`${String(fromIsoDate).slice(0, 10)}T00:00:00Z`)
    : new Date();
  if (Number.isNaN(base.getTime())) return null;
  base.setUTCMonth(base.getUTCMonth() + months);
  return base.toISOString().slice(0, 10);
}

module.exports = {
  PROCESS_TYPES,
  DUE_SOON_DAYS,
  INCOMPLETE_THRESHOLD,
  DEFAULT_REVIEW_INTERVAL_MONTHS,
  computeCompleteness,
  isMissingCoreProcess,
  deriveReviewState,
  buildWarnings,
  buildHealth,
  buildHealthSummary,
  daysUntil,
  suggestNextReviewDate,
};
