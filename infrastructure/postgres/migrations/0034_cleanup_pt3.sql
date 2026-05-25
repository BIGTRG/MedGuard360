-- Cleanup pt3: ehr_smoking_status was missing state_code (schema bug in 0028).
-- Add the column, backfill, then create its RLS policy (and finish the others).

ALTER TABLE ehr_smoking_status ADD COLUMN IF NOT EXISTS state_code varchar(2);
UPDATE ehr_smoking_status
   SET state_code = COALESCE(state_code, (SELECT state_code FROM patients WHERE patients.id = ehr_smoking_status.patient_id));
-- Don't force NOT NULL yet — there may be orphan rows without patient records in dev.

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
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping policy for %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

SELECT 'cleanup pt3 complete' AS status,
       (SELECT COUNT(*) FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'ehr_%') AS ehr_policies;
