const path = require('path');
const Database = require('better-sqlite3');
const { createDirectPool, safeMessage } = require('./postgresScriptUtils');

const TABLES = [
  'countries','users','compliance_records','benefit_components','record_attachments','audit_logs',
  'work_permits','work_permit_steps','permit_documents','permit_source_documents','permit_groups','permit_group_members',
  'review_requests','review_comments','notifications','record_versions',
  'newsletters','detected_updates',
];

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
      orphanComponents: `SELECT COUNT(*)::integer count FROM benefit_components c LEFT JOIN compliance_records r ON r.record_id=c.record_id WHERE r.record_id IS NULL`,
      orphanAttachments: `SELECT COUNT(*)::integer count FROM record_attachments c LEFT JOIN compliance_records r ON r.record_id=c.record_id WHERE r.record_id IS NULL`,
      orphanReviewComments: `SELECT COUNT(*)::integer count FROM review_comments c LEFT JOIN review_requests r ON r.request_id=c.request_id WHERE r.request_id IS NULL`,
      orphanVersionReviews: `SELECT COUNT(*)::integer count FROM record_versions v LEFT JOIN review_requests r ON r.request_id=v.review_id WHERE r.request_id IS NULL`,
      orphanDetectedUpdates: `SELECT COUNT(*)::integer count FROM detected_updates d LEFT JOIN newsletters n ON n.id=d.newsletter_id WHERE n.id IS NULL`,
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
    console.log('SQLite/PostgreSQL verification passed');
  } finally {
    sqlite.close();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(`Verification failed: ${safeMessage(error)}`);
  process.exitCode = 1;
});
