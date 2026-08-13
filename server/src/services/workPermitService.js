// Dev 2 — work_permits CRUD business logic (Section 11).
// Maps between the frontend's camelCase permit shape and the SQLite
// snake_case columns so permitRoutes/permitController stay simple.

const permitRepository = require('../repositories/permitRepository');
const permitStepService = require('./permitStepService');
const permitDocumentService = require('./permitDocumentService');
const permitSourceDocumentRepository = require('../repositories/permitSourceDocumentRepository');
const permitHealth = require('../utils/permitHealth');
const { ValidationError } = require('../utils/errors');

const VALID_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const VALID_WORKER_TYPES = ['LOCAL', 'FOREIGN_WORKER', 'EXPATRIATE', 'ALL_EMPLOYEES'];
const VALID_VISIBILITY = ['COMPLIANCE_ONLY', 'INTERNAL_STAFF', 'CLIENT_SHAREABLE'];
const VALID_INFORMATION_STATUSES = ['CURRENT', 'REVIEW_DUE', 'OUTDATED', 'INCOMPLETE'];
// Derived badge values a caller may filter the list by.
const VALID_REVIEW_STATES = ['CURRENT', 'DUE_SOON', 'REVIEW_DUE', 'OUTDATED', 'INCOMPLETE'];
const VALID_PROCESS_COMPLETENESS = ['COMPLETE', 'INCOMPLETE'];

// Field limits mirror the client-side Yup schema (permitValidation.js) so a
// request that bypasses the UI is rejected the same way.
const MAX = {
  permitType: 120,
  title: 200,
  permitHolderName: 200,
  clientCompanyName: 200,
  description: 2000,
  eligibilityCriteria: 2000,
  sourceUrl: 500,
  reviewNotes: 1000,
};
const MAX_PROCESSING_DAYS = 3650; // 10 years
const MAX_VALIDITY_MONTHS = 600; // 50 years
const MAX_GOVERNMENT_FEE = 1_000_000_000;

function optionalBooleanQuery(value, label) {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  throw new ValidationError(`${label} must be true or false`);
}

function requireText(value, label, maxLength) {
  if (value === undefined || value === null || !String(value).trim()) {
    throw new ValidationError(`${label} is required`);
  }
  const text = String(value).trim();
  if (text.length > maxLength) {
    throw new ValidationError(`${label} must be ${maxLength} characters or fewer`);
  }
  return text;
}

function optionalText(value, label, maxLength) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value);
  if (text.length > maxLength) {
    throw new ValidationError(`${label} must be ${maxLength} characters or fewer`);
  }
  return text;
}

// These identification fields are displayed and searched as entered, so trim
// accidental surrounding whitespace while retaining NULL for an omitted value.
function optionalTrimmedText(value, label, maxLength) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const text = String(value).trim();
  if (text.length > maxLength) {
    throw new ValidationError(`${label} must be ${maxLength} characters or fewer`);
  }
  return text;
}

// Optional numeric field with an explicit range; rejects junk instead of
// silently coercing it to null (which previously hid bad input).
function optionalNumber(value, label, { min, max, integer }) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    throw new ValidationError(`${label} must be a number`);
  }
  if (integer && !Number.isInteger(num)) {
    throw new ValidationError(`${label} must be a whole number`);
  }
  if (num < min) {
    throw new ValidationError(`${label} must be ${min} or greater`);
  }
  if (num > max) {
    throw new ValidationError(`${label} must be ${max} or less`);
  }
  return num;
}

function optionalUrl(value) {
  if (value === undefined || value === null || value === '') return null;
  const url = String(value).trim();
  if (url.length > MAX.sourceUrl) {
    throw new ValidationError(`Source URL must be ${MAX.sourceUrl} characters or fewer`);
  }
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new ValidationError('Source URL must be a valid URL');
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new ValidationError('Source URL must start with http:// or https://');
  }
  return url;
}

function optionalCurrency(value) {
  if (value === undefined || value === null || value === '') return null;
  const code = String(value).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new ValidationError('Currency code must be 3 letters (e.g. SGD)');
  }
  return code;
}

// ISO calendar date (YYYY-MM-DD). Stored as TEXT so SQLite comparisons and
// ORDER BY behave correctly; a full timestamp is truncated to its date part
// because review cadence is a calendar concept, not a clock one.
function optionalDate(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new ValidationError(`${label} must be a date in YYYY-MM-DD format`);
  }
  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    throw new ValidationError(`${label} is not a valid calendar date`);
  }
  return text;
}

