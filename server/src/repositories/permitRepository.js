// Dev 2 — parameterized SQL data access for work_permits (SQLite).

const db = require('../config/sqliteDb');

function findAll({ search, country, status } = {}) {
  let sql = 'SELECT * FROM work_permits WHERE 1 = 1';
  const params = [];

  if (country) {
    sql += ' AND country_code = ?';
    params.push(country);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (title LIKE ? OR permit_type LIKE ?)';
    const like = `%${search}%`;
    params.push(like, like);
  }
  sql += ' ORDER BY title ASC';

  return db.prepare(sql).all(...params);
}

function findById(id) {
  return db.prepare('SELECT * FROM work_permits WHERE permit_id = ?').get(id) || null;
}

function insert(row) {
  const stmt = db.prepare(`
    INSERT INTO work_permits (
      country_code, permit_type, title, description, eligibility_criteria,
      processing_time_days, validity_months, government_fee, currency_code,
      worker_type, visibility, source_url, version, status, created_at, updated_at
    ) VALUES (
      @country_code, @permit_type, @title, @description, @eligibility_criteria,
      @processing_time_days, @validity_months, @government_fee, @currency_code,
      @worker_type, @visibility, @source_url, @version, @status, @created_at, @updated_at
    )
  `);
  const info = stmt.run(row);
  return findById(info.lastInsertRowid);
}

function update(id, row) {
  const stmt = db.prepare(`
    UPDATE work_permits SET
      country_code = @country_code,
      permit_type = @permit_type,
      title = @title,
      description = @description,
      eligibility_criteria = @eligibility_criteria,
      processing_time_days = @processing_time_days,
      validity_months = @validity_months,
      government_fee = @government_fee,
      currency_code = @currency_code,
      worker_type = @worker_type,
      visibility = @visibility,
      source_url = @source_url,
      version = @version,
      status = @status,
      updated_at = @updated_at
    WHERE permit_id = @permit_id
  `);
  stmt.run({ ...row, permit_id: id });
  return findById(id);
}

function archive(id, updatedAt) {
  db.prepare('UPDATE work_permits SET status = ?, updated_at = ? WHERE permit_id = ?').run(
    'ARCHIVED',
    updatedAt,
    id
  );
  return findById(id);
}

module.exports = { findAll, findById, insert, update, archive };
