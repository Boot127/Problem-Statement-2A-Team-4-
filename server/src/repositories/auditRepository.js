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

const DISPLAY_ACTION_SQL = `CASE
  WHEN a.entity_type = 'user_role' THEN 'USER_ROLE_CHANGED'
  WHEN a.admin_action IS NOT NULL THEN a.admin_action
  ELSE UPPER(a.action)
END`;

async function adminList({ search, userId, entityType, action, dateFrom, dateTo, page = 1, limit = 15 } = {}) {
  const clauses = [];
  const params = [];
  const add = (expression, value) => { params.push(value); clauses.push(`${expression} $${params.length}`); };
  if (userId) add('a.user_id =', userId);
  if (entityType) add('a.entity_type =', entityType);
  if (action) add(`${DISPLAY_ACTION_SQL} =`, action);
  if (dateFrom) add('DATE(a.created_at) >=', dateFrom);
  if (dateTo) add('DATE(a.created_at) <=', dateTo);
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    const placeholder = `$${params.length}`;
    clauses.push(`LOWER(COALESCE(actor.full_name, '') || ' ' || COALESCE(actor.email, '') || ' ' ||
      COALESCE(target_user.email, compliance.title, permit.title, review.title, newsletter.title, '') || ' ' ||
      a.entity_type || ' ' || ${DISPLAY_ACTION_SQL}) LIKE ${placeholder}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const safeLimit = Math.min(Math.max(Number(limit) || 15, 1), 50);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;
  const joins = `
    LEFT JOIN users actor ON actor.user_id = a.user_id
    LEFT JOIN users target_user ON a.entity_type IN ('user','user_role') AND target_user.user_id = a.entity_id
    LEFT JOIN compliance_records compliance ON a.entity_type = 'compliance_record' AND compliance.record_id = a.entity_id
    LEFT JOIN work_permits permit ON a.entity_type = 'work_permit' AND permit.permit_id = a.entity_id
    LEFT JOIN review_requests review ON a.entity_type = 'review_request' AND review.request_id = a.entity_id
    LEFT JOIN newsletters newsletter ON a.entity_type = 'newsletter' AND newsletter.id = a.entity_id`;
  const total = Number((await db.query(`SELECT COUNT(*) AS count FROM audit_logs a ${joins} ${where}`, params)).rows[0].count);
  const rows = (await db.query(
    `SELECT a.*, actor.full_name AS actor_name, actor.email AS actor_email,
            target_user.email AS target_user_email,
            COALESCE(target_user.email, compliance.title, permit.title, review.title, newsletter.title) AS target_title,
            ${DISPLAY_ACTION_SQL} AS display_action
     FROM audit_logs a ${joins} ${where}
     ORDER BY a.log_id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, safeLimit, offset]
  )).rows;
  return { rows, page: safePage, limit: safeLimit, total };
}

async function activityFilterOptions() {
  const [entities, actions] = await Promise.all([
    db.query('SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type'),
    db.query(`SELECT DISTINCT ${DISPLAY_ACTION_SQL} AS display_action FROM audit_logs a ORDER BY display_action`),
  ]);
  return {
    entityTypes: entities.rows.map((row) => row.entity_type),
    actions: actions.rows.map((row) => row.display_action),
  };
}

module.exports = { insert, list, adminList, activityFilterOptions };
