// Provider-agnostic query layer used by every repository in the app —
// SQLite locally (backed by config/sqliteDb.js's connection), Postgres/Neon
// in production (config/postgresDb.js) — selected by DB_PROVIDER. Repos
// write Postgres-style SQL ($1, $2, ... placeholders); the SQLite branch
// below translates those to SQLite's `?` placeholders so the same query
// text runs unchanged on both providers.
const env = require('./env');

if (!['sqlite', 'postgres'].includes(env.dbProvider)) {
  throw new Error('DB_PROVIDER must be either postgres or sqlite');
}

if (env.dbProvider === 'postgres') {
  module.exports = { ...require('./postgresDb'), provider: 'postgres' };
} else {
  const { AsyncLocalStorage } = require('async_hooks');
  const sqlite = require('./sqliteDb');
  const transactionStorage = new AsyncLocalStorage();

  function compile(text, params) {
    const values = [];
    const sql = text.replace(/\$(\d+)/g, (_match, index) => {
      const value = params[Number(index) - 1];
      values.push(typeof value === 'boolean' ? Number(value) : value);
      return '?';
    });
    return { sql, values };
  }

  async function query(text, params = []) {
    const { sql, values } = compile(text, params);
    const statement = sqlite.prepare(sql);
    const returnsRows = /^\s*(SELECT|WITH)\b/i.test(sql) || /\bRETURNING\b/i.test(sql);
    if (returnsRows) {
      const rows = statement.all(...values);
      return { rows, rowCount: rows.length };
    }
    const result = statement.run(...values);
    return { rows: [], rowCount: result.changes };
  }

  let transactionQueue = Promise.resolve();
  function transaction(work) {
    if (transactionStorage.getStore()) return work();
    const run = async () => {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const result = await transactionStorage.run(true, work);
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    };
    const pending = transactionQueue.then(run, run);
    transactionQueue = pending.catch(() => {});
    return pending;
  }

  async function healthCheck() {
    await query('SELECT 1');
    return { provider: 'sqlite', connected: true };
  }

  module.exports = {
    provider: 'sqlite',
    query,
    transaction,
    healthCheck,
    close: async () => sqlite.close(),
  };
}
