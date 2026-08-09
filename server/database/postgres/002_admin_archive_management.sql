ALTER TABLE work_permits
  ADD COLUMN IF NOT EXISTS previous_status VARCHAR(20)
    CHECK (previous_status IN ('DRAFT','PUBLISHED'));

ALTER TABLE work_permits
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_work_permits_archived
  ON work_permits (status, archived_at DESC);
