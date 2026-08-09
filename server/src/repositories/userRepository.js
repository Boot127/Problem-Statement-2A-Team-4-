const db = require('../config/db');

function findByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) || null;
}

function findById(id) {
  return db.prepare('SELECT * FROM users WHERE user_id = ?').get(id) || null;
}

function create({ fullName, email, passwordHash, role }) {
  const info = db
    .prepare('INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(fullName, email, passwordHash, role);
  return findById(info.lastInsertRowid);
}

function incrementFailedAttempts(id) {
  db.prepare('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE user_id = ?').run(id);
}

function recordSuccessfulLogin(id) {
  db.prepare(
    "UPDATE users SET failed_attempts = 0, last_login_at = CURRENT_TIMESTAMP WHERE user_id = ?"
  ).run(id);
}

module.exports = { findByEmail, findById, create, incrementFailedAttempts, recordSuccessfulLogin };