// Enums are now rejected outright rather than silently falling back to a
// default, so a typo surfaces as a 400 instead of saving the wrong value.
function requireEnum(value, allowed, label, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const normalised = String(value).toUpperCase();
  if (!allowed.includes(normalised)) {
    throw new ValidationError(`${label} must be one of: ${allowed.join(', ')}`);
  }
  return normalised;
}

function toDbRow(data) {
  if (data.countryCode === undefined || data.countryCode === null || !String(data.countryCode).trim()) {
    throw new ValidationError('Country is required');
  }
  const countryCode = String(data.countryCode).trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new ValidationError('Country must be a 2-letter ISO country code (e.g. SG)');
  }

  return {
    country_code: countryCode,
    permit_type: requireText(data.permitType, 'Permit type', MAX.permitType),
    title: requireText(data.title, 'Title', MAX.title),
    permit_holder_name: optionalTrimmedText(
      data.permitHolderName,
      'Permit holder name',
      MAX.permitHolderName
    ),
    client_company_name: optionalTrimmedText(
      data.clientCompanyName,
      'Client company name',
      MAX.clientCompanyName
    ),
    description: optionalText(data.description, 'Description', MAX.description),
    eligibility_criteria: optionalText(
      data.eligibilityCriteria,
      'Eligibility criteria',
      MAX.eligibilityCriteria
    ),
    processing_time_days: optionalNumber(data.processingTimeDays, 'Processing time', {
      min: 0,
      max: MAX_PROCESSING_DAYS,
      integer: true,
    }),
    validity_months: optionalNumber(data.validityMonths, 'Validity', {
      min: 0,
      max: MAX_VALIDITY_MONTHS,
      integer: true,
    }),
    government_fee: optionalNumber(data.governmentFee, 'Government fee', {
      min: 0,
      max: MAX_GOVERNMENT_FEE,
      integer: false,
    }),
    currency_code: optionalCurrency(data.currencyCode),
    worker_type: requireEnum(data.workerType, VALID_WORKER_TYPES, 'Worker type', 'FOREIGN_WORKER'),
    visibility: requireEnum(data.visibility, VALID_VISIBILITY, 'Visibility', 'INTERNAL_STAFF'),
    source_url: optionalUrl(data.sourceUrl),
    version: optionalNumber(data.version, 'Version', { min: 1, max: 1_000_000, integer: true }) || 1,
    status: requireEnum(data.status, VALID_STATUSES, 'Status', 'DRAFT'),
    last_reviewed_at: optionalDate(data.lastReviewedAt, 'Last reviewed date'),
    next_review_at: optionalDate(data.nextReviewAt, 'Next review date'),
    review_notes: optionalText(data.reviewNotes, 'Review notes', MAX.reviewNotes),
    information_status: requireEnum(
      data.informationStatus,
      VALID_INFORMATION_STATUSES,
      'Information status',
      'CURRENT'
    ),
  };
}

// Child-record counts by process type, read either from the joined list row or
// from already-loaded child collections.
function countsFromRow(row) {
  return {
    steps: {
      NEW: Number(row.new_steps || 0),
      RENEWAL: Number(row.renewal_steps || 0),
      CANCELLATION: Number(row.cancellation_steps || 0),
    },
    documents: {
      NEW: Number(row.new_docs || 0),
      RENEWAL: Number(row.renewal_docs || 0),
      CANCELLATION: Number(row.cancellation_docs || 0),
    },
  };
}

function countsFromGroups(steps, documents) {
  return {
    steps: {
      NEW: steps.NEW.length,
      RENEWAL: steps.RENEWAL.length,
      CANCELLATION: steps.CANCELLATION.length,
    },
    documents: {
      NEW: documents.NEW.length,
      RENEWAL: documents.RENEWAL.length,
      CANCELLATION: documents.CANCELLATION.length,
    },
  };
}

