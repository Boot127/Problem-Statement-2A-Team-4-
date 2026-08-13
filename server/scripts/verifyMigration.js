const path = require('path');
const Database = require('better-sqlite3');
const { createDirectPool, safeMessage } = require('./postgresScriptUtils');
const { TABLES, RELATIONSHIPS } = require('./migrationManifest');
const { assertSourceSchema, assertDestinationSchema } = require('./migrateSqliteToPostgres');

function sqlitePath() {
  return path.resolve(process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'database', 'hrckmp.db'));
}

function keyFor(table, row) {
  return table.primaryKey.map((column) => String(row[column])).join('|');
}

function sqliteTimestamp(value) {
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(text)) return `${text.replace(' ', 'T')}Z`;
  return text;
}

function normalize(table, column, value, sourceValue = value) {
  if (value === null || value === undefined) return null;
  if (table.booleanColumns.includes(column)) return Boolean(Number(value) || value === true || value === 'true');
  if (table.dateColumns.includes(column)) return String(value).slice(0, 10);
  if (table.timestampColumns.includes(column)) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? String(value) : value.toISOString();
    const parsed = new Date(sqliteTimestamp(value));
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
  }
  // pg returns BIGINT/NUMERIC as strings while SQLite returns safe values as
  // numbers. The SQLite value is authoritative for deciding this conversion.
  if (typeof sourceValue === 'number') return Number(value);
  return value;
}

function safeValue(table, column, value) {
  if (table.sensitiveColumns.includes(column)) return value === null ? 'null' : '[redacted value]';
  const text = value === null ? 'null' : String(value);
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function compareRows(table, sourceRows, destinationRows) {
  const mismatches = [];
  const destination = new Map(destinationRows.map((row) => [keyFor(table, row), row]));
  for (const sourceRow of sourceRows) {
    const key = keyFor(table, sourceRow);
    const destinationRow = destination.get(key);
    if (!destinationRow) {
      mismatches.push(`${table.name} record ${key}: missing from PostgreSQL`);
      continue;
    }
    for (const column of table.columns) {
      const sourceValue = normalize(table, column, sourceRow[column]);
      const destinationValue = normalize(table, column, destinationRow[column], sourceRow[column]);
      if (Object.is(sourceValue, destinationValue)) continue;
      mismatches.push(
        `${table.name} record ${key}, ${column}: SQLite=${safeValue(table, column, sourceValue)}; `
        + `PostgreSQL=${safeValue(table, column, destinationValue)}`
      );
    }
    destination.delete(key);
  }
  for (const key of destination.keys()) mismatches.push(`${table.name} record ${key}: unexpected PostgreSQL row`);
  return mismatches;
}

function passwordHashesEqual(table, sourceRows, destinationRows) {
  const destination = new Map(destinationRows.map((row) => [keyFor(table, row), row.password_hash]));
  return sourceRows.length === destinationRows.length
    && sourceRows.every((row) => destination.get(keyFor(table, row)) === row.password_hash);
}

async function verifyRelationships(query) {
  const failures = [];
  for (const [label, fromSql, whereSql] of RELATIONSHIPS) {
    const count = Number((await query(`SELECT COUNT(*) AS count FROM ${fromSql} WHERE ${whereSql}`)).rows[0].count);
    if (count) failures.push(`${label}: ${count} orphaned row(s)`);
  }
  const polymorphic = [
    ['review_requests.target', `SELECT COUNT(*) AS count FROM review_requests r
      LEFT JOIN compliance_records c ON r.target_type='compliance_record' AND c.record_id=r.target_id
      LEFT JOIN work_permits p ON r.target_type='work_permit' AND p.permit_id=r.target_id
      WHERE (r.target_type='compliance_record' AND c.record_id IS NULL)
         OR (r.target_type='work_permit' AND p.permit_id IS NULL)`],
    ['record_versions.target', `SELECT COUNT(*) AS count FROM record_versions v
      LEFT JOIN compliance_records c ON v.target_type='compliance_record' AND c.record_id=v.target_id
      LEFT JOIN work_permits p ON v.target_type='work_permit' AND p.permit_id=v.target_id
      WHERE (v.target_type='compliance_record' AND c.record_id IS NULL)
         OR (v.target_type='work_permit' AND p.permit_id IS NULL)
         OR v.target_type NOT IN ('compliance_record','work_permit')`],
  ];
  for (const [label, sql] of polymorphic) {
    const count = Number((await query(sql)).rows[0].count);
    if (count) failures.push(`${label}: ${count} invalid target(s)`);
  }
  return failures;
}

function quoteQualifiedIdentifier(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_$]*(\.[A-Za-z_][A-Za-z0-9_$]*)?$/.test(identifier)) {
    throw new Error(`PostgreSQL returned an unsafe sequence identifier for verification`);
  }
  return identifier.split('.').map((part) => `"${part}"`).join('.');
}

