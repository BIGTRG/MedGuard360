-- Allow NCTracks 270/271 results to persist with their distinct provenance.
DO $$
DECLARE
  old_constraint_name text;
BEGIN
  SELECT conname
    INTO old_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'eligibility_checks'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%source%'
    AND pg_get_constraintdef(oid) LIKE '%mmis_270_271%'
  LIMIT 1;

  IF old_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE eligibility_checks DROP CONSTRAINT %I', old_constraint_name);
  END IF;
END $$;

ALTER TABLE eligibility_checks
  ADD CONSTRAINT eligibility_checks_source_check
  CHECK (source IN ('mmis_270_271','nctracks_270_271','cache','ai_prediction','manual'));
