-- Cleanup migration pt2:
--   1. Widen drug_formulary.ndc_code from varchar(11) to varchar(13) so the
--      standard NDC-11 dashed form (5-4-2 = 11 digits + 2 dashes = 13 chars) fits.
--   2. Re-seed drug_formulary now that the column is wide enough.
--   3. Re-apply the core EHR RLS policies that the first DO block in 0032 missed.
-- Idempotent.

ALTER TABLE drug_formulary  ALTER COLUMN ndc_code TYPE varchar(13);
ALTER TABLE ehr_medications ALTER COLUMN ndc_code TYPE varchar(13);
ALTER TABLE pa_requests     ADD COLUMN IF NOT EXISTS days_supply integer;  -- no-op if 0027 ran; harmless if added twice

INSERT INTO drug_formulary (payer_id, state_code, ndc_code, drug_name, tier, prior_auth_required, step_therapy_required, copay_cents) VALUES
  ('NC_MEDICAID', 'NC', '00378-1810-93', 'Lisinopril 20 mg tab',           'preferred',     FALSE, FALSE, 0),
  ('NC_MEDICAID', 'NC', '00781-1506-10', 'Metformin 500 mg tab',           'preferred',     FALSE, FALSE, 0),
  ('NC_MEDICAID', 'NC', '50242-040-60',  'Humira 40 mg pen',               'specialty',     TRUE,  TRUE,  10000),
  ('NC_MEDICAID', 'NC', '57894-150-01',  'Stelara 90 mg inj',              'specialty',     TRUE,  TRUE,  10000),
  ('NC_MEDICAID', 'NC', '00310-0751-30', 'Trulicity 1.5 mg pen',           'non_preferred', TRUE,  TRUE,  5000),
  ('NC_MEDICAID', 'NC', '00069-1086-30', 'Eliquis 5 mg tab',               'non_preferred', TRUE,  FALSE, 5000),
  ('NC_MEDICAID', 'NC', '00006-5266-01', 'Ozempic 1 mg pen',               'specialty',     TRUE,  TRUE,  10000)
ON CONFLICT (payer_id, ndc_code, effective_from) DO NOTHING;

-- Core EHR RLS policies (the first DO block in 0032 didn't apply these; the
-- second one for BH/home-health/IEP worked fine — copy the same pattern here).
DO $$
DECLARE
  t           text;
  policy_name text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ehr_problems','ehr_medications','ehr_allergies','ehr_immunizations',
    'ehr_vitals','ehr_smoking_status','ehr_lab_results','ehr_imaging_results',
    'ehr_procedures','ehr_care_plans','ehr_patient_instructions'
  ] LOOP
    policy_name := t || '_state_or_patient';
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, t);
    EXECUTE format($p$
      CREATE POLICY %I ON %I FOR ALL USING (
        current_setting('app.current_role', true) = 'platform_administrator'
        OR state_code = current_setting('app.current_state_code', true)
        OR patient_id IN (
          SELECT id FROM patients
           WHERE created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        )
      )
    $p$, policy_name, t);
  END LOOP;
END $$;

SELECT 'cleanup pt2 complete' AS status,
       (SELECT COUNT(*) FROM drug_formulary) AS drug_formulary_rows,
       (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'ehr_%') AS ehr_policies;
