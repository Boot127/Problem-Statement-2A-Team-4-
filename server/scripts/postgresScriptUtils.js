require('dotenv').config({ quiet: true });

const { Pool } = require('pg');

function directDatabaseUrl() {
  const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL_DIRECT (or DATABASE_URL) is required');
  return url;
}

function createDirectPool() {
  return new Pool({
    connectionString: directDatabaseUrl(),
    max: 1,
    connectionTimeoutMillis: 15000,
    allowExitOnIdle: true,
  });
}

function safeMessage(error) {
  let message = error?.message || String(error);
  [process.env.DATABASE_URL, process.env.DATABASE_URL_DIRECT]
    .filter(Boolean)
    .forEach((secret) => {
      message = message.split(secret).join('[database URL redacted]');
    });
  return message;
}

module.exports = { createDirectPool, safeMessage };
