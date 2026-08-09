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

// User roles (Section 4). The server (server/src/utils/visibilityRules.js
// and rbac.js) is always the source of truth for what a role may do; these
// exist purely to drive UI labels and show/hide controls.
export const ROLES = ['compliance', 'sales', 'customer_service', 'admin'];

export const ROLE_LABELS = {
  compliance: 'Compliance',
  sales: 'Sales',
  customer_service: 'Customer Service',
  admin: 'Administrator',
};

// ============================================================
// Developer 1 — Compliance Content Management
// ============================================================

// compliance_records.category (see HIGH_LEVEL_DESIGN.md Section 12)
export const RECORD_CATEGORIES = [
  'LABOUR_LAW',
  'SOCIAL_INSURANCE',
  'WICA',
  'TERMINATION',
  'ANNUAL_LEAVE',
  'SICK_LEAVE',
  'MATERNITY_PATERNITY',
  'WORKING_HOURS',
  'STATUTORY_BENEFIT',
  'GENERAL_GUIDELINE',
  'OTHER',
];

export const RECORD_CATEGORY_LABELS = {
  LABOUR_LAW: 'Labour Law',
  SOCIAL_INSURANCE: 'Social Insurance',
  WICA: 'Work Injury Compensation',
  TERMINATION: 'Termination',
  ANNUAL_LEAVE: 'Annual Leave',
  SICK_LEAVE: 'Sick Leave',
  MATERNITY_PATERNITY: 'Maternity / Paternity',
  WORKING_HOURS: 'Working Hours',
  STATUTORY_BENEFIT: 'Statutory Benefit',
  GENERAL_GUIDELINE: 'General Guideline',
  OTHER: 'Other',
};

// compliance_records.status — same three states as permits (DRAFT/PUBLISHED/ARCHIVED).
// Only DRAFT and ARCHIVED are reachable from this feature's API: PUBLISHED is
// exclusively set by the review-and-approve workflow (Section 12.2, FR-3.5).
export const CONTENT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export const CONTENT_STATUS_LABELS = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

// Source document attachment constraints (mirrors server/src/middleware/upload.js)
export const ACCEPTED_ATTACHMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];

export const ACCEPTED_ATTACHMENT_LABEL = 'PDF, DOCX, XLSX, JPG, PNG';

export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

// AI writing assistant modes (Section 16.1)
export const AI_ASSIST_MODES = ['grammar', 'rewrite', 'summarise', 'translate'];

export const AI_ASSIST_MODE_LABELS = {
  grammar: 'Fix Grammar',
  rewrite: 'Rewrite Professionally',
  summarise: 'Summarise',
  translate: 'Translate to English',
};

// ============================================================
// Developer 2 — Work Permit Management
// ============================================================

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
