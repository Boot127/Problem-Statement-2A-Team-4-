const path = require('path');
const Database = require('better-sqlite3');
const { createDirectPool, safeMessage } = require('./postgresScriptUtils');

const TABLES = [
  {
    name: 'work_permits', id: 'permit_id', booleanColumns: [],
    columns: ['permit_id','country_code','permit_type','title','permit_holder_name','client_company_name','description','eligibility_criteria','processing_time_days','validity_months','government_fee','currency_code','worker_type','visibility','source_url','version','status','last_reviewed_at','next_review_at','review_notes','information_status','created_at','updated_at'],
  },
  {
    name: 'work_permit_steps', id: 'step_id', booleanColumns: [],
    columns: ['step_id','permit_id','process_type','step_number','step_title','step_detail','expected_timeline'],
  },
  {
    name: 'permit_documents', id: 'document_id', booleanColumns: ['is_mandatory'],
    columns: ['document_id','permit_id','process_type','document_name','is_mandatory','notes','sort_order'],
  },
  {
    name: 'permit_source_documents', id: 'source_document_id', booleanColumns: [],
    columns: ['source_document_id','permit_id','original_file_name','stored_file_name','mime_type','file_size','file_hash','description','source_type','status','uploaded_by','uploaded_at'],
  },
  {
    name: 'permit_groups', id: 'group_id', booleanColumns: [],
    columns: ['group_id','group_name','description','status','created_at','updated_at'],
  },
  {
    name: 'permit_group_members', id: null, booleanColumns: [],
    columns: ['group_id','permit_id','added_at'],
  },
];

function sqlitePath() {
  return path.resolve(process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'database', 'hrckmp.db'));
}

async function run() {
  const source = new Database(sqlitePath(), { readonly: true, fileMustExist: true });
  const pool = createDirectPool();
  const client = await pool.connect();
  try {
    const sourceRows = Object.fromEntries(TABLES.map((table) => [
      table.name,
      source.prepare(`SELECT ${table.columns.join(', ')} FROM ${table.name}`).all(),
    ]));
    const destinationCounts = {};
    for (const table of TABLES) {
      const result = await client.query(`SELECT COUNT(*)::integer AS count FROM ${table.name}`);
      destinationCounts[table.name] = result.rows[0].count;
    }
    const occupied = Object.entries(destinationCounts).filter(([, count]) => count > 0);
    if (occupied.length) {
      throw new Error(`Destination is not empty (${occupied.map(([name, count]) => `${name}: ${count}`).join(', ')}); import aborted`);
    }

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
        if (table.id) {
          await client.query(
            `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE(MAX(${table.id}), 1), COUNT(*) > 0) FROM ${table.name}`,
            [table.name, table.id]
          );
        }
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    console.log('SQLite source was read-only and remains unchanged');
    TABLES.forEach((table) => console.log(`${table.name}: ${sourceRows[table.name].length} imported`));
  } finally {
    source.close();
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(`SQLite to PostgreSQL import failed: ${safeMessage(error)}`);
  process.exitCode = 1;
});
