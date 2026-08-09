-- Work Permit Management (Developer 2) — SQLite schema for local development.
--
-- Mirrors the work_permits fields from docs/database/schema.sql (the MySQL
-- design), adapted for SQLite:
--   - ENUM columns become TEXT + CHECK constraints.
--   - country is stored as the code the frontend already uses (country_code
--     TEXT, e.g. 'SG') rather than a normalized countries table with a
--     numeric FK — a shared countries table is shared-foundation work, out
--     of scope for this feature's basic CRUD.
--
-- This file is safe to re-run: every statement is guarded with IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS work_permits (
  permit_id             INTEGER PRIMARY KEY AUTOINCREMENT,
  country_code          TEXT NOT NULL,
  permit_type           TEXT NOT NULL,
  title                 TEXT NOT NULL,
  permit_holder_name    TEXT,
  client_company_name   TEXT,
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
  -- Information-health fields. These answer the client's "is this record still
  -- trustworthy?" question, which is separate from the DRAFT/PUBLISHED content
  -- status. Dates are ISO-8601 date strings (YYYY-MM-DD) so they sort and
  -- compare correctly as TEXT in SQLite.
  last_reviewed_at      TEXT,
  next_review_at        TEXT,
  review_notes          TEXT,
  information_status    TEXT NOT NULL DEFAULT 'CURRENT'
                          CHECK (information_status IN ('CURRENT','REVIEW_DUE','OUTDATED','INCOMPLETE')),
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);

-- Existing databases were created before the information-health columns
-- existed, and CREATE TABLE IF NOT EXISTS above will not alter them. The
-- additive migration lives in config/sqliteDb.js so it can inspect
-- PRAGMA table_info first and stay idempotent.

CREATE INDEX IF NOT EXISTS idx_work_permits_country ON work_permits (country_code);
CREATE INDEX IF NOT EXISTS idx_work_permits_status ON work_permits (status);

-- ---------- WORK PERMIT STEPS (ordered process flow, 1:M) ----------
-- New / Renewal / Cancellation are modeled as child PROCESSES of one permit:
-- the ordered steps are grouped by process_type, so a single permit (e.g. '9G')
-- holds up to three step sequences rather than being duplicated as three permits.
CREATE TABLE IF NOT EXISTS work_permit_steps (
  step_id            INTEGER PRIMARY KEY AUTOINCREMENT,
  permit_id          INTEGER NOT NULL,
  process_type       TEXT NOT NULL DEFAULT 'NEW'
                        CHECK (process_type IN ('NEW','RENEWAL','CANCELLATION')),
  step_number        INTEGER NOT NULL,
  step_title         TEXT NOT NULL,
  step_detail        TEXT,
  expected_timeline  TEXT,                            -- e.g. '15 days publication'
  FOREIGN KEY (permit_id) REFERENCES work_permits(permit_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_work_permit_steps_permit
  ON work_permit_steps (permit_id, process_type);

-- ---------- PERMIT DOCUMENTS (required-document checklist, 1:M) ----------
-- Also grouped by process_type: a renewal may require a different checklist
-- from a new application. is_mandatory is INTEGER 0/1 because SQLite has no
-- native BOOLEAN type.
CREATE TABLE IF NOT EXISTS permit_documents (
  document_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  permit_id       INTEGER NOT NULL,
  process_type    TEXT NOT NULL DEFAULT 'NEW'
                     CHECK (process_type IN ('NEW','RENEWAL','CANCELLATION')),
  document_name   TEXT NOT NULL,
  is_mandatory    INTEGER NOT NULL DEFAULT 1 CHECK (is_mandatory IN (0,1)),
  notes           TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (permit_id) REFERENCES work_permits(permit_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_permit_documents_permit
  ON permit_documents (permit_id, process_type);

-- ---------- PERMIT SOURCE DOCUMENTS (uploaded evidence files, 1:M) ----------
-- The official PDF/DOCX a permit record was built from. This is what lets a
-- reader verify the content rather than trusting it, which is the provenance
-- half of the client's "scattered across Word, Excel and PDF" problem.
--
-- SECURITY: original_file_name is untrusted user input and is only ever echoed
-- back as a download filename. stored_file_name is a server-generated random
-- name with a validated extension, and is the ONLY name ever touched on disk.
-- Files live in server/uploads/, outside the client's public folder, and the
-- absolute path is never returned by the API.
CREATE TABLE IF NOT EXISTS permit_source_documents (
  source_document_id  INTEGER PRIMARY KEY AUTOINCREMENT,
  permit_id           INTEGER NOT NULL,
  original_file_name  TEXT NOT NULL,
  stored_file_name    TEXT NOT NULL,
  mime_type           TEXT NOT NULL,
  file_size           INTEGER NOT NULL,
  file_hash           TEXT,                            -- SHA-256, for duplicate detection
  description         TEXT,
  source_type         TEXT NOT NULL DEFAULT 'OFFICIAL_GUIDE'
                        CHECK (source_type IN ('OFFICIAL_GUIDE','LEGISLATION','FORM','CIRCULAR','INTERNAL_NOTE','OTHER')),
  status              TEXT NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE','ARCHIVED')),
  uploaded_by         TEXT,                            -- free text until shared auth exists
  uploaded_at         TEXT NOT NULL,
  FOREIGN KEY (permit_id) REFERENCES work_permits(permit_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_permit_source_documents_permit
  ON permit_source_documents (permit_id, status);

-- ---------- PERMIT GROUPS (client/workspace organisation, M:N) ----------
-- Groups contain references to master permits, never copied permit data.
CREATE TABLE IF NOT EXISTS permit_groups (
  group_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  group_name    TEXT NOT NULL COLLATE NOCASE UNIQUE,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'ACTIVE'
                  CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_permit_groups_status
  ON permit_groups (status, group_name);

CREATE TABLE IF NOT EXISTS permit_group_members (
  group_id    INTEGER NOT NULL,
  permit_id   INTEGER NOT NULL,
  added_at    TEXT NOT NULL,
  PRIMARY KEY (group_id, permit_id),
  FOREIGN KEY (group_id) REFERENCES permit_groups(group_id) ON DELETE CASCADE,
  FOREIGN KEY (permit_id) REFERENCES work_permits(permit_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_permit_group_members_permit
  ON permit_group_members (permit_id, group_id);
