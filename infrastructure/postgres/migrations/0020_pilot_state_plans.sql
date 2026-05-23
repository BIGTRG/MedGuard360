-- Seed Phase 1 (NC, SC, GA) Medicaid managed-care plans.
-- Source: integrations/nc-enterprise/, sc-enterprise/, ga-enterprise/ research.
-- Plan IDs are placeholder payer IDs; real 5010 payer IDs to be sourced from
-- each plan's companion guide during onboarding.

-- Add columns the research highlighted as required for billing routing.
ALTER TABLE state_configs
  ADD COLUMN IF NOT EXISTS mac_part_a_b text,         -- Medicare Part A/B MAC
  ADD COLUMN IF NOT EXISTS mac_dmepos   text,         -- DMEPOS MAC jurisdiction
  ADD COLUMN IF NOT EXISTS hie_name     text,
  ADD COLUMN IF NOT EXISTS hie_vendor   text,
  ADD COLUMN IF NOT EXISTS expansion_status text;     -- expanded | not_expanded | partial

ALTER TABLE mco_registry
  ADD COLUMN IF NOT EXISTS plan_type    text,         -- standard | tailored | foster_care | specialty | cmo
  ADD COLUMN IF NOT EXISTS launch_date  date,
  ADD COLUMN IF NOT EXISTS sunset_date  date,
  ADD COLUMN IF NOT EXISTS notes        text;

-- Update existing state rows with researched values
UPDATE state_configs SET
  mac_part_a_b     = 'Palmetto GBA (JM)',
  mac_dmepos       = 'CGS Administrators (Jurisdiction C)',
  hie_name         = 'NC HealthConnex',
  hie_vendor       = 'SAS Institute',
  expansion_status = 'expanded',
  hub_phone_number = '1-833-870-5500'
WHERE state_code = 'NC';

UPDATE state_configs SET
  mac_part_a_b     = 'Palmetto GBA (JM)',
  mac_dmepos       = 'CGS Administrators (Jurisdiction C)',
  hie_name         = 'SC Health Information Exchange (SCHIEx)',
  hie_vendor       = 'CRISP',
  expansion_status = 'not_expanded'
WHERE state_code = 'SC';

UPDATE state_configs SET
  mac_part_a_b     = 'Palmetto GBA (JJ)',
  mac_dmepos       = 'CGS Administrators (Jurisdiction C)',
  hie_name         = 'Georgia Health Information Network (GaHIN)',
  hie_vendor       = 'GaHIN / Audacious Inquiry',
  expansion_status = 'partial'   -- Pathways to Coverage 1115 waiver
WHERE state_code = 'GA';

-- =====================================================
-- NC Standard Plans (5, dropping to 4 in 2026-04 when Carolina Complete Health absorbs WellCare)
-- =====================================================
INSERT INTO mco_registry (state_code, mco_name, mco_tax_id, payer_id, plan_type, launch_date, notes, active) VALUES
  ('NC', 'AmeriHealth Caritas NC',        'NC-AMERIHEALTH',  'NC_SP_AMERIHEALTH', 'standard', '2021-07-01', 'NC Medicaid Managed Care Standard Plan',                           TRUE),
  ('NC', 'Healthy Blue (Blue Cross NC)',  'NC-HEALTHYBLUE',  'NC_SP_HEALTHYBLUE', 'standard', '2021-07-01', 'NC Medicaid Managed Care Standard Plan',                           TRUE),
  ('NC', 'UnitedHealthcare Community Plan of NC','NC-UHC',   'NC_SP_UHC',         'standard', '2021-07-01', 'NC Medicaid Managed Care Standard Plan',                           TRUE),
  ('NC', 'WellCare of NC',                'NC-WELLCARE',     'NC_SP_WELLCARE',    'standard', '2021-07-01', 'Standard Plan — being absorbed by Carolina Complete Health 2026-04-01', TRUE),
  ('NC', 'Carolina Complete Health',      'NC-CCH',          'NC_SP_CCH',         'standard', '2021-07-01', 'Standard Plan — Regions 3/4/5; absorbing WellCare 2026-04-01',     TRUE)
ON CONFLICT (state_code, mco_tax_id) DO NOTHING;