async function verifyIdentities(query) {
  const failures = [];
  for (const table of TABLES.filter((item) => item.identity)) {
    const sequence = (await query('SELECT pg_get_serial_sequence($1, $2) AS sequence_name', [table.name, table.identity])).rows[0].sequence_name;
    if (!sequence) {
      failures.push(`${table.name}.${table.identity}: identity sequence is missing`);
      continue;
    }
    const maxId = Number((await query(`SELECT MAX(${table.identity}) AS max_id FROM ${table.name}`)).rows[0].max_id || 0);
    const state = (await query(`SELECT last_value, is_called FROM ${quoteQualifiedIdentifier(sequence)}`)).rows[0];
    const nextId = Number(state.last_value) + (state.is_called ? 1 : 0);
    if (nextId <= maxId) failures.push(`${table.name}.${table.identity}: next identity ${nextId} is not above maximum ${maxId}`);
  }
  return failures;
}

async function verify(sqlite, query) {
  assertSourceSchema(sqlite);
  await assertDestinationSchema({ query });
  const failures = [];
  let hashesPass = false;
  for (const table of TABLES) {
    const order = table.primaryKey.join(', ');
    const sourceRows = sqlite.prepare(`SELECT ${table.columns.join(', ')} FROM ${table.name} ORDER BY ${order}`).all();
    const destinationRows = (await query(`SELECT ${table.columns.join(', ')} FROM ${table.name} ORDER BY ${order}`)).rows;
    if (sourceRows.length !== destinationRows.length) {
      failures.push(`${table.name}: SQLite=${sourceRows.length}, PostgreSQL=${destinationRows.length}`);
    }
    const rowFailures = compareRows(table, sourceRows, destinationRows);
    if (table.name === 'users') hashesPass = passwordHashesEqual(table, sourceRows, destinationRows);
    failures.push(...rowFailures);
    const failedSourceRows = sourceRows.filter((row) => rowFailures.some((failure) => failure.startsWith(`${table.name} record ${keyFor(table, row)}:`))).length;
    console.log(`${table.name}: ${sourceRows.length - failedSourceRows}/${sourceRows.length} rows verified`);
  }
  failures.push(...await verifyRelationships(query));
  failures.push(...await verifyIdentities(query));
  const users = sqlite.prepare('SELECT COUNT(*) AS count FROM users').get().count;
  console.log(`users password hashes: ${hashesPass ? `PASS (${users}/${users})` : 'FAIL'}`);
  console.log(`foreign-key and polymorphic relationships: ${failures.some((item) => item.includes('orphaned') || item.includes('invalid target')) ? 'FAIL' : 'PASS'}`);
  console.log(`identity sequences: ${failures.some((item) => item.includes('identity')) ? 'FAIL' : 'PASS'}`);
  if (failures.length) throw new Error(`Verification failed with ${failures.length} mismatch(es):\n- ${failures.slice(0, 50).join('\n- ')}`);
  return { tables: TABLES.length, rows: TABLES.reduce((total, table) => total + sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table.name}`).get().count, 0) };
}

async function run() {
  const sqlite = new Database(sqlitePath(), { readonly: true, fileMustExist: true });
  const pool = createDirectPool();
  try {
    const result = await verify(sqlite, pool.query.bind(pool));
    console.log(`SQLite/PostgreSQL verification passed: ${result.rows} rows across ${result.tables} tables`);
  } finally {
    sqlite.close();
    await pool.end();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(`Verification failed: ${safeMessage(error)}`);
    process.exitCode = 1;
  });
}

module.exports = { normalize, compareRows, passwordHashesEqual, verifyRelationships, verifyIdentities, verify };
