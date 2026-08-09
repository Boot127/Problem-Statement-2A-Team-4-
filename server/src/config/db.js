const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('./env');

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });

const db = new DatabaseSync(config.dbFile);
db.exec('PRAGMA foreign_keys = ON;');

// Schema mirrors docs/HIGH_LEVEL_DESIGN.md Section 12, adapted for SQLite:
// ENUM -> TEXT + CHECK, AUTO_INCREMENT -> INTEGER PRIMARY KEY AUTOINCREMENT,
// DATETIME/JSON -> TEXT. Only the shared foundation + Developer 1
// (Compliance Content Management) tables are created here; work_permits,
// review_requests, and newsletters/detected_updates belong to the other
// three developers and are left for their own backend work.
db.exec(`
  CREATE TABLE IF NOT EXISTS countries (
    country_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    country_code  TEXT NOT NULL UNIQUE,
    country_name  TEXT NOT NULL,
    region        TEXT,
    currency_code TEXT,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    user_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name       TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL CHECK(role IN ('compliance','sales','customer_service','admin')),
    is_active       INTEGER NOT NULL DEFAULT 1,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    last_login_at   TEXT,
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS compliance_records (
    record_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    country_id     INTEGER NOT NULL REFERENCES countries(country_id),
    category       TEXT NOT NULL CHECK(category IN (
                     'LABOUR_LAW','SOCIAL_INSURANCE','WICA','TERMINATION',
                     'ANNUAL_LEAVE','SICK_LEAVE','MATERNITY_PATERNITY',
                     'WORKING_HOURS','STATUTORY_BENEFIT','GENERAL_GUIDELINE','OTHER')),
    title          TEXT NOT NULL,
    summary        TEXT,
    full_text      TEXT,
    worker_type    TEXT NOT NULL DEFAULT 'ALL_EMPLOYEES'
                     CHECK(worker_type IN ('LOCAL','FOREIGN_WORKER','EXPATRIATE','ALL_EMPLOYEES')),
    visibility     TEXT NOT NULL DEFAULT 'INTERNAL_STAFF'
                     CHECK(visibility IN ('COMPLIANCE_ONLY','INTERNAL_STAFF','CLIENT_SHAREABLE')),
    effective_date TEXT,
    source_url     TEXT,
    version        INTEGER NOT NULL DEFAULT 1,
    status         TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','ARCHIVED')),
    created_by     INTEGER REFERENCES users(user_id),
    updated_by     INTEGER REFERENCES users(user_id),
    created_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_rec_country ON compliance_records(country_id);
  CREATE INDEX IF NOT EXISTS idx_rec_category ON compliance_records(category);
  CREATE INDEX IF NOT EXISTS idx_rec_status ON compliance_records(status);
  CREATE INDEX IF NOT EXISTS idx_rec_worker ON compliance_records(worker_type);
  CREATE INDEX IF NOT EXISTS idx_rec_visibility ON compliance_records(visibility);

  -- Deliberately free-text rate/cap fields (not numeric) per HLD risk R5:
  -- real-world benefit data ("Social 4.24% + Pension 2% capped at IDR 11m")
  -- doesn't fit clean numeric columns without losing conditions/notes.
  CREATE TABLE IF NOT EXISTS benefit_components (
    component_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id         INTEGER NOT NULL REFERENCES compliance_records(record_id) ON DELETE CASCADE,
    component_name    TEXT NOT NULL,
    worker_type       TEXT NOT NULL DEFAULT 'ALL_EMPLOYEES'
                        CHECK(worker_type IN ('LOCAL','FOREIGN_WORKER','EXPATRIATE','ALL_EMPLOYEES')),
    employer_rate      TEXT,
    employee_rate      TEXT,
    cap_ceiling        TEXT,
    calculation_basis  TEXT,
    notes              TEXT,
    sort_order         INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_comp_record ON benefit_components(record_id);

  CREATE TABLE IF NOT EXISTS record_attachments (
    attachment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id     INTEGER NOT NULL REFERENCES compliance_records(record_id) ON DELETE CASCADE,
    file_name     TEXT NOT NULL,
    file_path     TEXT NOT NULL,
    file_type     TEXT,
    uploaded_by   INTEGER REFERENCES users(user_id),
    uploaded_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_att_record ON record_attachments(record_id);

  CREATE TABLE IF NOT EXISTS audit_logs (
    log_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER REFERENCES users(user_id),
    action      TEXT NOT NULL CHECK(action IN ('create','update','archive','login','logout','publish')),
    entity_type TEXT NOT NULL,
    entity_id   INTEGER,
    old_value   TEXT,
    new_value   TEXT,
    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
`);

module.exports = db;
