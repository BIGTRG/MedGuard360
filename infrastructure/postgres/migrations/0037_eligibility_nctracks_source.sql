-- Allow persisted NCTracks 270/271 eligibility results.
ALTER TABLE eligibility_checks
  DROP CONSTRAINT IF EXISTS eligibility_checks_source_check;

ALTER TABLE eligibility_checks
  ADD CONSTRAINT eligibility_checks_source_check
  CHECK (source IN ('mmis_270_271','nctracks_270_271','cache','ai_prediction','manual'));
