const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { TABLES } = require('./migrationManifest');
const {
  assertSourceSchema, ensureEmptyDestination, readSourceRows, importSourceRows,
} = require('./migrateSqliteToPostgres');
const { compareRows, normalize, passwordHashesEqual, verifyIdentities, verify } = require('./verifyMigration');

const checks = [];
function check(label, condition) {
  if (!condition) throw new Error(`Failed check: ${label}`);
  checks.push(label);
}

function postgresColumns() {
  const migrationDirectory = path.join(__dirname, '..', 'database', 'postgres');
  const sql = fs.readdirSync(migrationDirectory).filter((name) => name.endsWith('.sql')).sort()
    .map((name) => fs.readFileSync(path.join(migrationDirectory, name), 'utf8')).join('\n');
  return Object.fromEntries(TABLES.map((table) => {
    const match = sql.match(new RegExp(`CREATE TABLE IF NOT EXISTS\\s+${table.name}\\s*\\(([\\s\\S]*?)\\n\\);`, 'i'));
    if (!match) throw new Error(`No PostgreSQL CREATE TABLE found for ${table.name}`);
    const constraintKeywords = new Set(['primary', 'unique', 'check', 'foreign', 'constraint', 'exclude']);
    const columns = [...match[1].matchAll(/^\s{2}([a-z_][a-z0-9_]*)\s+/gmi)]
      .map((entry) => entry[1].toLowerCase())
      .filter((name) => !constraintKeywords.has(name));
    return [table.name, columns];
  }));
}

