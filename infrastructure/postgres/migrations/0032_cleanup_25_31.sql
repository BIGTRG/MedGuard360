-- Cleanup migration: fixes drug_formulary seed (transaction issue in 0027)
-- and applies missing EHR table RLS policies (PL/pgSQL syntax error in 0028).
-- Both are idempotent. Safe to re-run.

-- ─── Re-seed drug_formulary (idempotent via ON CONFLICT) ───────────────────
INSERT INTO drug_formulary (payer_id, state_code, ndc_code, drug_name, tier, prior_auth_required, step_therapy_required, copay_cents) VALUES
  ('NC_MEDICAID', 'NC', '00378-1810-93', 'Lisinopril 20 mg tab',           'preferred',     FALSE, FALSE, 0),
  ('NC_MEDICAID', 'NC', '00781-1506-10', 'Metformin 500 mg tab',           'preferred',     FALSE, FALSE, 0),
  ('NC_MEDICAID', 'NC', '50242-040-60',  'Humira 40 mg pen',               'specialty',     TRUE,  TRUE,  10000),
  ('NC_MEDICAID', 'NC', '57894-150-01',  'Stelara 90 mg inj',              'specialty',     TRUE,  TRUE,  10000),
  ('NC_MEDICAID', 'NC', '00310-0751-30', 'Trulicity 1.5 mg pen',           'non_preferred', TRUE,  TRUE,  5000),
  ('NC_MEDICAID', 'NC', '00069-1086-30', 'Eliquis 5 mg tab',               'non_preferred', TRUE,  FALSE, 5000),
  ('NC_MEDICAID', 'NC', '00006-5266-01', 'Ozempic 1 mg pen',               'specialty',     TRUE,  TRUE,  10000)
ON CONFLICT (payer_id, ndc_code, effective_from) DO NOTHING;

-- ─── EHR RLS policies (one per table, generic state_code OR own-patient) ──
-- 0028's DO block used the wrong FOR-loop syntax for plain VALUES iteration.
-- This rewrite uses unnest() over an array, which is the correct pattern.
DO $$
DECLARE
  t text;
  policy_name text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ehr_problems','ehr_medications','ehr_allergies','ehr_immunizations',
    'ehr_vitals','ehr_smoking_status','ehr_lab_results','ehr_imaging_results',
    'ehr_procedures','ehr_care_plans','ehr_patient_instructions'
  ] LOOP
    policy_name := t || '_state_or_patient';
    -- Drop the policy first so this migration is idempotent
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, t);
    EXECUTE format($p$
      CREATE POLICY %I ON %I FOR ALL USING (
        current_setting('app.current_role', true) = 'platform_administrator'
        OR state_code = current_setting('app.current_state_code', true)
        OR patient_id IN (SELECT id FROM patients WHERE created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      )
    $p$, policy_name, t);
  END LOOP;
END $$;

-- Same for BH / home health / school-based tables created in 0029
DO $$
DECLARE
  t text;
  policy_name text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ehr_bh_assessments','ehr_bh_treatment_plans','ehr_group_therapy_sessions',
    'ehr_part2_consents','ehr_oasis_assessments','ehr_home_health_poc',
    'ehr_home_health_visits','ehr_iep_service_logs'
  ] LOOP
    policy_name := t || '_state_or_patient';
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, t);
    -- ehr_group_therapy_sessions has no patient_id — it has patient_ids[]
    IF t = 'ehr_group_therapy_sessions' THEN
      EXECUTE format($p$
        CREATE POLICY %I ON %I FOR ALL USING (
          current_setting('app.current_role', true) = 'platform_administrator'
          OR state_code = current_setting('app.current_state_code', true)
        )
      $p$, policy_name, t);
    ELSE
      EXECUTE format($p$
        CREATE POLICY %I ON %I FOR ALL USING (
          current_setting('app.current_role', true) = 'platform_administrator'
          OR state_code = current_setting('app.current_state_code', true)
          OR patient_id IN (SELECT id FROM patients WHERE created_by = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
        )
      $p$, policy_name, t);
    END IF;
  END LOOP;
END $$;

SELECT 'cleanup complete' AS status,
       (SELECT COUNT(*) FROM drug_formulary)              AS drug_formulary_rows,
       (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'ehr_%') AS ehr_policies;