function toApiShape(row) {
  if (!row) return null;
  return {
    id: row.permit_id,
    countryCode: row.country_code,
    permitType: row.permit_type,
    title: row.title,
    permitHolderName: row.permit_holder_name || '',
    clientCompanyName: row.client_company_name || '',
    description: row.description || '',
    eligibilityCriteria: row.eligibility_criteria || '',
    processingTimeDays: row.processing_time_days,
    validityMonths: row.validity_months,
    governmentFee: row.government_fee === null ? null : Number(row.government_fee),
    currencyCode: row.currency_code || '',
    workerType: row.worker_type,
    visibility: row.visibility,
    sourceUrl: row.source_url || '',
    version: row.version,
    status: row.status,
    lastReviewedAt: row.last_reviewed_at || '',
    nextReviewAt: row.next_review_at || '',
    reviewNotes: row.review_notes || '',
    informationStatus: row.information_status || 'CURRENT',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Maps a joined row to the API shape plus its lean health block, so list rows
// can render a completeness/review badge without loading child records.
//
// `sourceCounts` is the whole-table map from countActiveByPermits(), fetched
// once per request — an uploaded source document satisfies the health module's
// "official source" check, so the score would be wrong without it.
function toListItem(row, now, sourceCounts = {}) {
  const permit = { ...toApiShape(row), sourceDocumentCount: sourceCounts[row.permit_id] || 0 };
  return {
    ...permit,
    health: permitHealth.buildHealthSummary(permit, countsFromRow(row), now),
  };
}

// Paged, bounded list (NFR-2: default 20, max 100, never unbounded).
// Returns { items, page, limit, total, totalPages, statusCounts, reviewCounts }.
async function listPermits({
  search,
  country,
  status,
  reviewState,
  workerType,
  visibility,
  hasSource,
  hasRenewal,
  hasCancellation,
  processCompleteness,
  minFee,
  maxFee,
  minProcessingDays,
  maxProcessingDays,
  nextReviewFrom,
  nextReviewTo,
  page,
  limit,
} = {}) {
  const statusFilter = status
    ? requireEnum(status, VALID_STATUSES, 'Status', undefined)
    : undefined;
  const reviewFilter = reviewState
    ? requireEnum(reviewState, VALID_REVIEW_STATES, 'Review state', undefined)
    : undefined;

  const pageNumber = optionalNumber(page, 'Page', { min: 1, max: 1_000_000, integer: true }) || 1;
  const requestedLimit =
    optionalNumber(limit, 'Limit', { min: 1, max: MAX_LIMIT, integer: true }) || DEFAULT_LIMIT;
  const minimumFee =
    optionalNumber(minFee, 'Minimum fee', {
      min: 0,
      max: MAX_GOVERNMENT_FEE,
      integer: false,
    }) ?? undefined;
  const maximumFee =
    optionalNumber(maxFee, 'Maximum fee', {
      min: 0,
      max: MAX_GOVERNMENT_FEE,
      integer: false,
    }) ?? undefined;
  const minimumProcessingDays =
    optionalNumber(minProcessingDays, 'Minimum processing time', {
      min: 0,
      max: MAX_PROCESSING_DAYS,
      integer: true,
    }) ?? undefined;
  const maximumProcessingDays =
    optionalNumber(maxProcessingDays, 'Maximum processing time', {
      min: 0,
      max: MAX_PROCESSING_DAYS,
      integer: true,
    }) ?? undefined;
  const reviewFrom = optionalDate(nextReviewFrom, 'Next review from');
  const reviewTo = optionalDate(nextReviewTo, 'Next review to');

  if (minimumFee !== undefined && maximumFee !== undefined && minimumFee > maximumFee) {
    throw new ValidationError('Minimum fee must not exceed maximum fee');
  }
  if (
    minimumProcessingDays !== undefined &&
    maximumProcessingDays !== undefined &&
    minimumProcessingDays > maximumProcessingDays
  ) {
    throw new ValidationError('Minimum processing time must not exceed maximum processing time');
  }
  if (reviewFrom && reviewTo && reviewFrom > reviewTo) {
    throw new ValidationError('Next review from date must not be after the to date');
  }

  const filters = {
    search: search ? String(search).trim() : undefined,
    country,
    status: statusFilter,
    workerType: workerType
      ? requireEnum(workerType, VALID_WORKER_TYPES, 'Worker type', undefined)
      : undefined,
    visibility: visibility
      ? requireEnum(visibility, VALID_VISIBILITY, 'Visibility', undefined)
      : undefined,
    hasSource: optionalBooleanQuery(hasSource, 'Has source'),
    hasRenewal: optionalBooleanQuery(hasRenewal, 'Has renewal process'),
    hasCancellation: optionalBooleanQuery(hasCancellation, 'Has cancellation process'),
    processCompleteness: processCompleteness
      ? requireEnum(
          processCompleteness,
          VALID_PROCESS_COMPLETENESS,
          'Process completeness',
          undefined
        )
      : undefined,
    minFee: minimumFee,
    maxFee: maximumFee,
    minProcessingDays: minimumProcessingDays,
    maxProcessingDays: maximumProcessingDays,
    nextReviewFrom: reviewFrom,
    nextReviewTo: reviewTo,
  };
  const now = new Date();
  const offset = (pageNumber - 1) * requestedLimit;

  // Review state is DERIVED (it depends on today's date and on completeness,
  // which spans two child tables), so it cannot be expressed as a WHERE clause.
  // When that filter is active we score the whole filtered set in memory and
  // page it here, which keeps `total`/`totalPages` honest. One extra full scan
  // over this project's dataset is a fair price for a correct envelope.
  if (reviewFilter) {
    const sourceCounts = await permitSourceDocumentRepository.countActiveByPermits();
    const scored = (await permitRepository.findAll(filters))
      .map((row) => toListItem(row, now, sourceCounts))
      .filter((item) => item.health.reviewState === reviewFilter);

    return {
      items: scored.slice(offset, offset + requestedLimit),
      page: pageNumber,
      limit: requestedLimit,
      total: scored.length,
      totalPages: scored.length === 0 ? 0 : Math.ceil(scored.length / requestedLimit),
      statusCounts: await permitRepository.countByStatus(filters),
      reviewCounts: await countReviewStates(filters, now),
    };
  }

  const total = await permitRepository.countAll(filters);
  const sourceCounts = await permitSourceDocumentRepository.countActiveByPermits();
  const [rows, statusCounts, reviewCounts] = await Promise.all([
    permitRepository.findAll(filters, { limit: requestedLimit, offset }),
    permitRepository.countByStatus(filters),
    countReviewStates(filters, now),
  ]);

  return {
    items: rows.map((row) => toListItem(row, now, sourceCounts)),
    page: pageNumber,
    limit: requestedLimit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / requestedLimit),
    statusCounts,
    reviewCounts,
  };
}

// Review-state breakdown across the whole filtered set. Like statusCounts it
// deliberately ignores the reviewState filter itself, so the badges/cards do
// not collapse to a single value while that filter is applied.
async function countReviewStates(filters, now = new Date()) {
  const counts = { total: 0, CURRENT: 0, DUE_SOON: 0, REVIEW_DUE: 0, OUTDATED: 0, INCOMPLETE: 0 };
  const sourceCounts = await permitSourceDocumentRepository.countActiveByPermits();
  (await permitRepository.findAll(filters)).forEach((row) => {
    const state = toListItem(row, now, sourceCounts).health.reviewState;
    counts[state] += 1;
    counts.total += 1;
  });
  return counts;
}

// Dashboard-level health figures across every permit that is not archived —
// an archived record being stale is expected, so counting it would be noise.
async function getHealthSummary() {
  const now = new Date();
  const counts = { total: 0, CURRENT: 0, DUE_SOON: 0, REVIEW_DUE: 0, OUTDATED: 0, INCOMPLETE: 0 };
  let completenessTotal = 0;
  let recentlyUpdated = 0;
  let missingSource = 0;
  const recentCutoff = now.getTime() - 30 * 86_400_000;

  const sourceCounts = await permitSourceDocumentRepository.countActiveByPermits();
  const allRows = await permitRepository.findAll();
  allRows
    .filter((row) => row.status !== 'ARCHIVED')
    .forEach((row) => {
      const { health } = toListItem(row, now, sourceCounts);
      counts[health.reviewState] += 1;
      counts.total += 1;
      completenessTotal += health.completeness;
      const updated = new Date(row.updated_at).getTime();
      if (Number.isFinite(updated) && updated >= recentCutoff) recentlyUpdated += 1;
      if (!row.source_url && !sourceCounts[row.permit_id]) missingSource += 1;
    });

  return {
    ...counts,
    totalPermits: allRows.length,
    needsAttention: counts.DUE_SOON + counts.REVIEW_DUE + counts.OUTDATED + counts.INCOMPLETE,
    recentlyUpdated,
    missingSource,
    averageCompleteness: counts.total === 0 ? 0 : Math.round(completenessTotal / counts.total),
  };
}

const REMINDER_TYPES = [
  'REVIEW_OVERDUE',
  'DUE_SOON',
  'INCOMPLETE',
  'MISSING_SOURCE',
  'OUTDATED',
];

const REMINDER_PRIORITY = {
  OUTDATED: 0,
  REVIEW_OVERDUE: 1,
  DUE_SOON: 2,
  INCOMPLETE: 3,
  MISSING_SOURCE: 4,
};

// Derived in real time from the same health checks used by list/detail views.
// No reminder rows are stored, so resolving the underlying permit data also
// resolves its reminder automatically.
async function getReminders({ type } = {}, now = new Date()) {
  const filterType = type
    ? requireEnum(type, REMINDER_TYPES, 'Reminder type', undefined)
    : undefined;
  const sourceCounts = await permitSourceDocumentRepository.countActiveByPermits();
  const reminders = [];

  (await permitRepository.findAll())
    .filter((row) => row.status !== 'ARCHIVED')
    .forEach((row) => {
      const permit = { ...toApiShape(row), sourceDocumentCount: sourceCounts[row.permit_id] || 0 };
      const health = permitHealth.buildHealth(permit, countsFromRow(row), now);
      const base = {
        permitId: permit.id,
        permitTitle: permit.title,
        permitType: permit.permitType,
        countryCode: permit.countryCode,
        nextReviewAt: permit.nextReviewAt,
        completeness: health.completeness,
        reviewState: health.reviewState,
      };

      if (permit.informationStatus === 'OUTDATED') {
        reminders.push({ ...base, type: 'OUTDATED', severity: 'error', reason: 'This permit is marked as possibly outdated and requires Compliance review.' });
      }
      if (health.daysUntilReview !== null && health.daysUntilReview < 0) {
        const overdue = Math.abs(health.daysUntilReview);
        reminders.push({ ...base, type: 'REVIEW_OVERDUE', severity: 'error', daysUntilReview: health.daysUntilReview, reason: `Review overdue by ${overdue} day${overdue === 1 ? '' : 's'}.` });
      } else if (permit.informationStatus === 'REVIEW_DUE') {
        reminders.push({ ...base, type: 'REVIEW_OVERDUE', severity: 'error', daysUntilReview: health.daysUntilReview, reason: 'This permit is explicitly flagged for review.' });
      } else if (health.daysUntilReview !== null && health.daysUntilReview <= permitHealth.DUE_SOON_DAYS) {
        reminders.push({ ...base, type: 'DUE_SOON', severity: 'warning', daysUntilReview: health.daysUntilReview, reason: health.daysUntilReview === 0 ? 'Review is due today.' : `Review due in ${health.daysUntilReview} day${health.daysUntilReview === 1 ? '' : 's'}.` });
      }

      if (
        permit.informationStatus === 'INCOMPLETE' ||
        health.completeness < permitHealth.INCOMPLETE_THRESHOLD ||
        permitHealth.isMissingCoreProcess(health)
      ) {
        const missing = health.missing.slice(0, 3);
        reminders.push({ ...base, type: 'INCOMPLETE', severity: 'warning', missing, reason: missing.length ? `Incomplete information: ${missing.join(', ')}${health.missing.length > missing.length ? ', and more' : ''}.` : 'This permit is marked as incomplete.' });
      }
      const sourceCheck = health.checks.find((check) => check.key === 'source');
      if (sourceCheck && !sourceCheck.done) {
        reminders.push({ ...base, type: 'MISSING_SOURCE', severity: 'info', reason: 'No active official source URL or source document is attached.' });
      }
    });

  reminders.sort((a, b) => {
    const priority = REMINDER_PRIORITY[a.type] - REMINDER_PRIORITY[b.type];
    if (priority !== 0) return priority;
    if (a.daysUntilReview !== undefined && b.daysUntilReview !== undefined) {
      return a.daysUntilReview - b.daysUntilReview;
    }
    return a.permitTitle.localeCompare(b.permitTitle);
  });
  const counts = Object.fromEntries(REMINDER_TYPES.map((key) => [key, 0]));
  reminders.forEach((reminder) => { counts[reminder.type] += 1; });
  const items = filterType ? reminders.filter((reminder) => reminder.type === filterType) : reminders;
  return {
    items,
    total: items.length,
    allTotal: reminders.length,
    permitCount: new Set(reminders.map((reminder) => reminder.permitId)).size,
    counts,
    dueSoonDays: permitHealth.DUE_SOON_DAYS,
  };
}

// Existing permits that share this country + permit type (improvement plan
// Section 9.6). Advisory only — this never blocks a write, because two genuinely
// different permits can legitimately share a type name.
async function findDuplicates({ countryCode, permitType, excludeId } = {}) {
  if (!countryCode || !permitType) return [];
  const id = excludeId
    ? optionalNumber(excludeId, 'Permit id', { min: 1, max: 1_000_000_000, integer: true })
    : undefined;
  return (await permitRepository.findDuplicates(String(countryCode).trim(), String(permitType).trim(), id)).map(toApiShape);
}

// Returns the permit plus its process steps and required-document checklist,
// each grouped by process type (HLD §14.3: "Get one permit + steps + documents"),
// plus the full information-health block (completeness, review state, warnings).
// The list endpoint deliberately stays lean and does not include children.
async function getPermitById(id) {
  const permit = toApiShape(await permitRepository.findById(id));
  if (!permit) return null;

  const [steps, documents, sourceDocumentCount] = await Promise.all([
    permitStepService.listStepsGrouped(id),
    permitDocumentService.listDocumentsGrouped(id),
    permitSourceDocumentRepository.countActiveByPermit(id),
  ]);

  // An uploaded source document satisfies the health module's "official
  // source" check, so the count has to be known before health is computed.
  const withSources = {
    ...permit,
    sourceDocumentCount,
  };

  return {
    ...withSources,
    steps,
    documents,
    health: permitHealth.buildHealth(withSources, countsFromGroups(steps, documents)),
  };
}

async function createPermit(data) {
  const now = new Date().toISOString();
  const row = { ...toDbRow(data), created_at: now, updated_at: now };
  return toApiShape(await permitRepository.insert(row));
}

async function updatePermit(id, data) {
  const existing = await permitRepository.findById(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const row = { ...toDbRow(data), updated_at: now };
  // Un-archiving is an administrator action, handled by
  // POST /admin/archives/WORK_PERMIT/:id/restore. Without this guard any
  // authenticated caller could walk straight around that route by saving an
  // archived permit with an active status — and because a plain update never
  // touches previous_status/archived_at, the row was left claiming to be
  // archived while showing as live. Editing an archived permit is still
  // allowed; only moving it back out of ARCHIVED is refused. Note toDbRow
  // defaults an absent status to DRAFT, so this also catches a body that
  // simply omits the field.
  if (existing.status === 'ARCHIVED' && row.status !== 'ARCHIVED') {
    throw new ValidationError(
      'An archived work permit cannot be saved with an active status. An administrator must restore it from Archive Management first.'
    );
  }
  return toApiShape(await permitRepository.update(id, row));
}

async function archivePermit(id) {
  const existing = await permitRepository.findById(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  return toApiShape(await permitRepository.archive(id, now));
}

// Records a review against a permit: stamps the reviewed date, moves the next
// review date on by the configured cadence unless one is supplied, and clears
// any OUTDATED/REVIEW_DUE flag. Kept separate from updatePermit so recording a
// review never has to round-trip the whole permit body.
async function recordReview(id, { reviewedOn, nextReviewAt, reviewNotes, informationStatus } = {}) {
  const existing = await permitRepository.findById(id);
  if (!existing) return null;

  const reviewedDate = optionalDate(reviewedOn, 'Reviewed date') || new Date().toISOString().slice(0, 10);
  const next =
    optionalDate(nextReviewAt, 'Next review date') ||
    permitHealth.suggestNextReviewDate(reviewedDate);
  const now = new Date().toISOString();

  await permitRepository.update(id, {
    country_code: existing.country_code,
    permit_type: existing.permit_type,
    title: existing.title,
    permit_holder_name: existing.permit_holder_name,
    client_company_name: existing.client_company_name,
    description: existing.description,
    eligibility_criteria: existing.eligibility_criteria,
    processing_time_days: existing.processing_time_days,
    validity_months: existing.validity_months,
    government_fee: existing.government_fee,
    currency_code: existing.currency_code,
    worker_type: existing.worker_type,
    visibility: existing.visibility,
    source_url: existing.source_url,
    version: existing.version,
    status: existing.status,
    last_reviewed_at: reviewedDate,
    next_review_at: next,
    review_notes: optionalText(reviewNotes, 'Review notes', MAX.reviewNotes),
    information_status: requireEnum(
      informationStatus,
      VALID_INFORMATION_STATUSES,
      'Information status',
      'CURRENT'
    ),
    updated_at: now,
  });

  return getPermitById(id);
}

module.exports = {
  ValidationError,
  listPermits,
  getPermitById,
  getHealthSummary,
  getReminders,
  findDuplicates,
  recordReview,
  createPermit,
  updatePermit,
  archivePermit,
};
