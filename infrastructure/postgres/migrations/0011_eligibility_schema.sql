-- eligibility-service tables — migration 0011

CREATE TABLE IF NOT EXISTS eligibility_checks (
  id                     uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id             uuid NOT NULL,
  state_code             varchar(2) NOT NULL,
  payer_id               text NOT NULL,
  coverage_type          text NOT NULL,                          -- medicaid|medicare|chip|commercial
  source                 text NOT NULL CHECK (source IN ('mmis_270_271','cache','ai_prediction','manual')),
  active                 boolean NOT NULL,                        -- is patient currently eligible?
  effective_from         date,
  effective_to           date,
  plan_name              text,
  copay_cents            integer,
  deductible_remaining_cents integer,
  details                jsonb NOT NULL DEFAULT '{}'::jsonb,      -- full 271 response or AI breakdown
  checked_at             timestamptz NOT NULL DEFAULT now(),
  ttl_until              timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  requested_by           uuid NOT NULL REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS elig_patient_idx ON eligibility_checks(patient_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS elig_cache_idx   ON eligibility_checks(patient_id, payer_id, state_code) WHERE ttl_until > now();

ALTER TABLE eligibility_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS elig_read ON eligibility_checks;
CREATE POLICY elig_read ON eligibility_checks FOR SELECT USING (
  app_role_is_cross_state()
  OR (app_current_role() IN ('state_medicaid_agency','mco_admin','billing_manager',
                              'individual_provider','facility_provider','prior_auth_specialist')
      AND state_code = COALESCE(app_current_state_code(), state_code))
  OR (app_current_role() = 'patient' AND patient_id = app_current_user_id())
);
DROP POLICY IF EXISTS elig_write ON eligibility_checks;
CREATE POLICY elig_write ON eligibility_checks FOR ALL USING (
  app_role_is_cross_state()
  OR app_current_role() IN ('individual_provider','facility_provider','billing_manager','platform_administrator')
) WITH CHECK (
  app_role_is_cross_state()
  OR app_current_role() IN ('individual_provider','facility_provider','billing_manager','platform_administrator')
);
