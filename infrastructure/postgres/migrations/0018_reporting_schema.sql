-- reporting-service tables — migration 0018
-- Materialized aggregates + on-demand report jobs.

CREATE TABLE IF NOT EXISTS report_jobs (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_code         varchar(2) NOT NULL,
  kind               text NOT NULL CHECK (kind IN ('perm','fraud_summary','claims_volume','denial_pattern','custom')),
  requested_by       uuid NOT NULL REFERENCES users(id),
  parameters         jsonb NOT NULL DEFAULT '{}'::jsonb,
  status             text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','complete','failed')),
  result             jsonb,
  rows_count         integer,
  error              text,
  started_at         timestamptz,
  completed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS report_jobs_state_idx ON report_jobs(state_code, kind, created_at DESC);

DROP TRIGGER IF EXISTS report_jobs_set_updated_at ON report_jobs;
CREATE TRIGGER report_jobs_set_updated_at BEFORE UPDATE ON report_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Pre-computed daily rollups for dashboards.
CREATE TABLE IF NOT EXISTS daily_rollups (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_code         varchar(2) NOT NULL,
  metric             text NOT NULL,                        -- 'claims_submitted','claims_paid','fraud_auto_blocked', etc.
  day                date NOT NULL,
  value              numeric(20,2) NOT NULL,
  details            jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (state_code, metric, day)
);
CREATE INDEX IF NOT EXISTS daily_rollups_lookup ON daily_rollups(state_code, metric, day DESC);

ALTER TABLE report_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS report_jobs_all ON report_jobs;
CREATE POLICY report_jobs_all ON report_jobs FOR ALL USING (
  app_role_is_cross_state()
  OR (state_code = app_current_state_code()
      AND app_current_role() IN ('state_medicaid_agency','mco_admin','compliance_officer','qa_auditor','platform_administrator'))
) WITH CHECK (
  app_role_is_cross_state()
  OR app_current_role() IN ('state_medicaid_agency','mco_admin','compliance_officer','qa_auditor','platform_administrator')
);

ALTER TABLE daily_rollups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS daily_rollups_read ON daily_rollups;
CREATE POLICY daily_rollups_read ON daily_rollups FOR SELECT USING (
  app_role_is_cross_state()
  OR state_code = app_current_state_code()
);
DROP POLICY IF EXISTS daily_rollups_write ON daily_rollups;
CREATE POLICY daily_rollups_write ON daily_rollups FOR INSERT WITH CHECK (true);
