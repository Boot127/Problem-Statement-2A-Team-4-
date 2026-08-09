const db = require('../config/db');

function listAll() {
  return db.prepare('SELECT * FROM countries WHERE is_active = 1 ORDER BY country_name').all();
}

function findByCode(code) {
  return db.prepare('SELECT * FROM countries WHERE country_code = ?').get(code) || null;
}

function findById(id) {
  return db.prepare('SELECT * FROM countries WHERE country_id = ?').get(id) || null;
}

module.exports = { listAll, findByCode, findById };
