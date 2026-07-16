require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  // `true` reflects the request's Origin header (permissive, no-auth local
  // dev default); set CLIENT_ORIGIN to a specific origin to lock it down.
  clientOrigin: process.env.CLIENT_ORIGIN || true,
  // Optional override for where the SQLite file lives; defaults to
  // server/database/hrckmp.db (see config/sqliteDb.js).
  sqliteDbPath: process.env.SQLITE_DB_PATH || null,
};
