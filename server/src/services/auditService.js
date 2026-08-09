// Shared — write insert-only audit_logs entries on create/update/archive/publish (Section 11).

const auditRepository = require('../repositories/auditRepository');

// Fire-and-forget by design (not awaited by any caller) — matches the
// pattern already established for admin-archive actions in
// adminArchiveService.js. Audit writes are insert-only and never block the
// action they're logging.
function log({ userId, action, entityType, entityId, oldValue, newValue }) {
  auditRepository.insert({ userId, action, entityType, entityId, oldValue, newValue });
}

async function list({ role, userId, page, limit }) {
  // Role/Permission Summary (Section 4.5): Compliance sees only their own
  // actions; Admin sees the full trail. Route/controller already rejects
  // any other role before this is called.
  const scopedUserId = role === 'admin' ? undefined : userId;
  return auditRepository.list({ userId: scopedUserId, page, limit });
}

module.exports = { log, list };
