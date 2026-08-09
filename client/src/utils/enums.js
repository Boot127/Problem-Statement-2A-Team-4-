// Shared enumerations (see HIGH_LEVEL_DESIGN.md Section 12)

export const WORKER_TYPES = ['LOCAL', 'FOREIGN_WORKER', 'EXPATRIATE', 'ALL_EMPLOYEES'];

export const WORKER_TYPE_LABELS = {
  LOCAL: 'Local',
  FOREIGN_WORKER: 'Foreign Worker',
  EXPATRIATE: 'Expatriate',
  ALL_EMPLOYEES: 'All Employees',
};

export const VISIBILITY_LEVELS = ['COMPLIANCE_ONLY', 'INTERNAL_STAFF', 'CLIENT_SHAREABLE'];

export const VISIBILITY_LABELS = {
  COMPLIANCE_ONLY: 'Compliance Only',
  INTERNAL_STAFF: 'Internal Staff',
  CLIENT_SHAREABLE: 'Client Shareable',
};

export const PERMIT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export const PERMIT_STATUS_LABELS = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

// Statuses a user may pick directly on the create/edit form.
// ARCHIVED is only reachable via the dedicated archive action.
export const EDITABLE_PERMIT_STATUSES = ['DRAFT', 'PUBLISHED'];

// Work-permit process variants (HLD FR-2.5): one permit holds up to three
// process flows rather than being duplicated as three permit records.
export const PROCESS_TYPES = ['NEW', 'RENEWAL', 'CANCELLATION'];

export const PROCESS_TYPE_LABELS = {
  NEW: 'New Application',
  RENEWAL: 'Renewal',
  CANCELLATION: 'Cancellation',
};

// --- Information health ---
//
// Two related but distinct ideas, deliberately kept apart:
//
// INFORMATION_STATUSES is what a compliance officer explicitly SETS on a
// record. REVIEW_STATES is what the server DERIVES from that flag plus the
// review dates plus the completeness score — it is read-only to the UI and is
// what the badges display.

export const INFORMATION_STATUSES = ['CURRENT', 'REVIEW_DUE', 'OUTDATED', 'INCOMPLETE'];

export const INFORMATION_STATUS_LABELS = {
  CURRENT: 'Current',
  REVIEW_DUE: 'Review Due',
  OUTDATED: 'Outdated',
  INCOMPLETE: 'Incomplete',
};

export const INFORMATION_STATUS_HELP = {
  CURRENT: 'The information has been checked and is believed to be accurate.',
  REVIEW_DUE: 'Flag this record for a compliance review.',
  OUTDATED: 'The rules have changed — do not rely on this record until it is updated.',
  INCOMPLETE: 'Known gaps remain in this record.',
};

export const REVIEW_STATES = ['CURRENT', 'DUE_SOON', 'REVIEW_DUE', 'OUTDATED', 'INCOMPLETE'];

export const REVIEW_STATE_LABELS = {
  CURRENT: 'Current',
  DUE_SOON: 'Due Soon',
  REVIEW_DUE: 'Review Due',
  OUTDATED: 'Outdated',
  INCOMPLETE: 'Incomplete',
};

export const REVIEW_STATE_COLORS = {
  CURRENT: 'success',
  DUE_SOON: 'info',
  REVIEW_DUE: 'warning',
  OUTDATED: 'error',
  INCOMPLETE: 'default',
};

// --- Uploaded source documents ---
// Mirrors the CHECK constraint on permit_source_documents.source_type.

export const SOURCE_TYPES = [
  'OFFICIAL_GUIDE',
  'LEGISLATION',
  'FORM',
  'CIRCULAR',
  'INTERNAL_NOTE',
  'OTHER',
];

export const SOURCE_TYPE_LABELS = {
  OFFICIAL_GUIDE: 'Official Government Guide',
  LEGISLATION: 'Legislation',
  FORM: 'Application Form',
  CIRCULAR: 'Circular or Notice',
  INTERNAL_NOTE: 'Internal Note',
  OTHER: 'Other',
};
