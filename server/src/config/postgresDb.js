const { AsyncLocalStorage } = require('async_hooks');
const { Pool, types } = require('pg');
const env = require('./env');

if (!env.databaseUrl) {
  throw new Error('DATABASE_URL is required when DB_PROVIDER=postgres');
}

// pg returns BIGINT (OID 20) columns as strings by default, to avoid silent
// precision loss past Number.MAX_SAFE_INTEGER. Every identity PK/FK in this
// schema is BIGINT (matching the SQLite INTEGER PRIMARY KEY columns they
// mirror), well within safe-integer range for an app this size — without
// this override, `row.record_id` would be "5" here but 5 under SQLite,
// silently breaking every `===` comparison against a route-param id
// (Number(req.params.id)) or a value looked up from another row.
types.setTypeParser(20, (value) => (value === null ? null : parseInt(value, 10)));

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true,
});

const transactionStorage = new AsyncLocalStorage();

function sanitise(error) {
  if (!error) return error;
  [env.databaseUrl, env.databaseUrlDirect].filter(Boolean).forEach((secret) => {
    error.message = String(error.message || 'Database request failed').split(secret).join('[database URL redacted]');
  });
  return error;
}

async function query(text, params = []) {
  try {
    const client = transactionStorage.getStore();
    return await (client || pool).query(text, params);
  } catch (error) {
    throw sanitise(error);
  }
}

async function transaction(work) {
  if (transactionStorage.getStore()) return work();
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await transactionStorage.run(client, work);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    throw sanitise(error);
  } finally {
    if (client) client.release();
  }
}

async function healthCheck() {
  try {
    await pool.query('SELECT 1');
  } catch (error) {
    throw sanitise(error);
  }
  return { provider: 'postgres', connected: true };
}

module.exports = { query, transaction, healthCheck, close: () => pool.end(), pool };
