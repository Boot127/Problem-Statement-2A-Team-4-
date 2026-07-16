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
