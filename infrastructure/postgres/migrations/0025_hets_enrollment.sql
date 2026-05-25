-- HETS (HIPAA Eligibility Transaction System) compliance.
-- Effective 2026-05-11, CMS requires every Medicare 270/271 submission to
-- carry the originating submitter's HETS UID. Providers must complete an
-- attestation that links their NPI to a HETS Submitter UID before they
-- can run Medicare eligibility checks through that submitter.
--
-- MedGuard360 is the HETS submitter on behalf of contracted providers.
-- Each provider NPI must be attested under MedGuard360's HETS UID before
-- Medicare eligibility checks are routed through this platform.
--
-- Reference: CMS HETS Trading Partner Management System, AAA error code 41.

CREATE TABLE IF NOT EXISTS hets_enrollments (
  id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id              uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  npi                      varchar(10) NOT NULL,
  hets_submitter_uid       text NOT NULL,        -- MedGuard360's HETS UID (from /opt/credential-vault/)
  attestation_status       text NOT NULL DEFAULT 'not_started'
    CHECK (attestation_status IN ('not_started','pending','attested','revoked','rejected')),
  attestation_submitted_at timestamptz,
  attestation_confirmed_at timestamptz,
  attestation_expires_at   timestamptz,
  last_aaa41_at            timestamptz,          -- last time we received AAA error 41 for this NPI
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (npi, hets_submitter_uid)
);

CREATE INDEX IF NOT EXISTS hets_enrollments_npi_idx     ON hets_enrollments(npi);
CREATE INDEX IF NOT EXISTS hets_enrollments_status_idx  ON hets_enrollments(attestation_status);

DROP TRIGGER IF EXISTS hets_enrollments_set_updated_at ON hets_enrollments;
CREATE TRIGGER hets_enrollments_set_updated_at BEFORE UPDATE ON hets_enrollments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: providers + state staff can read their own state's rows; platform_administrator unrestricted.
ALTER TABLE hets_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY hets_enrollments_select ON hets_enrollments FOR SELECT USING (
  current_setting('app.current_role', true) = 'platform_administrator'
  OR provider_id IN (SELECT id FROM providers WHERE state_code = current_setting('app.current_state_code', true))
);

CREATE POLICY hets_enrollments_modify ON hets_enrollments FOR ALL USING (
  current_setting('app.current_role', true) IN ('platform_administrator', 'credentialing_specialist', 'state_medicaid_agency')
);

-- Seed pilot providers (NC/SC/GA) with placeholder HETS UID so they appear
-- in the tracker. Real UID assigned once MedGuard360 receives it from CMS.
INSERT INTO hets_enrollments (provider_id, npi, hets_submitter_uid, attestation_status, notes)
SELECT p.id, p.npi, 'MEDGUARD360_PENDING_UID', 'not_started',
       'Seeded ' || to_char(now(),'YYYY-MM-DD') || ' as part of Phase-1 pilot rollout.'
  FROM providers p
 WHERE p.state_code IN ('NC','SC','GA')
   AND p.status = 'active'
   AND NOT EXISTS (
     SELECT 1 FROM hets_enrollments h
      WHERE h.npi = p.npi AND h.hets_submitter_uid = 'MEDGUARD360_PENDING_UID'
   );

SELECT 'HETS enrollment table ready' AS status,
       (SELECT COUNT(*) FROM hets_enrollments) AS enrollments_seeded;
