const db = require('../config/db');

function insert({ userId, action, entityType, entityId, oldValue, newValue }) {
  db.prepare(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    userId ?? null,
    action,
    entityType,
    entityId ?? null,
    oldValue ? JSON.stringify(oldValue) : null,
    newValue ? JSON.stringify(newValue) : null
  );
}

function serialize(row) {
  return {
    id: row.log_id,
    userId: row.user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    oldValue: row.old_value ? JSON.parse(row.old_value) : null,
    newValue: row.new_value ? JSON.parse(row.new_value) : null,
    createdAt: row.created_at,
  };
}

function list({ userId, page = 1, limit = 20 } = {}) {
  const clauses = [];
  const params = [];
  if (userId) {
    clauses.push('user_id = ?');
    params.push(userId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  const total = db.prepare(`SELECT COUNT(*) AS count FROM audit_logs ${where}`).get(...params).count;
  const rows = db
    .prepare(`SELECT * FROM audit_logs ${where} ORDER BY log_id DESC LIMIT ? OFFSET ?`)
    .all(...params, safeLimit, offset);

  return {
    data: rows.map(serialize),
    pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
  };
}

module.exports = { insert, list };
