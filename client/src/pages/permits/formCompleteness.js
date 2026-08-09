// Live completion indicator for the create/edit form (improvement plan 9.4).
//
// This mirrors the FIELD-level half of the server's completeness score
// (server/src/utils/permitHealth.js). It deliberately excludes the six
// process-step / document-checklist checks, because those records are managed
// on the detail page and are not editable from this form — showing a form that
// can never exceed 63% would be misleading.
//
// The server remains the single source of truth for the permit's real
// completeness; this is a "have I filled in this form" hint only.

const FIELDS = [
  { key: 'title', label: 'Title', required: true },
  { key: 'permitType', label: 'Permit type', required: true },
  { key: 'countryCode', label: 'Country', required: true },
  { key: 'description', label: 'Description' },
  { key: 'eligibilityCriteria', label: 'Eligibility criteria' },
  { key: 'processingTimeDays', label: 'Processing time' },
  { key: 'validityMonths', label: 'Validity period' },
  { key: 'governmentFee', label: 'Government fee' },
  { key: 'currencyCode', label: 'Currency code' },
  { key: 'sourceUrl', label: 'Source URL' },
];

function filled(value) {
  // 0 is a legitimate fee, so only null/undefined/blank count as empty.
  if (value === 0) return true;
  return value !== undefined && value !== null && String(value).trim() !== '';
}

export function formCompleteness(values = {}) {
  const done = FIELDS.filter((f) => filled(values[f.key]));
  return {
    score: Math.round((done.length / FIELDS.length) * 100),
    completed: done.length,
    total: FIELDS.length,
    missing: FIELDS.filter((f) => !filled(values[f.key])).map((f) => f.label),
  };
}

export const REQUIRED_FIELD_KEYS = FIELDS.filter((f) => f.required).map((f) => f.key);