async function main() {
  const databasePath = path.join(__dirname, '..', 'database', 'hrckmp.db');
  const sqlite = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    assertSourceSchema(sqlite);
    check('all 18 SQLite tables exactly match import mappings', TABLES.length === 18);
    const postgres = postgresColumns();
    for (const table of TABLES) {
      const missing = table.columns.filter((column) => !postgres[table.name].includes(column));
      const omitted = postgres[table.name].filter((column) => !table.columns.includes(column));
      check(`${table.name} columns exactly match PostgreSQL migrations`, missing.length === 0 && omitted.length === 0);
    }
    const permits = TABLES.find((table) => table.name === 'work_permits');
    check('work permit previous_status is imported', permits.columns.includes('previous_status'));
    check('work permit archived_at is imported', permits.columns.includes('archived_at'));

    let emptyQueries = 0;
    await ensureEmptyDestination({ query: async () => { emptyQueries += 1; return { rows: [{ count: 0 }] }; } });
    check('empty destination checks every business table', emptyQueries === TABLES.length);
    let refused = false;
    try {
      await ensureEmptyDestination({ query: async (sql) => ({ rows: [{ count: sql.includes('work_permits') ? 1 : 0 }] }) });
    } catch (error) {
      refused = error.message.includes('Destination is not empty') && error.message.includes('import aborted');
    }
    check('occupied destination is refused without truncate or merge', refused);

    const users = TABLES.find((table) => table.name === 'users');
    const sourceUser = { user_id: 4, full_name: 'Admin', email: 'admin@hrckmp.test', password_hash: '$sensitive', role: 'admin', is_active: 1, failed_attempts: 0, last_login_at: '2026-08-12T12:00:00.000Z', created_at: '2026-01-01 00:00:00', updated_at: '2026-01-01 00:00:00' };
    const destinationUser = { ...sourceUser, user_id: '4', is_active: true, created_at: new Date('2026-01-01T00:00:00.000Z'), updated_at: new Date('2026-01-01T00:00:00.000Z') };
    check('row comparison normalizes BIGINT, boolean, and timestamp representations', compareRows(users, [sourceUser], [destinationUser]).length === 0);
    const hashMismatch = compareRows(users, [sourceUser], [{ ...destinationUser, password_hash: '$different' }]);
    check('password hash mismatch is detected', hashMismatch.length === 1 && hashMismatch[0].includes('password_hash'));
    check('password hashes are redacted from mismatch output', !hashMismatch[0].includes('$sensitive') && !hashMismatch[0].includes('$different'));
    check('password hash equality requires the same user IDs and exact hashes',
      passwordHashesEqual(users, [sourceUser], [destinationUser])
      && !passwordHashesEqual(users, [sourceUser], [{ ...destinationUser, password_hash: '$different' }])
      && !passwordHashesEqual(users, [sourceUser], []));
    check('numeric normalization preserves equal NUMERIC values', normalize(permits, 'government_fee', '105.00', 105) === 105);

    const sourceRows = readSourceRows(sqlite);
    const importCalls = [];
    await importSourceRows({ query: async (sql, params = []) => { importCalls.push({ sql, params }); return { rows: [] }; } }, sourceRows);
    check('full importer wraps all writes in one transaction', importCalls[0].sql === 'BEGIN' && importCalls.at(-1).sql === 'COMMIT');
    const permitInsert = importCalls.find((call) => call.sql.startsWith('INSERT INTO work_permits'));
    check('full importer writes explicit Work Permit IDs', permitInsert.params[permits.columns.indexOf('permit_id')] !== undefined);
    check('full importer writes Work Permit archive state', permitInsert.sql.includes('previous_status') && permitInsert.sql.includes('archived_at'));
    const userInsert = importCalls.find((call) => call.sql.startsWith('INSERT INTO users'));
    const firstUser = sourceRows.users[0];
    check('full importer passes password hashes through unchanged', userInsert.params[users.columns.indexOf('password_hash')] === firstUser.password_hash);
    const sequenceResets = importCalls.filter((call) => call.sql.includes('pg_get_serial_sequence'));
    check('full importer resets every identity sequence', sequenceResets.length === TABLES.filter((table) => table.identity).length);
    check('full importer never truncates destination tables', !importCalls.some((call) => /\b(TRUNCATE|DROP)\b/i.test(call.sql)));

    const rollbackCalls = [];
    let importRolledBack = false;
    try {
      await importSourceRows({ query: async (sql) => {
        rollbackCalls.push(sql);
        if (sql.startsWith('INSERT INTO users')) throw new Error('simulated insert failure');
        return { rows: [] };
      } }, sourceRows);
    } catch (error) {
      importRolledBack = error.message === 'simulated insert failure';
    }
    check('full importer rolls back atomically after a failed insert', importRolledBack && rollbackCalls.at(-1) === 'ROLLBACK');

    const sequenceState = new Map(TABLES.filter((table) => table.identity).map((table) => [table.name, { max: 9, sequence: `public.${table.name}_${table.identity}_seq` }]));
    const identityFailures = await verifyIdentities(async (sql, params = []) => {
      if (sql.includes('pg_get_serial_sequence')) return { rows: [{ sequence_name: sequenceState.get(params[0]).sequence }] };
      if (sql.includes('MAX(')) {
        const name = [...sequenceState.keys()].find((table) => sql.includes(`FROM ${table}`));
        return { rows: [{ max_id: sequenceState.get(name).max }] };
      }
      return { rows: [{ last_value: 9, is_called: true }] };
    });
    check('identity verification confirms next IDs exceed imported maxima', identityFailures.length === 0);

    const verifierQuery = async (sql, params = []) => {
      if (sql.includes('information_schema.columns')) {
        return { rows: TABLES.find((table) => table.name === params[0]).columns.map((column_name) => ({ column_name })) };
      }
      if (sql.includes('pg_get_serial_sequence')) return { rows: [{ sequence_name: `public.${params[0]}_${params[1]}_seq` }] };
      if (/SELECT\s+MAX\(/i.test(sql)) {
        const name = TABLES.find((table) => new RegExp(`FROM\\s+${table.name}\\b`, 'i').test(sql)).name;
        const table = TABLES.find((item) => item.name === name);
        const maximum = sourceRows[name].reduce((max, row) => Math.max(max, Number(row[table.identity]) || 0), 0);
        return { rows: [{ max_id: maximum }] };
      }
      if (/SELECT\s+last_value,\s*is_called/i.test(sql)) return { rows: [{ last_value: 1_000_000, is_called: true }] };
      const table = TABLES.find((item) => new RegExp(`FROM\\s+${item.name}\\s+ORDER BY`, 'i').test(sql));
      if (table) {
        const rows = sourceRows[table.name].map((row) => Object.fromEntries(table.columns.map((column) => {
          if (row[column] === null) return [column, null];
          if (table.booleanColumns.includes(column)) return [column, Boolean(row[column])];
          if (table.timestampColumns.includes(column)) return [column, new Date(sqliteTimestampForTest(row[column]))];
          if (typeof row[column] === 'number') return [column, String(row[column])];
          return [column, row[column]];
        })));
        return { rows };
      }
      if (/SELECT\s+COUNT\(\*\)/i.test(sql)) return { rows: [{ count: 0 }] };
      throw new Error(`Verifier regression stub did not recognize SQL: ${sql}`);
    };
    const originalLog = console.log;
    let verifierResult;
    try {
      console.log = () => {};
      verifierResult = await verify(sqlite, verifierQuery);
    } finally {
      console.log = originalLog;
    }
    check('row-level verifier covers all tables and current SQLite rows', verifierResult.tables === TABLES.length && verifierResult.rows > 0);

    const pg = require('pg');
    const originalPool = pg.Pool;
    const calls = [];
    const client = {
      query: async (sql) => { calls.push(sql); if (sql === 'ROLLBACK') throw new Error('rollback failure'); return { rows: [] }; },
      release: () => calls.push('RELEASE'),
    };
    pg.Pool = class FakePool {
      async connect() { calls.push('CONNECT'); return client; }
      async query(sql) { calls.push(`POOL:${sql}`); return { rows: [] }; }
      async end() { calls.push('END'); }
    };
    process.env.DATABASE_URL = 'postgresql://migration-test.invalid/database';
    const modulePath = require.resolve('../src/config/postgresDb');
    delete require.cache[modulePath];
    const postgresDb = require('../src/config/postgresDb');
    let rolledBack = false;
    try {
      await postgresDb.transaction(async () => { throw new Error('expected transaction failure'); });
    } catch (error) {
      rolledBack = error.message === 'expected transaction failure';
    }
    check('PostgreSQL transaction acquires a pooled client and begins', calls[0] === 'CONNECT' && calls[1] === 'BEGIN');
    check('PostgreSQL transaction attempts rollback on failure', rolledBack && calls.includes('ROLLBACK'));
    check('PostgreSQL transaction releases client even if rollback fails', calls.includes('RELEASE'));
    const connectsBeforeSuccess = calls.filter((entry) => entry === 'CONNECT').length;
    await postgresDb.transaction(async () => {
      await postgresDb.query('SELECT outer transaction');
      await postgresDb.transaction(async () => postgresDb.query('SELECT nested transaction'));
    });
    check('successful PostgreSQL transaction commits', calls.includes('COMMIT'));
    check('nested PostgreSQL operations reuse the acquired client',
      calls.filter((entry) => entry === 'CONNECT').length === connectsBeforeSuccess + 1
      && calls.includes('SELECT outer transaction') && calls.includes('SELECT nested transaction'));
    check('successful PostgreSQL transaction releases client', calls.filter((entry) => entry === 'RELEASE').length === 2);
    await postgresDb.close();
    check('PostgreSQL runtime pool closes cleanly', calls.includes('END'));
    pg.Pool = originalPool;
    delete require.cache[modulePath];
  } finally {
    sqlite.close();
  }
  console.log(`Neon migration readiness: ${checks.length} checks passed`);
  checks.forEach((label) => console.log(`  PASS ${label}`));
}

function sqliteTimestampForTest(value) {
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2} /.test(text) ? `${text.replace(' ', 'T')}Z` : text;
}

main().catch((error) => {
  console.error(error.stack);
  process.exitCode = 1;
});
