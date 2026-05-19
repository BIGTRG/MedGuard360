-- crisis-service tables — migration 0014

CREATE TABLE IF NOT EXISTS crisis_plans (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id             uuid NOT NULL,
  state_code             varchar(2) NOT NULL,
  created_by_provider_id uuid NOT NULL,
  warning_signs          text[] NOT NULL DEFAULT ARRAY[]::text[],
  internal_coping_strategies text[] NOT NULL DEFAULT ARRAY[]::text[],
  social_supports        jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{name, phone, relationship}]
  professional_supports  jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{name, phone, role}]
  emergency_contacts     jsonb NOT NULL DEFAULT '[]'::jsonb,
  safe_environment_steps text[] NOT NULL DEFAULT ARRAY[]::text[],
  reasons_for_living     text,
  effective_from         date NOT NULL DEFAULT CURRENT_DATE,
  reviewed_at            timestamptz,
  reviewed_by            uuid REFERENCES users(id),
  status                 text NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS crisis_plans_patient_idx ON crisis_plans(patient_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS crisis_plans_state_idx ON crisis_plans(state_code) WHERE status = 'active';

DROP TRIGGER IF EXISTS crisis_plans_set_updated_at ON crisis_plans;
CREATE TRIGGER crisis_plans_set_updated_at BEFORE UPDATE ON crisis_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS crisis_alerts (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          uuid,                                   -- nullable: alerts can come from unknown numbers
  state_code          varchar(2) NOT NULL,
  source              text NOT NULL CHECK (source IN ('clinical_note','hub_chat','sms','self_reported','responder','other')),
  severity            text NOT NULL CHECK (severity IN ('low','moderate','high','critical')),
  signals             jsonb NOT NULL,                         -- output of crisis-detector
  detected_at         timestamptz NOT NULL DEFAULT now(),
  notified_911        boolean NOT NULL DEFAULT FALSE,
  notified_911_at     timestamptz,
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active','responder_dispatched','resolved','false_alarm')),
  detector_engine_version text,
  correlation_id      uuid,
  created_by          uuid REFERENCES users(id),
  resolved_at         timestamptz,
  resolved_by         uuid REFERENCES users(id),
  resolution_notes    text
);
CREATE INDEX IF NOT EXISTS crisis_alerts_state_severity ON crisis_alerts(state_code, severity, status);
CREATE INDEX IF NOT EXISTS crisis_alerts_active_idx ON crisis_alerts(detected_at DESC) WHERE status IN ('active','responder_dispatched');

CREATE TABLE IF NOT EXISTS responder_dispatches (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id            uuid NOT NULL REFERENCES crisis_alerts(id) ON DELETE CASCADE,
  responder_user_id   uuid NOT NULL REFERENCES users(id),
  biometric_verified  boolean NOT NULL,                       -- per CLAUDE.md: 3-second biometric responder access
  accessed_plan       boolean NOT NULL DEFAULT FALSE,
  dispatched_at       timestamptz NOT NULL DEFAULT now(),
  arrived_at          timestamptz,
  closed_at           timestamptz,
  outcome             text                                    -- 'stabilized' | 'transported' | 'declined' | 'unable_to_locate'
);
CREATE INDEX IF NOT EXISTS responder_dispatches_alert_idx ON responder_dispatches(alert_id);

ALTER TABLE crisis_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crisis_plans_read ON crisis_plans;
CREATE POLICY crisis_plans_read ON crisis_plans FOR SELECT USING (
  app_role_is_cross_state()
  OR (app_current_role() = 'patient' AND patient_id = app_current_user_id())
  OR (app_current_role() IN ('individual_provider','facility_provider','prior_auth_specialist','compliance_officer')
      AND state_code = app_current_state_code())
  OR (app_current_role() = 'emergency_responder' AND state_code = app_current_state_code())
);
DROP POLICY IF EXISTS crisis_plans_write ON crisis_plans;
CREATE POLICY crisis_plans_write ON crisis_plans FOR ALL USING (
  app_role_is_cross_state()
  OR app_current_role() IN ('individual_provider','facility_provider','platform_administrator')
) WITH CHECK (
  app_role_is_cross_state()
  OR app_current_role() IN ('individual_provider','facility_provider','platform_administrator')
);

ALTER TABLE crisis_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crisis_alerts_all ON crisis_alerts;
CREATE POLICY crisis_alerts_all ON crisis_alerts FOR ALL USING (
  app_role_is_cross_state()
  OR state_code = app_current_state_code()
) WITH CHECK (
  app_role_is_cross_state()
  OR state_code = app_current_state_code()
);

ALTER TABLE responder_dispatches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS responder_dispatches_all ON responder_dispatches;
CREATE POLICY responder_dispatches_all ON responder_dispatches FOR ALL
  USING (EXISTS (SELECT 1 FROM crisis_alerts a WHERE a.id = alert_id)) WITH CHECK (true);
