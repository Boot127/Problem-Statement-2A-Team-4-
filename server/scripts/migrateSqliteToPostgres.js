const path = require('path');
const Database = require('better-sqlite3');
const { createDirectPool, safeMessage } = require('./postgresScriptUtils');
const { TABLES } = require('./migrationManifest');

function sqlitePath() {
  return path.resolve(process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'database', 'hrckmp.db'));
}

function assertSourceSchema(source) {
  for (const table of TABLES) {
    const actual = source.prepare(`PRAGMA table_info(${table.name})`).all().map((column) => column.name);
    const missing = table.columns.filter((column) => !actual.includes(column));
    const omitted = actual.filter((column) => !table.columns.includes(column));
    if (missing.length || omitted.length) {
      throw new Error(
        `SQLite/import mapping mismatch for ${table.name}`
        + `${missing.length ? `; missing source columns: ${missing.join(', ')}` : ''}`
        + `${omitted.length ? `; importer omits source columns: ${omitted.join(', ')}` : ''}`
      );
    }
  }
}

async function assertDestinationSchema(client) {
  for (const table of TABLES) {
    const result = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = $1`,
      [table.name]
    );
    const actual = result.rows.map((row) => row.column_name);
    const missing = table.columns.filter((column) => !actual.includes(column));
    const omitted = actual.filter((column) => !table.columns.includes(column));
    if (missing.length || omitted.length) {
      throw new Error(
        `PostgreSQL/import mapping mismatch for ${table.name}`
        + `${missing.length ? `; PostgreSQL is missing columns: ${missing.join(', ')}` : ''}`
        + `${omitted.length ? `; importer omits PostgreSQL columns: ${omitted.join(', ')}` : ''}`
      );
    }
  }
}

async function ensureEmptyDestination(client) {
  const occupied = [];
  for (const table of TABLES) {
    const count = Number((await client.query(`SELECT COUNT(*) AS count FROM ${table.name}`)).rows[0].count);
    if (count > 0) occupied.push(`${table.name}: ${count}`);
  }
  if (occupied.length) {
    throw new Error(`Destination is not empty (${occupied.join(', ')}); import aborted without changing PostgreSQL`);
  }
}

function readSourceRows(source) {
  return Object.fromEntries(TABLES.map((table) => [
    table.name,
    source.prepare(`SELECT ${table.columns.join(', ')} FROM ${table.name}`).all(),
  ]));
}

async function importSourceRows(client, sourceRows) {
  await client.query('BEGIN');
  try {
    for (const table of TABLES) {
      for (const sourceRow of sourceRows[table.name]) {
        const values = table.columns.map((column) =>
          table.booleanColumns.includes(column) ? Boolean(sourceRow[column]) : sourceRow[column]
        );
        const placeholders = values.map((_value, index) => `$${index + 1}`).join(', ');
        await client.query(
          `INSERT INTO ${table.name} (${table.columns.join(', ')}) VALUES (${placeholders})`,
          values
        );
      }
      if (table.identity) {
        await client.query(
          `SELECT setval(
             pg_get_serial_sequence($1, $2)::regclass,
             COALESCE(MAX(${table.identity}), 1),
             COUNT(*) > 0
           ) FROM ${table.name}`,
          [table.name, table.identity]
        );
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function run() {
  const source = new Database(sqlitePath(), { readonly: true, fileMustExist: true });
  let pool;
  let client;
  try {
    assertSourceSchema(source);
    pool = createDirectPool();
    client = await pool.connect();
    await assertDestinationSchema(client);
    await ensureEmptyDestination(client);
    const sourceRows = readSourceRows(source);
    await importSourceRows(client, sourceRows);
    console.log('SQLite source was read-only and remains unchanged');
    TABLES.forEach((table) => console.log(`${table.name}: ${sourceRows[table.name].length} imported`));
  } finally {
    source.close();
    if (client) client.release();
    if (pool) await pool.end();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(`SQLite to PostgreSQL import failed: ${safeMessage(error)}`);
    process.exitCode = 1;
  });
}

module.exports = {
  run, assertSourceSchema, assertDestinationSchema, ensureEmptyDestination,
  readSourceRows, importSourceRows,
};
