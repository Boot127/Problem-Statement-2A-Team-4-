const path = require('path');
const Database = require('better-sqlite3');
const { createDirectPool, safeMessage } = require('./postgresScriptUtils');

const TABLES = ['work_permits','work_permit_steps','permit_documents','permit_source_documents','permit_groups','permit_group_members'];

async function run() {
  const sqlite = new Database(
    path.resolve(process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'database', 'hrckmp.db')),
    { readonly: true, fileMustExist: true }
  );
  const pool = createDirectPool();
  try {
    const mismatches = [];
    for (const table of TABLES) {
      const source = sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
      const result = await pool.query(`SELECT COUNT(*)::integer AS count FROM ${table}`);
      const destination = result.rows[0].count;
      console.log(`${table}: SQLite=${source}, PostgreSQL=${destination}`);
      if (source !== destination) mismatches.push(table);
    }
    const checks = {
      orphanSteps: `SELECT COUNT(*)::integer count FROM work_permit_steps c LEFT JOIN work_permits p ON p.permit_id=c.permit_id WHERE p.permit_id IS NULL`,
      orphanDocuments: `SELECT COUNT(*)::integer count FROM permit_documents c LEFT JOIN work_permits p ON p.permit_id=c.permit_id WHERE p.permit_id IS NULL`,
      orphanSources: `SELECT COUNT(*)::integer count FROM permit_source_documents c LEFT JOIN work_permits p ON p.permit_id=c.permit_id WHERE p.permit_id IS NULL`,
      invalidMemberships: `SELECT COUNT(*)::integer count FROM permit_group_members m LEFT JOIN permit_groups g ON g.group_id=m.group_id LEFT JOIN work_permits p ON p.permit_id=m.permit_id WHERE g.group_id IS NULL OR p.permit_id IS NULL`,
    };
    for (const [label, sql] of Object.entries(checks)) {
      const count = (await pool.query(sql)).rows[0].count;
      console.log(`${label}: ${count}`);
      if (count) mismatches.push(label);
    }
    for (const table of ['work_permit_steps','permit_documents']) {
      const source = sqlite.prepare(`SELECT process_type, COUNT(*) count FROM ${table} GROUP BY process_type ORDER BY process_type`).all();
      const destination = (await pool.query(`SELECT process_type, COUNT(*)::integer count FROM ${table} GROUP BY process_type ORDER BY process_type`)).rows;
      console.log(`${table} process counts match: ${JSON.stringify(source) === JSON.stringify(destination)}`);
      if (JSON.stringify(source) !== JSON.stringify(destination)) mismatches.push(`${table} process counts`);
    }
    if (mismatches.length) throw new Error(`Verification mismatches: ${mismatches.join(', ')}`);
    console.log('Dev 2 SQLite/PostgreSQL verification passed');
  } finally {
    sqlite.close();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(`Verification failed: ${safeMessage(error)}`);
  process.exitCode = 1;
});
