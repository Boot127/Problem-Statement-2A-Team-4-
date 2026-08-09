const db = require('../config/database');

async function findAll({ search, targetType, status } = {}) {
  const clauses = [];
  const params = [];
  const bind = (value) => {
    params.push(value);
    return `$${params.length}`;
  };
  if (targetType) clauses.push(`target_type = ${bind(targetType)}`);
  if (status) clauses.push(`review_status = ${bind(status)}`);
  if (search) {
    const like = bind(`%${search}%`);
    clauses.push(`(title LIKE ${like} OR COALESCE(description, '') LIKE ${like})`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return (await db.query(`SELECT * FROM review_requests ${where} ORDER BY created_at DESC`, params)).rows;
}

async function findById(id) {
  return (await db.query('SELECT * FROM review_requests WHERE request_id = $1', [id])).rows[0] || null;
}

async function findTarget(type, id) {
  if (type === 'work_permit') {
    return (await db.query('SELECT * FROM work_permits WHERE permit_id = $1', [id])).rows[0] || null;
  }
  return (await db.query('SELECT * FROM compliance_records WHERE record_id = $1', [id])).rows[0] || null;
}

async function listTargets(type) {
  if (type === 'work_permit') {
    return (
      await db.query("SELECT permit_id AS id, title, status FROM work_permits WHERE status != 'ARCHIVED' ORDER BY title")
    ).rows;
  }
  return (
    await db.query(
      "SELECT record_id AS id, title, status FROM compliance_records WHERE status != 'ARCHIVED' ORDER BY title"
    )
  ).rows;
}

async function insert(row) {
  const result = await db.query(
    `INSERT INTO review_requests
      (target_type,target_id,title,description,review_status,submitted_by,submitted_at,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      row.target_type,
      row.target_id,
      row.title,
      row.description,
      row.review_status,
      row.submitted_by,
      row.submitted_at,
      row.created_at,
      row.updated_at,
    ]
  );
  return result.rows[0];
}

async function update(id, row) {
  await db.query(
    'UPDATE review_requests SET title=$1, description=$2, updated_at=$3 WHERE request_id=$4',
    [row.title, row.description, row.updated_at, id]
  );
  return findById(id);
}

async function transition(id, status, actor, now) {
  if (status === 'ARCHIVED') {
    await db.query(
      `UPDATE review_requests SET
        previous_status=CASE WHEN review_status!='ARCHIVED' THEN review_status ELSE previous_status END,
        review_status='ARCHIVED', archived_at=$1, reviewed_by=$2, updated_at=$3
       WHERE request_id=$4`,
      [now, actor, now, id]
    );
  } else {
    await db.query(
      'UPDATE review_requests SET review_status=$1, reviewed_by=$2, reviewed_at=$3, updated_at=$4 WHERE request_id=$5',
      [status, actor, ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'].includes(status) ? now : null, now, id]
    );
  }
  return findById(id);
}

async function addComment(id, author, comment, now) {
  const result = await db.query(
    'INSERT INTO review_comments (request_id,author_name,comment,created_at) VALUES ($1,$2,$3,$4) RETURNING *',
    [id, author, comment, now]
  );
  return result.rows[0];
}

async function comments(id) {
  return (await db.query('SELECT * FROM review_comments WHERE request_id=$1 ORDER BY created_at ASC', [id])).rows;
}

async function notify(id, message, now) {
  await db.query('INSERT INTO notifications (request_id,message,created_at) VALUES ($1,$2,$3)', [id, message, now]);
}

async function notifications() {
  return (await db.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100')).rows;
}

async function findNotification(id) {
  return (await db.query('SELECT * FROM notifications WHERE notification_id=$1', [id])).rows[0] || null;
}

async function markNotificationRead(id) {
  await db.query('UPDATE notifications SET is_read=$1 WHERE notification_id=$2', [true, id]);
  return findNotification(id);
}

async function markAllNotificationsRead() {
  await db.query('UPDATE notifications SET is_read=$1 WHERE is_read=$2', [true, false]);
  return notifications();
}

async function versions(type, id) {
  return (
    await db.query('SELECT * FROM record_versions WHERE target_type=$1 AND target_id=$2 ORDER BY version DESC', [type, id])
  ).rows;
}

async function publish(review, now) {
  return db.transaction(async () => {
    const target = await findTarget(review.target_type, review.target_id);
    if (!target) return null;
    const previous = (
      await db.query(
        'SELECT MAX(version) AS version FROM record_versions WHERE target_type=$1 AND target_id=$2',
        [review.target_type, review.target_id]
      )
    ).rows[0];
    const version = Math.max(Number(previous.version) || 0, Number(target.version) || 0) + 1;
    await db.query(
      'INSERT INTO record_versions (target_type,target_id,version,snapshot,published_at,review_id) VALUES ($1,$2,$3,$4,$5,$6)',
      [review.target_type, review.target_id, version, JSON.stringify(target), now, review.request_id]
    );
    if (review.target_type === 'work_permit') {
      await db.query("UPDATE work_permits SET status='PUBLISHED', version=$1, updated_at=$2 WHERE permit_id=$3", [
        version,
        now,
        review.target_id,
      ]);
    } else {
      await db.query("UPDATE compliance_records SET status='PUBLISHED', version=$1, updated_at=$2 WHERE record_id=$3", [
        version,
        now,
        review.target_id,
      ]);
    }
    await db.query('UPDATE review_requests SET published_at=$1, updated_at=$2 WHERE request_id=$3', [now, now, review.request_id]);
    return { version, snapshot: target };
  });
}

module.exports = {
  findAll,
  findById,
  findTarget,
  listTargets,
  insert,
  update,
  transition,
  addComment,
  comments,
  notify,
  notifications,
  findNotification,
  markNotificationRead,
  markAllNotificationsRead,
  versions,
  publish,
};
