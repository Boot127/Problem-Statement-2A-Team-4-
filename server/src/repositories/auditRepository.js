const db = require('../config/database');

async function insert({ userId, action, entityType, entityId, oldValue, newValue }) {
  const isAdminArchiveAction = ['RESTORE_ARCHIVED', 'PERMANENT_DELETE'].includes(action);
  const storedAction = isAdminArchiveAction
    ? (action === 'RESTORE_ARCHIVED' ? 'update' : 'archive')
    : action;
  await db.query(
    `INSERT INTO audit_logs (user_id, action, admin_action, entity_type, entity_id, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId ?? null,
      storedAction,
      isAdminArchiveAction ? action : null,
      entityType,
      entityId ?? null,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
    ]
  );
}

function serialize(row) {
  return {
    id: row.log_id,
    userId: row.user_id,
    action: row.admin_action || row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    oldValue: row.old_value ? JSON.parse(row.old_value) : null,
    newValue: row.new_value ? JSON.parse(row.new_value) : null,
    createdAt: row.created_at,
  };
}

async function list({ userId, page = 1, limit = 20 } = {}) {
  const clauses = [];
  const params = [];
  if (userId) {
    params.push(userId);
    clauses.push(`user_id = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const total = Number(
    (await db.query(`SELECT COUNT(*) AS count FROM audit_logs ${where}`, params)).rows[0].count
  );
  const rows = (
    await db.query(
      `SELECT * FROM audit_logs ${where} ORDER BY log_id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, safeLimit, offset]
    )
  ).rows;

  return {
    data: rows.map(serialize),
    pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
  };
}

module.exports = { insert, list };
