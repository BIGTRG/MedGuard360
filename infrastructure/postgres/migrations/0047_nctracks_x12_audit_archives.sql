-- Manifest table for NCTracks X12 cold-storage archive batches.

CREATE TABLE IF NOT EXISTS nctracks_x12_audit_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL UNIQUE,
  record_count INTEGER NOT NULL CHECK (record_count > 0),
  oldest_recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  newest_recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  archive_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS nctracks_x12_audit_archives_archived_idx
  ON nctracks_x12_audit_archives(archived_at DESC);

ALTER TABLE nctracks_x12_audit_archives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nctracks_x12_audit_archives_read ON nctracks_x12_audit_archives;
CREATE POLICY nctracks_x12_audit_archives_read ON nctracks_x12_audit_archives FOR SELECT USING (
  app_role_is_cross_state()
  OR app_current_role() IN ('platform_administrator', 'compliance_officer', 'state_medicaid_agency')
);