-- NC Tailored Plans (4, launched 2024-07-01 after LME consolidation)
INSERT INTO mco_registry (state_code, mco_name, mco_tax_id, payer_id, plan_type, launch_date, notes, active) VALUES
  ('NC', 'Alliance Health',               'NC-ALLIANCE',     'NC_TP_ALLIANCE',    'tailored', '2024-07-01', 'BH/IDD/TBI Tailored Plan',                                          TRUE),
  ('NC', 'Partners Health Management',    'NC-PARTNERS',     'NC_TP_PARTNERS',    'tailored', '2024-07-01', 'BH/IDD/TBI Tailored Plan',                                          TRUE),
  ('NC', 'Trillium Health Resources',     'NC-TRILLIUM',     'NC_TP_TRILLIUM',    'tailored', '2024-07-01', 'BH/IDD/TBI Tailored Plan — absorbed Eastpointe',                    TRUE),
  ('NC', 'Vaya Total Care',               'NC-VAYA',         'NC_TP_VAYA',        'tailored', '2024-07-01', 'BH/IDD/TBI Tailored Plan',                                          TRUE)
ON CONFLICT (state_code, mco_tax_id) DO NOTHING;

-- NC Foster Care Specialty Plan (launched 2025-12-01)
INSERT INTO mco_registry (state_code, mco_name, mco_tax_id, payer_id, plan_type, launch_date, notes, active) VALUES
  ('NC', 'Healthy Blue Care Together',    'NC-HBCT',         'NC_FCSP_HBCT',      'foster_care', '2025-12-01', 'NC Children & Families Specialty Plan (~32K enrollees)',         TRUE),
  ('NC', 'EBCI Tribal Option',            'NC-EBCI',         'NC_EBCI',           'specialty',   '2022-10-01', 'Eastern Band of Cherokee Indians tribal option',                  TRUE)
ON CONFLICT (state_code, mco_tax_id) DO NOTHING;

-- =====================================================
-- SC Healthy Connections Choices (Medicaid Managed Care)
-- =====================================================
INSERT INTO mco_registry (state_code, mco_name, mco_tax_id, payer_id, plan_type, notes, active) VALUES
  ('SC', 'Healthy Blue of SC',                  'SC-HEALTHYBLUE','SC_MCO_HEALTHYBLUE','standard', 'SC Healthy Connections Choices MCO', TRUE),
  ('SC', 'Absolute Total Care',                 'SC-ATC',        'SC_MCO_ATC',        'standard', 'Centene-owned SC MCO',               TRUE),
  ('SC', 'First Choice by Select Health',       'SC-SELECTHEALTH','SC_MCO_SELECTHEALTH','standard','SC MCO',                            TRUE),
  ('SC', 'Humana Healthy Horizons in SC',       'SC-HUMANA',     'SC_MCO_HUMANA',     'standard', 'SC MCO',                             TRUE),
  ('SC', 'Molina Healthcare of SC',             'SC-MOLINA',     'SC_MCO_MOLINA',     'standard', 'SC MCO',                             TRUE)
ON CONFLICT (state_code, mco_tax_id) DO NOTHING;

-- =====================================================
-- GA Families CMOs (Care Management Organizations)
-- =====================================================
INSERT INTO mco_registry (state_code, mco_name, mco_tax_id, payer_id, plan_type, notes, active) VALUES
  ('GA', 'Amerigroup Community Care',           'GA-AMERIGROUP', 'GA_CMO_AMERIGROUP', 'cmo', 'GA Families CMO (Elevance Health)',  TRUE),
  ('GA', 'CareSource',                          'GA-CARESOURCE', 'GA_CMO_CARESOURCE', 'cmo', 'GA Families CMO',                     TRUE),
  ('GA', 'Peach State Health Plan',             'GA-PEACHSTATE', 'GA_CMO_PEACHSTATE', 'cmo', 'GA Families CMO (Centene)',           TRUE),
  ('GA', 'Wellpoint of GA',                     'GA-WELLPOINT',  'GA_CMO_WELLPOINT',  'cmo', 'GA Families CMO',                     TRUE)
ON CONFLICT (state_code, mco_tax_id) DO NOTHING;

-- Audit
SELECT 'pilot state plans seeded' AS status, state_code, COUNT(*) AS plans
  FROM mco_registry WHERE state_code IN ('NC','SC','GA') GROUP BY state_code ORDER BY state_code;
