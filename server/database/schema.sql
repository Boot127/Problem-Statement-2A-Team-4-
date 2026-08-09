-- Work Permit Management (Developer 2) — SQLite schema for local development.
--
-- Mirrors the work_permits fields from docs/database/schema.sql (the MySQL
-- design), adapted for SQLite:
--   - ENUM columns become TEXT + CHECK constraints.
--   - country is stored as the code the frontend already uses (country_code
--     TEXT, e.g. 'SG') rather than a normalized countries table with a
--     numeric FK — a shared countries table is shared-foundation work, out
--     of scope for this feature's basic CRUD.
--   - work_permit_steps / permit_documents are intentionally not created yet
--     (out of scope per the current task).
--
-- This file is safe to re-run: every statement is guarded with IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS work_permits (
  permit_id             INTEGER PRIMARY KEY AUTOINCREMENT,
  country_code          TEXT NOT NULL,
  permit_type           TEXT NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT,
  eligibility_criteria  TEXT,
  processing_time_days  INTEGER,
  validity_months       INTEGER,
  government_fee        REAL,
  currency_code         TEXT,
  worker_type           TEXT NOT NULL DEFAULT 'FOREIGN_WORKER'
                          CHECK (worker_type IN ('LOCAL','FOREIGN_WORKER','EXPATRIATE','ALL_EMPLOYEES')),
  visibility            TEXT NOT NULL DEFAULT 'INTERNAL_STAFF'
                          CHECK (visibility IN ('COMPLIANCE_ONLY','INTERNAL_STAFF','CLIENT_SHAREABLE')),
  source_url            TEXT,
  version               INTEGER NOT NULL DEFAULT 1,
  status                TEXT NOT NULL DEFAULT 'DRAFT'
                          CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_work_permits_country ON work_permits (country_code);
CREATE INDEX IF NOT EXISTS idx_work_permits_status ON work_permits (status);

-- ============================================================
-- SHARED FOUNDATION (auth/users, countries, audit log)
-- + DEVELOPER 1 — Compliance Content Management
-- ============================================================
-- Same SQLite-for-local-dev rationale and IF NOT EXISTS safety as above.
-- Unlike work_permits, compliance_records uses a normalized countries table
-- (HLD Section 12 models it that way, and this is genuinely shared-
-- foundation work now that auth/users needs to exist somewhere too) —
-- work_permits' own country_code TEXT column is untouched by this.

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
