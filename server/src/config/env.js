const path = require('path');
require('dotenv').config({ quiet: true });

// HLD Section 11/17 specifies MySQL 8; this build targets SQLite for local
// dev instead (no MySQL server available). SQLITE_DB_PATH is shared between
// config/db.js (shared foundation: auth/records) and config/sqliteDb.js
// (Work Permits, Dev 2) — both connect to the same file. Schema is written
// to stay close to the MySQL DDL in docs/HIGH_LEVEL_DESIGN.md Section 12 so
// a future swap to mysql2 mainly touches config/db.js and the repositories,
// not the service/controller layers.
//
// Dev 2 is separately migrating Work Permits to Postgres/Neon for
// production (dbProvider/databaseUrl* below) while keeping SQLite as the
// local-dev/rollback path — see server/database/postgres/ and the
// db:migrate* scripts in package.json. The shared foundation and
// compliance_records stay on SQLite for now; migrating them to Postgres too
// is a follow-up, not done here.
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

  // Dev 2 (Work Permit Management) persistence provider. Keep `sqlite`
  // available as a migration rollback until the Neon import has been
  // verified; production should set this explicitly to `postgres`.
  dbProvider: (process.env.DB_PROVIDER || 'sqlite').trim().toLowerCase(),
  databaseUrl: process.env.DATABASE_URL || '',
  databaseUrlDirect: process.env.DATABASE_URL_DIRECT || '',
  enableDevSeed: String(process.env.ENABLE_DEV_SEED || 'false').toLowerCase() === 'true',
  // Optional Work Permit extraction provider. Mock mode requires no key and
  // remains the default so normal source upload never depends on an AI API.
  permitAiProvider: process.env.PERMIT_AI_PROVIDER || 'mock',
  permitAiEndpoint: process.env.PERMIT_AI_ENDPOINT || '',
  permitAiApiKey: process.env.PERMIT_AI_API_KEY || '',
  permitAiModel: process.env.PERMIT_AI_MODEL || '',
};
