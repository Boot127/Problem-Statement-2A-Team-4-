const db = require('../config/reviewSqliteDb');

function findAll({ search, targetType, status } = {}) {
  let sql = 'SELECT * FROM review_requests WHERE 1 = 1';
  const params = [];
  if (targetType) { sql += ' AND target_type = ?'; params.push(targetType); }
  if (status) { sql += ' AND review_status = ?'; params.push(status); }
  if (search) { sql += ' AND (title LIKE ? OR COALESCE(description, \'\') LIKE ?)'; const q = `%${search}%`; params.push(q, q); }
  return db.prepare(`${sql} ORDER BY created_at DESC`).all(...params);
}

function findById(id) { return db.prepare('SELECT * FROM review_requests WHERE request_id = ?').get(id) || null; }
function findTarget(type, id) {
  if (type === 'work_permit') return db.prepare('SELECT * FROM work_permits WHERE permit_id = ?').get(id) || null;
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='compliance_records'").get();
  if (!table) return null;
  return db.prepare('SELECT * FROM compliance_records WHERE record_id = ?').get(id) || null;
}
function listTargets(type) {
  if (type === 'work_permit') return db.prepare("SELECT permit_id AS id, title, status FROM work_permits WHERE status != 'ARCHIVED' ORDER BY title").all();
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='compliance_records'").get();
  if (!table) return [];
  return db.prepare("SELECT record_id AS id, title, status FROM compliance_records WHERE status != 'ARCHIVED' ORDER BY title").all();
}
function insert(row) {
  const info = db.prepare(`INSERT INTO review_requests
    (target_type,target_id,title,description,review_status,submitted_by,submitted_at,created_at,updated_at)
    VALUES (@target_type,@target_id,@title,@description,@review_status,@submitted_by,@submitted_at,@created_at,@updated_at)`).run(row);
  return findById(info.lastInsertRowid);
}
function update(id, row) {
  db.prepare(`UPDATE review_requests SET title=@title, description=@description, updated_at=@updated_at WHERE request_id=@request_id`)
    .run({ ...row, request_id: id });
  return findById(id);
}
function transition(id, status, actor, now) {
  db.prepare(`UPDATE review_requests SET review_status=?, reviewed_by=?, reviewed_at=?, updated_at=? WHERE request_id=?`)
    .run(status, actor, ['APPROVED','REJECTED','CHANGES_REQUESTED'].includes(status) ? now : null, now, id);
  return findById(id);
}
function addComment(id, author, comment, now) {
  const info = db.prepare('INSERT INTO review_comments (request_id,author_name,comment,created_at) VALUES (?,?,?,?)').run(id, author, comment, now);
  return db.prepare('SELECT * FROM review_comments WHERE comment_id=?').get(info.lastInsertRowid);
}
function comments(id) { return db.prepare('SELECT * FROM review_comments WHERE request_id=? ORDER BY created_at ASC').all(id); }
function notify(id, message, now) { db.prepare('INSERT INTO notifications (request_id,message,created_at) VALUES (?,?,?)').run(id, message, now); }
function notifications() { return db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100').all(); }
function versions(type, id) { return db.prepare('SELECT * FROM record_versions WHERE target_type=? AND target_id=? ORDER BY version DESC').all(type,id); }

function publish(review, now) {
  return db.transaction(() => {
    const target = findTarget(review.target_type, review.target_id);
    if (!target) return null;
    const previous = db.prepare('SELECT MAX(version) AS version FROM record_versions WHERE target_type=? AND target_id=?').get(review.target_type, review.target_id);
    const version = (previous.version || 0) + 1;
    db.prepare('INSERT INTO record_versions (target_type,target_id,version,snapshot,published_at,review_id) VALUES (?,?,?,?,?,?)')
      .run(review.target_type, review.target_id, version, JSON.stringify(target), now, review.request_id);
    if (review.target_type === 'work_permit') {
      db.prepare("UPDATE work_permits SET status='PUBLISHED', version=?, updated_at=? WHERE permit_id=?").run(version, now, review.target_id);
    } else {
      db.prepare("UPDATE compliance_records SET status='PUBLISHED', version=?, updated_at=? WHERE record_id=?").run(version, now, review.target_id);
    }
    db.prepare('UPDATE review_requests SET published_at=?, updated_at=? WHERE request_id=?').run(now, now, review.request_id);
    return { version, snapshot: target };
  })();
}

module.exports = { findAll, findById, findTarget, listTargets, insert, update, transition, addComment, comments, notify, notifications, versions, publish };
