// SQLite connection for local development (Review & Approval Workflow, Dev 3).
//
// This is scoped to the Review Workflow feature specifically — it is not the
// team's shared database connection. Both use the configured shared SQLite file.
//
// Opens the same server/database/hrckmp.db file as config/sqliteDb.js (Dev 2)
// and (re-)applies the shared database/schema.sql, which is idempotent —
// every statement is CREATE ... IF NOT EXISTS — so either feature's config
// module can run it safely regardless of which one starts first. Review data
// is never seeded automatically; reviews must be created against
// a target that actually exists in the active project database.

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
  ['previous_status', "TEXT CHECK (previous_status IN ('PENDING','IN_REVIEW','APPROVED','CHANGES_REQUESTED','REJECTED'))"],
  ['archived_at', 'TEXT'],
].forEach(([name, type]) => {
  if (!reviewColumns.includes(name)) db.exec(`ALTER TABLE review_requests ADD COLUMN ${name} ${type}`);
});

module.exports = db;
