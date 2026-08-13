const db = require('../config/database');

async function findByEmail(email) {
  return (await db.query('SELECT * FROM users WHERE email = $1', [email])).rows[0] || null;
}

async function findById(id) {
  return (await db.query('SELECT * FROM users WHERE user_id = $1', [id])).rows[0] || null;
}

async function findAll() {
  return (await db.query(
    `SELECT user_id, full_name, email, role, is_active, failed_attempts,
            last_login_at, created_at, updated_at
     FROM users
     ORDER BY user_id`
  )).rows;
}

async function countActiveAdministrators() {
  const result = await db.query(
    "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = TRUE"
  );
  return Number(result.rows[0].count);
}

async function updateRole(id, role) {
  const result = await db.query(
    `UPDATE users SET role = $1, updated_at = $2
     WHERE user_id = $3 RETURNING *`,
    [role, new Date().toISOString(), id]
  );
  return result.rows[0] || null;
}

function transaction(work) {
  return db.transaction(work);
}

async function create({ fullName, email, passwordHash, role }) {
  const result = await db.query(
    'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
    [fullName, email, passwordHash, role]
  );
  return result.rows[0];
}

async function incrementFailedAttempts(id) {
  await db.query('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE user_id = $1', [id]);
}

// Timestamp is computed in JS and bound as a parameter (not SQL-side NOW()/
// CURRENT_TIMESTAMP) because the same query text runs unchanged against
// both SQLite and Postgres — matching the pattern already used by
// permitRepository.js and reviewRepository.js.
async function recordSuccessfulLogin(id) {
  await db.query(
    'UPDATE users SET failed_attempts = 0, last_login_at = $1 WHERE user_id = $2',
    [new Date().toISOString(), id]
  );
}

module.exports = {
  findByEmail,
  findById,
  findAll,
  countActiveAdministrators,
  updateRole,
  transaction,
  create,
  incrementFailedAttempts,
  recordSuccessfulLogin,
};
