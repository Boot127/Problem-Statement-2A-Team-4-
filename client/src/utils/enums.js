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

export const REVIEW_STATUSES = [
  'PENDING',
  'IN_REVIEW',
  'APPROVED',
  'CHANGES_REQUESTED',
  'REJECTED',
  'ARCHIVED',
];

export const REVIEW_STATUS_LABELS = {
  PENDING: 'Pending',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  CHANGES_REQUESTED: 'Changes Requested',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
};

// Statuses a user may pick directly on the create/edit form.
// ARCHIVED is only reachable via the dedicated archive action.
export const EDITABLE_REVIEW_STATUSES = [
  'PENDING',
  'IN_REVIEW',
  'APPROVED',
  'CHANGES_REQUESTED',
  'REJECTED',
];

export const TARGET_TYPES = ['compliance_record', 'work_permit'];

export const TARGET_TYPE_LABELS = {
  compliance_record: 'Compliance Record',
  work_permit: 'Work Permit',
};
