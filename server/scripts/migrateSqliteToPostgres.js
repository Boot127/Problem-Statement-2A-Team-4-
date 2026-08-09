const path = require('path');
const Database = require('better-sqlite3');
const { createDirectPool, safeMessage } = require('./postgresScriptUtils');

// Order matters: every table is listed after every table it has a foreign
// key into (countries/users before compliance_records, compliance_records
// before benefit_components/record_attachments, review_requests before
// review_comments/notifications/record_versions, etc.) so the INSERTs never
// hit a dangling reference.
const TABLES = [
  // ---- Shared foundation + Dev 1 (Compliance Content) ----
  {
    name: 'countries', id: 'country_id', booleanColumns: ['is_active'],
    columns: ['country_id','country_code','country_name','region','currency_code','is_active','created_at','updated_at'],
  },
  {
    name: 'users', id: 'user_id', booleanColumns: ['is_active'],
    columns: ['user_id','full_name','email','password_hash','role','is_active','failed_attempts','last_login_at','created_at','updated_at'],
  },
  {
    name: 'compliance_records', id: 'record_id', booleanColumns: [],
    columns: ['record_id','country_id','category','title','summary','full_text','worker_type','visibility','effective_date','source_url','version','status','previous_status','archived_at','created_by','updated_by','created_at','updated_at'],
  },
  {
    name: 'benefit_components', id: 'component_id', booleanColumns: [],
    columns: ['component_id','record_id','component_name','worker_type','employer_rate','employee_rate','cap_ceiling','calculation_basis','notes','sort_order'],
  },
  {
    name: 'record_attachments', id: 'attachment_id', booleanColumns: [],
    columns: ['attachment_id','record_id','file_name','file_path','file_type','uploaded_by','uploaded_at'],
  },
  {
    name: 'audit_logs', id: 'log_id', booleanColumns: [],
    columns: ['log_id','user_id','action','admin_action','entity_type','entity_id','old_value','new_value','created_at'],
  },
  // ---- Dev 2 (Work Permit Management) ----
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
  // ---- Dev 3 (Review & Approval Workflow) ----
  {
    name: 'review_requests', id: 'request_id', booleanColumns: [],
    columns: ['request_id','target_type','target_id','title','description','review_status','previous_status','archived_at','submitted_by','reviewed_by','submitted_at','reviewed_at','published_at','created_at','updated_at'],
  },
  {
    name: 'review_comments', id: 'comment_id', booleanColumns: [],
    columns: ['comment_id','request_id','author_name','comment','created_at'],
  },
  {
    name: 'notifications', id: 'notification_id', booleanColumns: ['is_read'],
    columns: ['notification_id','request_id','recipient','message','is_read','created_at'],
  },
  {
    name: 'record_versions', id: 'version_id', booleanColumns: [],
    columns: ['version_id','target_type','target_id','version','snapshot','published_at','review_id'],
  },
  // ---- Dev 4 (Legal Updates / Newsletter Management) ----
  {
    name: 'newsletters', id: 'id', booleanColumns: ['is_deleted'],
    columns: ['id','title','country','source','published_date','status','notes','file_name','file_path','is_deleted','created_at','updated_at'],
  },
  {
    name: 'detected_updates', id: 'id', booleanColumns: ['ai_flagged'],
    columns: ['id','newsletter_id','ai_summary','ai_flagged','ai_flag_reason','review_decision','linked_compliance_area','reviewed_at','created_at','updated_at'],
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
