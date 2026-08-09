const path = require('path');
require('dotenv').config();

// HLD Section 11/17 specifies MySQL 8; this build targets SQLite for local
// dev instead (no MySQL server available). SQLITE_DB_PATH is shared between
// config/db.js (shared foundation: auth/records) and config/sqliteDb.js
// (Work Permits, Dev 2) — both connect to the same file. Schema is written
// to stay close to the MySQL DDL in docs/HIGH_LEVEL_DESIGN.md Section 12 so
// a future swap to mysql2 mainly touches config/db.js and the repositories,
// not the service/controller layers.
module.exports = {
  port: Number(process.env.PORT) || 5000,
  // `true` reflects the request's Origin header (permissive, no-auth local
  // dev default); set CLIENT_ORIGIN to a specific origin to lock it down.
  clientOrigin: process.env.CLIENT_ORIGIN || true,
  sqliteDbPath: process.env.SQLITE_DB_PATH || path.join(__dirname, '..', '..', 'database', 'hrckmp.db'),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  aiApiKey: process.env.AI_API_KEY || '',
  maxFailedAttempts: 5,
};
