-- Allow persisted NCTracks 270/271 eligibility responses.
--
-- The NC Medicaid adapter records payer provenance as nctracks_270_271.
-- Without this value in the CHECK constraint, valid NCTracks results are
-- rejected and the route can incorrectly fall back to AI prediction.

ALTER TABLE eligibility_checks
  DROP CONSTRAINT IF EXISTS eligibility_checks_source_check;

ALTER TABLE eligibility_checks
  ADD CONSTRAINT eligibility_checks_source_check
  CHECK (source IN ('mmis_270_271','nctracks_270_271','cache','ai_prediction','manual'));
