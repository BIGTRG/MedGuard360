-- 0021_ga_cmo_update.sql
-- Georgia Families / Georgia Families 360 CMO procurement update.
-- See integrations/ga-enterprise/PROCUREMENT-STATUS.md (snapshot 2026-05-22).
--
-- Background:
--   GA DCH NOIA (2024-12-02) awarded GF / GF 360 contracts to CareSource (retained),
--   Humana, Molina, and UnitedHealthcare. Amerigroup (Elevance / "Wellpoint of GA")
--   and Peach State Health Plan (Centene) lost. Protests by Amerigroup and Peach State
--   were denied 2025-11-10 and a hearing officer upheld the denials in December 2025.
--   Amerigroup and Peach State have bridge extensions through 2026-06-30.
--   Incoming CMOs target launch 2026-07-01.
--
-- This migration:
--   1. Marks outgoing CMOs with sunset_date = 2026-06-30 (kept active=true until cutover;
--      a follow-up cutover script will flip active=false on 2026-07-01).
--   2. Inserts the three incoming CMOs with launch_date = 2026-07-01 and active=false
--      so they appear in the registry but are not yet routable.
--   3. Annotates CareSource as the sole retained incumbent.
--   4. Adds plan_type='foster_care' rows where the GF 360 carve-out applies.
--
-- IMPORTANT: do NOT delete the outgoing CMO rows. Retro 835s, corrected claims, and
-- timely-filing appeals will continue to reference Amerigroup/Wellpoint and Peach State
-- payer IDs for at least 24 months after sunset.

BEGIN;

-- 1. Sunset outgoing GA CMOs (still active through 2026-06-30 bridge period)
UPDATE mco_registry SET
  sunset_date = DATE '2026-06-30',
  notes = 'GA Families CMO (Elevance Health / Wellpoint rebrand). Lost 2024-12-02 GA Families re-procurement; protest denied 2025-11-10, upheld Dec 2025. Bridge extension through 2026-06-30. Foster-care GF 360 portion transfers to UnitedHealthcare 2026-07-01.'
WHERE state_code = 'GA' AND mco_tax_id = 'GA-AMERIGROUP';

UPDATE mco_registry SET
  sunset_date = DATE '2026-06-30',
  notes = 'GA Families CMO (Elevance Health). Wellpoint is the Elevance rebrand of Amerigroup; treated as same entity. Lost 2024-12-02 re-procurement. Bridge extension through 2026-06-30.'
WHERE state_code = 'GA' AND mco_tax_id = 'GA-WELLPOINT';

UPDATE mco_registry SET
  sunset_date = DATE '2026-06-30',
  notes = 'GA Families CMO (Centene). Lost 2024-12-02 GA Families re-procurement; protest denied 2025-11-10, upheld Dec 2025. Bridge extension through 2026-06-30. Open Records Act suit pending in Fulton County Superior Court.'
WHERE state_code = 'GA' AND mco_tax_id = 'GA-PEACHSTATE';

-- CareSource: sole returning incumbent, no sunset; annotate retention.
UPDATE mco_registry SET
  notes = 'GA Families CMO. Sole returning incumbent under 2024-12-02 NOIA. Continues without interruption; new contract term begins 2026-07-01 alongside Humana / Molina / UnitedHealthcare.'
WHERE state_code = 'GA' AND mco_tax_id = 'GA-CARESOURCE';

-- 2. Insert incoming GA Families CMOs (pre-launch, inactive until 2026-07-01 cutover)
INSERT INTO mco_registry (state_code, mco_name, mco_tax_id, payer_id, plan_type, launch_date, notes, active) VALUES
  ('GA', 'Humana Healthy Horizons in GA',         'GA-HUMANA',  'GA_CMO_HUMANA',  'cmo',         DATE '2026-07-01', 'GA Families CMO. NOIA winner 2024-12-02; protests denied; targeted go-live 2026-07-01.',                                                    FALSE),
  ('GA', 'Molina Healthcare of GA',               'GA-MOLINA',  'GA_CMO_MOLINA',  'cmo',         DATE '2026-07-01', 'GA Families CMO. NOIA winner 2024-12-02; targeted go-live 2026-07-01.',                                                                       FALSE),
  ('GA', 'UnitedHealthcare Community Plan of GA', 'GA-UHC',     'GA_CMO_UHC',     'cmo',         DATE '2026-07-01', 'GA Families CMO. NOIA winner 2024-12-02; targeted go-live 2026-07-01. Also takes GA Families 360 foster-care contract from Amerigroup.', FALSE)
ON CONFLICT (state_code, mco_tax_id) DO NOTHING;

-- 3. Foster-care (GA Families 360) carve-out rows.
--    Amerigroup has been the sole GF 360 CMO since 2014-03-03; UHC takes over 2026-07-01.
INSERT INTO mco_registry (state_code, mco_name, mco_tax_id, payer_id, plan_type, launch_date, sunset_date, notes, active) VALUES
  ('GA', 'Amerigroup GA Families 360 (foster care)',          'GA-AMERIGROUP-360', 'GA_GF360_AMERIGROUP', 'foster_care', DATE '2014-03-03', DATE '2026-06-30', 'GA Families 360 sole CMO (foster care, adoption assistance, juvenile justice; ~27K members). Loses contract to UHC effective 2026-07-01.', TRUE),
  ('GA', 'UnitedHealthcare GA Families 360 (foster care)',    'GA-UHC-360',        'GA_GF360_UHC',        'foster_care', DATE '2026-07-01', NULL,              'GA Families 360 sole CMO effective 2026-07-01. Replaces Amerigroup. Foster-parent advocates raised continuity-of-care concerns at Dec 2025 hearing.', FALSE)
ON CONFLICT (state_code, mco_tax_id) DO NOTHING;

-- 4. Audit
SELECT 'GA CMO update applied' AS status,
       mco_tax_id,
       plan_type,
       launch_date,
       sunset_date,
       active
  FROM mco_registry
 WHERE state_code = 'GA'
 ORDER BY plan_type, launch_date NULLS FIRST, mco_tax_id;

COMMIT;

-- =====================================================================
-- Companion cutover script (NOT executed here) -- to be run 2026-07-01:
--
--   UPDATE mco_registry SET active = FALSE
--    WHERE state_code = 'GA'
--      AND mco_tax_id IN ('GA-AMERIGROUP','GA-WELLPOINT','GA-PEACHSTATE','GA-AMERIGROUP-360');
--   UPDATE mco_registry SET active = TRUE
--    WHERE state_code = 'GA'
--      AND mco_tax_id IN ('GA-HUMANA','GA-MOLINA','GA-UHC','GA-UHC-360');
--
-- HOLD the cutover if a Fulton County Superior Court TRO or injunction is issued in
-- the pending Peach State or Amerigroup Open Records Act litigation.
-- =====================================================================
