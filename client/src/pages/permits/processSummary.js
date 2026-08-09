// Derived summaries for one process type's steps and documents.
// Pure functions, kept out of the component so they can be reasoned about
// (and tested) on their own.

const UNIT_DAYS = {
  day: 1,
  days: 1,
  week: 7,
  weeks: 7,
  month: 30,
  months: 30,
};

// Matches the shapes staff actually type into "Expected timeline":
//   "5 days", "2-3 business days", "1–2 weeks", "about 3 working days", "1 month"
// Takes the UPPER bound of a range so the estimate is never optimistic.
const TIMELINE_PATTERN =
  /(\d+)\s*(?:\s*(?:-|–|—|to)\s*(\d+))?\s*(?:business\s+|working\s+|calendar\s+)?(days?|weeks?|months?)/i;

// Best-effort total of a process's expected timelines.
// `expectedTimeline` is free text by design (the HLD types it VARCHAR), so this
// reports how many entries it could actually read rather than pretending the
// total is exact.
export function estimateTimelineDays(steps = []) {
  let totalDays = 0;
  let parsed = 0;
  let withTimeline = 0;

  steps.forEach((step) => {
    const text = (step.expectedTimeline || '').trim();
    if (!text) return;
    withTimeline += 1;

    const match = TIMELINE_PATTERN.exec(text);
    if (!match) return;

    const [, low, high, unit] = match;
    const value = Number(high ?? low);
    const multiplier = UNIT_DAYS[unit.toLowerCase()];
    if (!Number.isFinite(value) || !multiplier) return;

    totalDays += value * multiplier;
    parsed += 1;
  });

  return { totalDays, parsed, withTimeline, exact: parsed > 0 && parsed === withTimeline };
}

// Everything the process summary strip needs, in one pass.
export function summariseProcess(steps = [], documents = []) {
  const mandatory = documents.filter((d) => d.isMandatory).length;
  const timeline = estimateTimelineDays(steps);

  return {
    stepCount: steps.length,
    documentCount: documents.length,
    mandatoryCount: mandatory,
    optionalCount: documents.length - mandatory,
    timeline,
    // "Complete" is deliberately shallow — a process is only claimed complete
    // when it has both an ordered flow and a checklist, which is the pair the
    // client actually needs to act on a permit.
    isComplete: steps.length > 0 && documents.length > 0,
    isEmpty: steps.length === 0 && documents.length === 0,
  };
}

// Human-readable timeline for the summary strip.
export function formatTimelineEstimate(timeline) {
  if (!timeline || timeline.parsed === 0) return null;
  const label = timeline.totalDays === 1 ? '1 day' : `${timeline.totalDays} days`;
  return timeline.exact ? `≈ ${label}` : `≈ ${label}+`;
}
