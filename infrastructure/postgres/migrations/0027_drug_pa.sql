-- Drug PA scaffolding — CMS-0062-P (proposed rule 2026-04-10), effective 2027-10-01.
-- Extends electronic PA to drugs covered under the pharmacy benefit. Uses
-- NCPDP SCRIPT 2017071 messaging instead of FHIR PAS (pharmacy industry standard).
--
-- Strategy: drug PAs live in the existing pa_requests table (already has
-- service_code_type = 'NDC' as a valid value). We add a few drug-specific
-- columns and helper tables for formulary tier + step therapy.

-- Drug-specific PA fields
ALTER TABLE pa_requests
  ADD COLUMN IF NOT EXISTS days_supply         integer,
  ADD COLUMN IF NOT EXISTS quantity            numeric,
  ADD COLUMN IF NOT EXISTS pharmacy_provider_id uuid,
  ADD COLUMN IF NOT EXISTS prior_drug_trials   jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS formulary_tier      text,
  ADD COLUMN IF NOT EXISTS step_therapy_required boolean DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS payer_denial_reason text,
  ADD COLUMN IF NOT EXISTS ncpdp_message_id   text;

-- Tighten drug PA SLA: 24-hour standard (stricter than procedure PA at 7 days)
-- - existing computeDueAt() helper in prior-auth-service already handles urgency='drug' → +24h

-- Drug formulary tier per state (or per payer). Used by formulary tier check
-- before a PA is even required.
CREATE TABLE IF NOT EXISTS drug_formulary (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payer_id           text NOT NULL,
  state_code         varchar(2) NOT NULL,
  ndc_code           varchar(11) NOT NULL,
  drug_name          text NOT NULL,
  tier               text NOT NULL CHECK (tier IN ('preferred','non_preferred','specialty','excluded')),
  prior_auth_required boolean NOT NULL DEFAULT FALSE,
  step_therapy_required boolean NOT NULL DEFAULT FALSE,
  quantity_limit     numeric,
  copay_cents        integer,
  effective_from     date NOT NULL DEFAULT CURRENT_DATE,
  effective_to       date,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payer_id, ndc_code, effective_from)
);

CREATE INDEX IF NOT EXISTS drug_formulary_ndc_idx   ON drug_formulary(ndc_code);
CREATE INDEX IF NOT EXISTS drug_formulary_payer_idx ON drug_formulary(payer_id);

DROP TRIGGER IF EXISTS drug_formulary_set_updated_at ON drug_formulary;
CREATE TRIGGER drug_formulary_set_updated_at BEFORE UPDATE ON drug_formulary
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed a few common Phase-1 NC Medicaid formulary entries so the demo works
INSERT INTO drug_formulary (payer_id, state_code, ndc_code, drug_name, tier, prior_auth_required, step_therapy_required, copay_cents) VALUES
  ('NC_MEDICAID', 'NC', '00378-1810-93', 'Lisinopril 20 mg tab',           'preferred',     FALSE, FALSE, 0),
  ('NC_MEDICAID', 'NC', '00781-1506-10', 'Metformin 500 mg tab',           'preferred',     FALSE, FALSE, 0),
  ('NC_MEDICAID', 'NC', '50242-040-60',  'Humira 40 mg pen',               'specialty',     TRUE,  TRUE,  10000),
  ('NC_MEDICAID', 'NC', '57894-150-01',  'Stelara 90 mg inj',              'specialty',     TRUE,  TRUE,  10000),
  ('NC_MEDICAID', 'NC', '00310-0751-30', 'Trulicity 1.5 mg pen',           'non_preferred', TRUE,  TRUE,  5000),
  ('NC_MEDICAID', 'NC', '00069-1086-30', 'Eliquis 5 mg tab',               'non_preferred', TRUE,  FALSE, 5000),
  ('NC_MEDICAID', 'NC', '00006-5266-01', 'Ozempic 1 mg pen',               'specialty',     TRUE,  TRUE,  10000)
ON CONFLICT DO NOTHING;

SELECT 'drug PA schema ready' AS status,
       (SELECT COUNT(*) FROM drug_formulary WHERE state_code = 'NC') AS nc_formulary_seeded;
