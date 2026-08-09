const path = require('path');
require('dotenv').config({ quiet: true });

// HLD Section 11/17 specifies MySQL 8; this build targets SQLite for local
// dev instead (no MySQL server available). SQLITE_DB_PATH is where
// config/sqliteDb.js opens its connection — every repository in the app
// (auth, Compliance Content, Work Permits, Reviews, Newsletters) reaches it
// through config/database.js.
//
// The whole team's backend migrates to Postgres/Neon for production this
// way — every repository is written against config/database.js, which picks
// Postgres or SQLite based on dbProvider below, so switching providers
// never touches the service/controller layers. See
// server/database/postgres/ and the db:migrate* scripts in package.json.
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

  // App-wide persistence provider (config/database.js). Keep `sqlite`
  // available as a rollback until a Neon import has been verified;
  // production should set this explicitly to `postgres`.
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
