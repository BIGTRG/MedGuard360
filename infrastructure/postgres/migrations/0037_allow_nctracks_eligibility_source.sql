-- Allow NCTracks 270/271 eligibility checks to persist with their source.

ALTER TABLE eligibility_checks
  DROP CONSTRAINT IF EXISTS eligibility_checks_source_check,
  ADD CONSTRAINT eligibility_checks_source_check
    CHECK (source IN ('mmis_270_271','nctracks_270_271','cache','ai_prediction','manual'));
