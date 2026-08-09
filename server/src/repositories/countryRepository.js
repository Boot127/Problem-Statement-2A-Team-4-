const db = require('../config/database');

async function listAll() {
  return (await db.query('SELECT * FROM countries WHERE is_active = TRUE ORDER BY country_name')).rows;
}

async function findByCode(code) {
  return (await db.query('SELECT * FROM countries WHERE country_code = $1', [code])).rows[0] || null;
}

async function findById(id) {
  return (await db.query('SELECT * FROM countries WHERE country_id = $1', [id])).rows[0] || null;
}

module.exports = { listAll, findByCode, findById };
