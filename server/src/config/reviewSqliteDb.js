// SQLite connection for local development (Review & Approval Workflow, Dev 3).
//
// This is scoped to the Review Workflow feature specifically — it is not the
// team's shared database connection. See config/db.js for that placeholder.
//
// Opens the same server/database/hrckmp.db file as config/sqliteDb.js (Dev 2)
// and (re-)applies the shared database/schema.sql, which is idempotent —
// every statement is CREATE ... IF NOT EXISTS — so either feature's config
// module can run it safely regardless of which one starts first. Seeds a
// handful of sample review requests, targeting the seeded work permits, only
// when the table is empty.

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

// CREATE TABLE IF NOT EXISTS does not add new columns to an existing local
// database, so apply small, idempotent migrations for databases created by
// the earlier CRUD-only implementation.
const reviewColumns = db.prepare('PRAGMA table_info(review_requests)').all().map((column) => column.name);
[
  ['description', 'TEXT'],
  ['submitted_by', 'TEXT'],
  ['reviewed_by', 'TEXT'],
  ['submitted_at', 'TEXT'],
  ['reviewed_at', 'TEXT'],
  ['published_at', 'TEXT'],
].forEach(([name, type]) => {
  if (!reviewColumns.includes(name)) db.exec(`ALTER TABLE review_requests ADD COLUMN ${name} ${type}`);
});

const SEED_REVIEWS = [
  {
    target_type: 'work_permit',
    target_id: 1,
    title: 'Review: Singapore Employment Pass copy',
    review_status: 'APPROVED',
  },
  {
    target_type: 'work_permit',
    target_id: 2,
    title: 'Review: Singapore S Pass eligibility wording',
    review_status: 'IN_REVIEW',
  },
  {
    target_type: 'work_permit',
    target_id: 3,
    title: 'Review: Philippines AEP fee update',
    review_status: 'PENDING',
  },
  {
    target_type: 'work_permit',
    target_id: 4,
    title: 'Review: Malaysia Employment Pass criteria',
    review_status: 'CHANGES_REQUESTED',
  },
  {
    target_type: 'work_permit',
    target_id: 5,
    title: 'Review: Vietnam Work Permit (superseded) retirement',
    review_status: 'REJECTED',
  },
];

function seedIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM review_requests').get();
  if (count > 0) return;

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO review_requests (
      target_type, target_id, title, review_status, created_at, updated_at
    ) VALUES (
      @target_type, @target_id, @title, @review_status, @created_at, @updated_at
    )
  `);

  const insertAll = db.transaction((rows) => {
    rows.forEach((row) => insert.run({ ...row, created_at: now, updated_at: now }));
  });
  insertAll(SEED_REVIEWS);
}

seedIfEmpty();

module.exports = db;
