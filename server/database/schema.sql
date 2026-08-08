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

-- Review & Approval Workflow (Developer 3) — SQLite schema for local development.
--
-- Mirrors the review_requests fields from docs/database/schema.sql (the MySQL
-- design), trimmed to what basic CRUD needs:
--   - submitted_by / reviewed_by / submitted_at / reviewed_at / published_at
--     are part of the Phase 3 state-machine + notifications enhancement and
--     are intentionally not created yet (out of scope for this basic CRUD pass).
--   - review_comments / notifications are also Phase 3 and not created yet.
--   - target_id's foreign key is enforced in the application layer, same as
--     the MySQL design (target_type is polymorphic across two tables).
--
-- This file is safe to re-run: every statement is guarded with IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS review_requests (
  request_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type    TEXT NOT NULL
                   CHECK (target_type IN ('compliance_record','work_permit')),
  target_id      INTEGER NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  review_status  TEXT NOT NULL DEFAULT 'PENDING'
                   CHECK (review_status IN ('PENDING','IN_REVIEW','APPROVED','CHANGES_REQUESTED','REJECTED','ARCHIVED')),
  submitted_by   TEXT,
  reviewed_by    TEXT,
  submitted_at   TEXT,
  reviewed_at    TEXT,
  published_at   TEXT,
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_review_requests_status ON review_requests (review_status);
CREATE INDEX IF NOT EXISTS idx_review_requests_target ON review_requests (target_type, target_id);

CREATE TABLE IF NOT EXISTS review_comments (
  comment_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id  INTEGER NOT NULL,
  author_name TEXT NOT NULL,
  comment     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  FOREIGN KEY (request_id) REFERENCES review_requests(request_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id      INTEGER,
  recipient       TEXT NOT NULL DEFAULT 'Compliance Team',
  message         TEXT NOT NULL,
  is_read         INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  FOREIGN KEY (request_id) REFERENCES review_requests(request_id)
);

CREATE TABLE IF NOT EXISTS record_versions (
  version_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  target_type  TEXT NOT NULL,
  target_id    INTEGER NOT NULL,
  version      INTEGER NOT NULL,
  snapshot     TEXT NOT NULL,
  published_at TEXT NOT NULL,
  review_id    INTEGER NOT NULL,
  UNIQUE (target_type, target_id, version),
  FOREIGN KEY (review_id) REFERENCES review_requests(request_id)
);

CREATE INDEX IF NOT EXISTS idx_review_comments_request ON review_comments (request_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_record_versions_target ON record_versions (target_type, target_id);
