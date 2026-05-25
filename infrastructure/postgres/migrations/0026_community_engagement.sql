-- Community Engagement Verification — WFTC H.R. 1 / P.L. 119-21.
-- Medicaid expansion enrollees age 19-64 must verify 80 hrs/mo of engagement
-- (work, school, volunteer, etc.) or qualifying exemption. Mandatory by 2027-01-01.
-- Renewal every 6 months. 60/30/7-day pre-deadline alerts via notification-service.

CREATE TABLE IF NOT EXISTS community_engagement_records (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id               uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  state_code               varchar(2) NOT NULL,
  reporting_period         text NOT NULL,   -- YYYY-MM
  hours_documented         integer NOT NULL DEFAULT 0,
  engagement_type          text NOT NULL CHECK (engagement_type IN (
    'employed','self_employed','job_training','education','volunteer','caregiving',
    'medically_exempt','disabled_exempt','pregnant_exempt','age_exempt_under19',
    'age_exempt_over64','tribal_exempt'
  )),
  exemption_code           text CHECK (exemption_code IS NULL OR exemption_code IN (
    'medical','disability','pregnancy','caregiver','tribal','good_faith_delay'
  )),
  verification_source      text NOT NULL CHECK (verification_source IN (
    'payroll_attestation','employer_attestation','school_enrollment','volunteer_org',
    'medical_provider','tribal_affirmation','self_attestation','irs_data','swic_data'
  )),
  status                   text NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted','verified','rejected','pending_review','expired'
  )),
  verified_at              timestamptz,
  verified_by              uuid REFERENCES users(id),
  next_renewal_due_at      timestamptz NOT NULL,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  created_by               uuid NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS cer_patient_idx ON community_engagement_records(patient_id);
CREATE INDEX IF NOT EXISTS cer_state_idx   ON community_engagement_records(state_code);
CREATE INDEX IF NOT EXISTS cer_status_idx  ON community_engagement_records(status);
CREATE INDEX IF NOT EXISTS cer_renewal_idx ON community_engagement_records(next_renewal_due_at);

DROP TRIGGER IF EXISTS cer_set_updated_at ON community_engagement_records;
CREATE TRIGGER cer_set_updated_at BEFORE UPDATE ON community_engagement_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: patients see own, state staff see state, platform_administrator unrestricted.
ALTER TABLE community_engagement_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY cer_select ON community_engagement_records FOR SELECT USING (
  current_setting('app.current_role', true) = 'platform_administrator'
  OR state_code = current_setting('app.current_state_code', true)
  OR patient_id IN (SELECT id FROM patients WHERE created_by = current_setting('app.current_user_id', true)::uuid)
);
CREATE POLICY cer_modify ON community_engagement_records FOR ALL USING (
  current_setting('app.current_role', true) IN (
    'platform_administrator','state_medicaid_agency','compliance_officer','mco_admin','patient'
  )
);

-- Add per-state community engagement rule config.
ALTER TABLE state_configs
  ADD COLUMN IF NOT EXISTS community_engagement_rules jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Seed defaults for Phase-1 pilot states; expansion state config differs from
-- non-expansion. Per CMS H.R. 1 guidance, lookback 1-3 months at state option.
UPDATE state_configs SET community_engagement_rules = jsonb_build_object(
  'required',               true,
  'lookback_months_required', 1,
  'minimum_hours_per_month', 80,
  'verification_sources',   array['payroll_attestation','employer_attestation','school_enrollment','self_attestation'],
  'implementation_date',    '2027-01-01',
  'renewal_frequency_months', 6,
  'good_faith_delay_active', false,
  'population_age_min',      19,
  'population_age_max',      64
) WHERE state_code = 'NC';

UPDATE state_configs SET community_engagement_rules = jsonb_build_object(
  'required',               false,
  'reason',                 'SC has not expanded Medicaid; H.R. 1 work requirements do not apply.'
) WHERE state_code = 'SC';

UPDATE state_configs SET community_engagement_rules = jsonb_build_object(
  'required',               true,
  'lookback_months_required', 1,
  'minimum_hours_per_month', 80,
  'verification_sources',   array['payroll_attestation','school_enrollment','self_attestation'],
  'implementation_date',    '2027-01-01',
  'renewal_frequency_months', 6,
  'good_faith_delay_active', true,
  'population_age_min',      19,
  'population_age_max',      64,
  'note',                   'GA Pathways to Coverage 1115 waiver has its own engagement rules; H.R. 1 overlay applies to non-Pathways populations.'
) WHERE state_code = 'GA';

SELECT 'community engagement schema ready' AS status,
       (SELECT COUNT(*) FROM state_configs WHERE community_engagement_rules ? 'required') AS states_configured;
