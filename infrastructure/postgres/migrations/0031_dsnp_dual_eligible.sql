-- Dual Eligible Integrated ID Card — CMS CY2026 final rule (effective 2027-01-01).
-- D-SNP plans must use integrated member ID cards covering both Medicare + Medicaid.
-- The platform tracks dual-eligible status and unifies the member's benefits view.

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS dual_eligible          boolean NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dual_eligible_category text CHECK (dual_eligible_category IS NULL OR dual_eligible_category IN (
    'FBDE','QMB','QMB_plus','SLMB','SLMB_plus','QI','QDWI','non_dual'
  )),
  ADD COLUMN IF NOT EXISTS dsnp_plan_payer_id     text,
  ADD COLUMN IF NOT EXISTS integrated_member_id   text,
  ADD COLUMN IF NOT EXISTS dual_eligible_effective_from date,
  ADD COLUMN IF NOT EXISTS dual_eligible_effective_to   date;

CREATE INDEX IF NOT EXISTS patients_dual_idx ON patients(dual_eligible) WHERE dual_eligible = TRUE;
CREATE INDEX IF NOT EXISTS patients_dsnp_payer_idx ON patients(dsnp_plan_payer_id) WHERE dsnp_plan_payer_id IS NOT NULL;

-- Integrated HRA (Health Risk Assessment) — single workflow capturing both
-- Medicare-required and Medicaid-required HRA domains.
CREATE TABLE IF NOT EXISTS dsnp_integrated_hras (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  state_code         varchar(2) NOT NULL,
  dsnp_plan_payer_id text NOT NULL,
  conducted_at       timestamptz NOT NULL DEFAULT now(),
  conducted_by       uuid NOT NULL REFERENCES users(id),

  -- Medicare-required HRA domains
  cognitive_status_score   integer,
  depression_score         integer,        -- e.g. PHQ-2 / PHQ-9 short
  functional_status        jsonb,          -- ADLs, IADLs
  fall_risk_score          integer,
  pain_score_0_10          integer,

  -- Medicaid-required domains (LTSS, social determinants)
  ltss_needs               jsonb,
  housing_status           text,
  food_security            text,
  transportation_needs     text,
  social_support           text,

  -- Care plan triggered by HRA
  care_plan_id             uuid REFERENCES ehr_care_plans(id),
  duplicate_hra_avoided    boolean DEFAULT FALSE,    -- when this single HRA serves both Medicare + Medicaid

  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dsnp_hra_patient_idx ON dsnp_integrated_hras(patient_id, conducted_at DESC);

SELECT 'D-SNP / dual-eligible schema ready' AS status;
