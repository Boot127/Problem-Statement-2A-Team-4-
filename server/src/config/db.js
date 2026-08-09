// Shared database connection (HLD Section 11: shared foundation). Backs
// auth/users, countries, compliance_records, benefit_components,
// record_attachments, and audit_logs.
//
// Uses better-sqlite3 (already a dependency for Work Permits' own
// config/sqliteDb.js) rather than node:sqlite, so the whole team is on one
// driver. Both this file and config/sqliteDb.js point at the same
// server/database/hrckmp.db and apply the same server/database/schema.sql
// — every statement in it is CREATE ... IF NOT EXISTS, so applying it from
// two connections at startup is safe (the second is a no-op).
//
// HLD Section 11/17 specifies MySQL 8; this targets SQLite for local dev
// instead (no MySQL server available in this environment). Swapping to
// mysql2 (already a dependency, unused) later mainly touches this file and
// the repositories, not the service/controller layers.

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('./env');

const DATABASE_DIR = path.join(__dirname, '..', '..', 'database');
const SCHEMA_PATH = path.join(DATABASE_DIR, 'schema.sql');

fs.mkdirSync(DATABASE_DIR, { recursive: true });

const db = new Database(config.sqliteDbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));

// Additive shared migrations for databases created before Archive Management.
// Keeping these as nullable columns preserves every existing row and lets
// normal archive actions remember the exact state an administrator restores.
const COLUMN_MIGRATIONS = [
  ['compliance_records', 'previous_status', "TEXT CHECK (previous_status IN ('DRAFT','PUBLISHED'))"],
  ['compliance_records', 'archived_at', 'TEXT'],
  ['work_permits', 'previous_status', "TEXT CHECK (previous_status IN ('DRAFT','PUBLISHED'))"],
  ['work_permits', 'archived_at', 'TEXT'],
  ['review_requests', 'previous_status', "TEXT CHECK (previous_status IN ('PENDING','IN_REVIEW','APPROVED','CHANGES_REQUESTED','REJECTED'))"],
  ['review_requests', 'archived_at', 'TEXT'],
  ['audit_logs', 'admin_action', "TEXT CHECK (admin_action IN ('RESTORE_ARCHIVED','PERMANENT_DELETE'))"],
];

for (const [table, column, ddl] of COLUMN_MIGRATIONS) {
  const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
  if (!exists) continue;
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((entry) => entry.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}

module.exports = db;
