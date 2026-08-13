export const ACTION_LABELS = {
  LOGIN: 'Signed in', LOGOUT: 'Signed out', CREATE: 'Created', UPDATE: 'Updated',
  ARCHIVE: 'Archived', PUBLISH: 'Published', USER_ROLE_CHANGED: 'Changed user role',
  RESTORE_ARCHIVED: 'Restored archived item', PERMANENT_DELETE: 'Permanently deleted archived item',
};

export const ENTITY_LABELS = {
  user: 'Authentication', user_role: 'User Management', compliance_record: 'Compliance Content',
  work_permit: 'Work Permits', review_request: 'Reviews', newsletter: 'Legal Updates',
  COMPLIANCE_CONTENT: 'Archive Management', WORK_PERMIT: 'Archive Management', REVIEW: 'Archive Management',
};

export function actionLabel(value) { return ACTION_LABELS[value] || String(value || '').replaceAll('_', ' '); }
export function entityLabel(value) { return ENTITY_LABELS[value] || String(value || '').replaceAll('_', ' '); }
export function activityTitle(item) { return `${actionLabel(item.action)} — ${item.targetTitle}`; }
export function dateTime(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Date unavailable' : parsed.toLocaleString();
}
