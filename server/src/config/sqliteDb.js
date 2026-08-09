// SQLite connection for local development (Work Permit Management, Dev 2).
//
// This is scoped to the Work Permit feature specifically — it is not the
// team's shared database connection. See config/db.js for that placeholder.
//
// Creates server/database/hrckmp.db on first run, applies database/schema.sql
// (idempotent — every statement is CREATE ... IF NOT EXISTS), and seeds a
// handful of sample permits only when the table is empty.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const env = require('./env');

const DATABASE_DIR = path.join(__dirname, '..', '..', 'database');
const DB_PATH = env.sqliteDbPath || path.join(DATABASE_DIR, 'hrckmp.db');
const SCHEMA_PATH = path.join(DATABASE_DIR, 'schema.sql');

if (!fs.existsSync(DATABASE_DIR)) {
  fs.mkdirSync(DATABASE_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));

// ---------------------------------------------------------------------------
// Additive migrations
// ---------------------------------------------------------------------------
// schema.sql is guarded with CREATE TABLE IF NOT EXISTS, which means a column
// added to an existing CREATE TABLE is silently skipped on databases that were
// created earlier. Anything that has to reach an existing developer's database
// therefore needs an explicit ALTER TABLE here.
//
// Every entry is checked against PRAGMA table_info first, so this is idempotent
// and never rewrites or drops data. SQLite backfills the DEFAULT into existing
// rows automatically.
const COLUMN_MIGRATIONS = [
  { table: 'work_permits', column: 'permit_holder_name', ddl: 'TEXT' },
  { table: 'work_permits', column: 'client_company_name', ddl: 'TEXT' },
  { table: 'work_permits', column: 'last_reviewed_at', ddl: 'TEXT' },
  { table: 'work_permits', column: 'next_review_at', ddl: 'TEXT' },
  { table: 'work_permits', column: 'review_notes', ddl: 'TEXT' },
  { table: 'work_permits', column: 'previous_status', ddl: "TEXT CHECK (previous_status IN ('DRAFT','PUBLISHED'))" },
  { table: 'work_permits', column: 'archived_at', ddl: 'TEXT' },
  {
    table: 'work_permits',
    column: 'information_status',
    ddl: "TEXT NOT NULL DEFAULT 'CURRENT' CHECK (information_status IN ('CURRENT','REVIEW_DUE','OUTDATED','INCOMPLETE'))",
  },
];

function applyColumnMigrations() {
  COLUMN_MIGRATIONS.forEach(({ table, column, ddl }) => {
    const existing = db.prepare(`PRAGMA table_info(${table})`).all();
    if (existing.some((c) => c.name === column)) return;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  });
}

applyColumnMigrations();

const SEED_PERMITS = [
  {
    country_code: 'SG',
    permit_type: 'Employment Pass (EP)',
    title: 'Singapore Employment Pass',
    description:
      'Work pass for foreign professionals, managers, and executives earning at least the qualifying salary to work in Singapore.',
    eligibility_criteria:
      'Job offer from a Singapore-registered company; minimum qualifying monthly salary; recognised degree, professional qualifications, or specialist skills.',
    processing_time_days: 21,
    validity_months: 24,
    government_fee: 105,
    currency_code: 'SGD',
    worker_type: 'FOREIGN_WORKER',
    visibility: 'CLIENT_SHAREABLE',
    source_url: 'https://www.mom.gov.sg/passes-and-permits/employment-pass',
    version: 1,
    status: 'PUBLISHED',
  },
  {
    country_code: 'SG',
    permit_type: 'S Pass',
    title: 'Singapore S Pass',
    description:
      'Work pass for mid-skilled foreign staff, subject to a dependency ratio ceiling and levy.',
    eligibility_criteria:
      'Minimum qualifying salary; relevant diploma or technical certificate; job must be on the accepted occupation list.',
    processing_time_days: 21,
    validity_months: 24,
    government_fee: 75,
    currency_code: 'SGD',
    worker_type: 'FOREIGN_WORKER',
    visibility: 'INTERNAL_STAFF',
    source_url: 'https://www.mom.gov.sg/passes-and-permits/s-pass',
    version: 1,
    status: 'DRAFT',
  },
  {
    country_code: 'PH',
    permit_type: 'Alien Employment Permit (AEP)',
    title: 'Philippines Alien Employment Permit',
    description:
      'Document issued by the Department of Migrant Workers authorising a foreign national to work in the Philippines.',
    eligibility_criteria:
      'Valid job offer; proof no Filipino is willing/qualified for the position; supporting company documents.',
    processing_time_days: 30,
    validity_months: 12,
    government_fee: 8000,
    currency_code: 'PHP',
    worker_type: 'FOREIGN_WORKER',
    visibility: 'CLIENT_SHAREABLE',
    source_url: '',
    version: 1,
    status: 'PUBLISHED',
  },
  {
    country_code: 'MY',
    permit_type: 'Employment Pass',
    title: 'Malaysia Employment Pass',
    description:
      'Pass for expatriates employed in managerial, executive, or technical/specialist roles in Malaysia.',
    eligibility_criteria:
      'Minimum monthly salary threshold; relevant qualifications/experience; employer meets equity and localisation requirements.',
    processing_time_days: 20,
    validity_months: 24,
    government_fee: 125,
    currency_code: 'MYR',
    worker_type: 'EXPATRIATE',
    visibility: 'INTERNAL_STAFF',
    source_url: '',
    version: 1,
    status: 'PUBLISHED',
  },
  {
    country_code: 'VN',
    permit_type: 'Work Permit for Foreign Employee',
    title: 'Vietnam Work Permit (Superseded)',
    description:
      'Previous work permit process retained for reference; superseded by an updated circular.',
    eligibility_criteria: 'Retained for historical reference only.',
    processing_time_days: 15,
    validity_months: 24,
    government_fee: 0,
    currency_code: 'VND',
    worker_type: 'FOREIGN_WORKER',
    visibility: 'COMPLIANCE_ONLY',
    source_url: '',
    version: 1,
    status: 'ARCHIVED',
  },
];

function seedIfEmpty() {
  // Seeding is opt-in so a newly configured production-like database is never
  // populated with sample permits by merely starting the application.
  if (!env.enableDevSeed) return;
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM work_permits').get();
  if (count > 0) return;

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO work_permits (
      country_code, permit_type, title, description, eligibility_criteria,
      processing_time_days, validity_months, government_fee, currency_code,
      worker_type, visibility, source_url, version, status, created_at, updated_at
    ) VALUES (
      @country_code, @permit_type, @title, @description, @eligibility_criteria,
      @processing_time_days, @validity_months, @government_fee, @currency_code,
      @worker_type, @visibility, @source_url, @version, @status, @created_at, @updated_at
    )
  `);

  const insertAll = db.transaction((rows) => {
    rows.forEach((row) => insert.run({ ...row, created_at: now, updated_at: now }));
  });
  insertAll(SEED_PERMITS);
}

seedIfEmpty();

module.exports = db;
