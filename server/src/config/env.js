require('dotenv').config({ quiet: true });

module.exports = {
  port: process.env.PORT || 5000,
  // `true` reflects the request's Origin header (permissive, no-auth local
  // dev default); set CLIENT_ORIGIN to a specific origin to lock it down.
  clientOrigin: process.env.CLIENT_ORIGIN || true,
  // Optional override for where the SQLite file lives; defaults to
  // server/database/hrckmp.db (see config/sqliteDb.js).
  sqliteDbPath: process.env.SQLITE_DB_PATH || null,
  // Dev 2 persistence provider. Keep `sqlite` available as a migration
  // rollback until the Neon import has been verified; production should set
  // this explicitly to `postgres`.
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
