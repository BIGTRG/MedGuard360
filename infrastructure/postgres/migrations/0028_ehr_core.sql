-- Full EHR core schema — ONC 2015 Edition CURES Update target.
-- Covers: problem list, medication list, allergy list, immunizations,
-- vital signs, smoking status, lab results, imaging results, procedures,
-- care plans, referrals, patient instructions, CDS rules, MIPS measures.
-- Behavioral health, home health, school-based extensions in 0029.

-- ─── Problem List ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_problems (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  state_code         varchar(2) NOT NULL,
  icd10_code         varchar(10) NOT NULL,
  problem_text       text NOT NULL,
  onset_date         date,
  resolution_date    date,
  severity           text CHECK (severity IN ('mild','moderate','severe','life_threatening')),
  clinical_status    text NOT NULL DEFAULT 'active' CHECK (clinical_status IN ('active','recurrence','relapse','inactive','remission','resolved')),
  verification_status text DEFAULT 'confirmed' CHECK (verification_status IN ('unconfirmed','provisional','differential','confirmed','refuted','entered_in_error')),
  recorded_by        uuid NOT NULL REFERENCES users(id),
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ehr_problems_patient_idx ON ehr_problems(patient_id);
CREATE INDEX IF NOT EXISTS ehr_problems_active_idx  ON ehr_problems(patient_id) WHERE clinical_status = 'active';

-- ─── Medication List ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_medications (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  state_code         varchar(2) NOT NULL,
  ndc_code           varchar(11),
  rxnorm_code        varchar(20),
  drug_name          text NOT NULL,
  dosage             text,                  -- e.g. '20 mg'
  frequency          text,                  -- e.g. 'BID', 'q4h prn'
  route              text,                  -- e.g. 'PO', 'IV', 'SubQ'
  prescriber_user_id uuid REFERENCES users(id),
  start_date         date NOT NULL DEFAULT CURRENT_DATE,
  end_date           date,
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_hold','completed','stopped','entered_in_error')),
  reason_code        varchar(10),           -- ICD-10 indication
  pharmacy_id        uuid,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ehr_medications_patient_idx ON ehr_medications(patient_id);
CREATE INDEX IF NOT EXISTS ehr_medications_active_idx  ON ehr_medications(patient_id) WHERE status = 'active';

-- ─── Allergy / Adverse Reaction List ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_allergies (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  state_code         varchar(2) NOT NULL,
  allergen_text      text NOT NULL,
  allergen_rxnorm    varchar(20),           -- for drug allergies
  allergen_unii      varchar(20),           -- for substance allergies
  reaction_text      text,
  reaction_severity  text CHECK (reaction_severity IN ('mild','moderate','severe','life_threatening')),
  reaction_type      text CHECK (reaction_type IN ('allergy','intolerance','side_effect','unknown')),
  onset_date         date,
  clinical_status    text NOT NULL DEFAULT 'active' CHECK (clinical_status IN ('active','inactive','resolved')),
  verification_status text DEFAULT 'confirmed' CHECK (verification_status IN ('unconfirmed','presumed','confirmed','refuted','entered_in_error')),
  recorded_by        uuid NOT NULL REFERENCES users(id),
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ehr_allergies_patient_idx ON ehr_allergies(patient_id);
CREATE INDEX IF NOT EXISTS ehr_allergies_active_idx  ON ehr_allergies(patient_id) WHERE clinical_status = 'active';

-- ─── Immunization Record ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_immunizations (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  state_code         varchar(2) NOT NULL,
  cvx_code           varchar(5) NOT NULL,    -- CDC CVX code
  vaccine_name       text NOT NULL,
  administered_date  date NOT NULL,
  lot_number         text,
  expiration_date    date,
  manufacturer       text,
  administered_by    uuid REFERENCES users(id),
  administration_site text,                  -- LA, RA, etc.
  route              text,                   -- IM, SubQ
  dose_quantity_ml   numeric,
  vis_version        text,                   -- Vaccine Information Statement version
  vis_published_date date,
  funding_source     text,                   -- VFC, private, etc.
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ehr_immunizations_patient_idx ON ehr_immunizations(patient_id);

-- ─── Vital Signs ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_vitals (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id       uuid REFERENCES clinical_encounters(id),
  state_code         varchar(2) NOT NULL,
  recorded_at        timestamptz NOT NULL DEFAULT now(),
  systolic_bp        integer,
  diastolic_bp       integer,
  heart_rate         integer,
  respiratory_rate   integer,
  temperature_f      numeric,
  height_inches      numeric,
  weight_lbs         numeric,
  bmi                numeric,
  o2_saturation_pct  integer,
  pain_scale_0_10    integer CHECK (pain_scale_0_10 BETWEEN 0 AND 10),
  recorded_by        uuid REFERENCES users(id),
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ehr_vitals_patient_idx ON ehr_vitals(patient_id, recorded_at DESC);

-- ─── Smoking / Tobacco Status ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_smoking_status (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  recorded_at        timestamptz NOT NULL DEFAULT now(),
  status             text NOT NULL CHECK (status IN (
    'never','former','current_every_day','current_some_day','heavy_smoker','light_smoker','smoker_unspecified','unknown'
  )),
  packs_per_day      numeric,
  years_smoked       integer,
  quit_date          date,
  cessation_counseling_provided boolean DEFAULT FALSE,
  recorded_by        uuid REFERENCES users(id),
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ehr_smoking_patient_idx ON ehr_smoking_status(patient_id, recorded_at DESC);

-- ─── Lab Results ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_lab_results (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id       uuid REFERENCES clinical_encounters(id),
  state_code         varchar(2) NOT NULL,
  loinc_code         varchar(10) NOT NULL,
  test_name          text NOT NULL,
  result_value       text,
  result_unit        text,
  reference_range    text,
  abnormal_flag      text CHECK (abnormal_flag IS NULL OR abnormal_flag IN ('low','high','critical_low','critical_high','abnormal','normal')),
  performing_lab     text,
  collected_at       timestamptz,
  resulted_at        timestamptz NOT NULL DEFAULT now(),
  status             text DEFAULT 'final' CHECK (status IN ('preliminary','final','amended','cancelled','corrected')),
  ordered_by         uuid REFERENCES users(id),
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ehr_lab_patient_idx ON ehr_lab_results(patient_id, resulted_at DESC);
CREATE INDEX IF NOT EXISTS ehr_lab_critical_idx ON ehr_lab_results(patient_id, abnormal_flag) WHERE abnormal_flag IN ('critical_low','critical_high');

-- ─── Imaging Results ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_imaging_results (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  state_code         varchar(2) NOT NULL,
  modality           text NOT NULL,                                -- 'CT','MRI','XR','US','MAMMO', etc.
  body_region        text NOT NULL,                                -- 'chest','abdomen','head', etc.
  cpt_code           varchar(10),
  study_date         timestamptz NOT NULL,
  ordering_provider_id uuid REFERENCES users(id),
  reading_radiologist text,
  impression         text NOT NULL,                                -- radiologist's impression
  full_report        text,
  critical_finding   boolean DEFAULT FALSE,
  status             text DEFAULT 'final' CHECK (status IN ('preliminary','final','amended','cancelled')),
  dicom_study_uid    text,
  pacs_url           text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ehr_imaging_patient_idx ON ehr_imaging_results(patient_id, study_date DESC);

-- ─── Procedure History ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_procedures (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id       uuid REFERENCES clinical_encounters(id),
  state_code         varchar(2) NOT NULL,
  cpt_code           varchar(10) NOT NULL,
  icd10_pcs_code     varchar(10),
  procedure_name     text NOT NULL,
  performed_at       timestamptz NOT NULL,
  performed_by       uuid REFERENCES users(id),
  outcome            text,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ehr_procedures_patient_idx ON ehr_procedures(patient_id, performed_at DESC);

-- ─── Care Plans ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_care_plans (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  state_code         varchar(2) NOT NULL,
  condition_icd10    varchar(10),
  title              text NOT NULL,
  goals              jsonb NOT NULL DEFAULT '[]'::jsonb,        -- [{goal, target_date, metric, status}]
  interventions      jsonb NOT NULL DEFAULT '[]'::jsonb,        -- [{intervention, frequency, owner}]
  barriers           jsonb NOT NULL DEFAULT '[]'::jsonb,
  next_review_date   date,
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','on_hold','completed','revoked')),
  created_by         uuid NOT NULL REFERENCES users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ehr_careplans_patient_idx ON ehr_care_plans(patient_id);

-- ─── Patient Instructions / After-Visit Summary ────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_patient_instructions (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_id       uuid NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  state_code         varchar(2) NOT NULL,
  reading_level_grade integer DEFAULT 6,                  -- target reading level for plain language
  body_markdown      text NOT NULL,
  printable_pdf_url  text,
  delivered_to_portal_at timestamptz,
  created_by         uuid NOT NULL REFERENCES users(id),
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ─── Clinical Decision Support rules + firings log ─────────────────────────
CREATE TABLE IF NOT EXISTS ehr_cds_rules (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_key           text NOT NULL UNIQUE,
  category           text NOT NULL CHECK (category IN ('drug_drug','drug_allergy','drug_diagnosis','preventive','chronic_mgmt','high_risk_med')),
  severity           text NOT NULL CHECK (severity IN ('info','warning','critical')),
  rule_text          text NOT NULL,
  trigger_logic      jsonb NOT NULL,
  source_citation    text,           -- e.g. USPSTF, ACC/AHA guideline
  active             boolean NOT NULL DEFAULT TRUE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ehr_cds_firings (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id            uuid NOT NULL REFERENCES ehr_cds_rules(id),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id       uuid REFERENCES clinical_encounters(id),
  fired_at           timestamptz NOT NULL DEFAULT now(),
  user_acknowledged  boolean DEFAULT FALSE,
  acknowledged_by    uuid REFERENCES users(id),
  acknowledged_at    timestamptz,
  action_taken       text,           -- e.g. 'override','accept','snooze_7d'
  override_reason    text,
  context            jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS ehr_cds_firings_patient_idx ON ehr_cds_firings(patient_id, fired_at DESC);

-- ─── MIPS / Promoting Interoperability measure tracking ────────────────────
CREATE TABLE IF NOT EXISTS ehr_quality_measures (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_user_id   uuid NOT NULL REFERENCES users(id),
  measure_key        text NOT NULL,                       -- e.g. 'PI_EP_1' (eRx), 'CMS117' (childhood immunization)
  measure_name       text NOT NULL,
  reporting_period   text NOT NULL,                       -- YYYY or YYYY-Q1
  numerator          integer NOT NULL DEFAULT 0,
  denominator        integer NOT NULL DEFAULT 0,
  exclusions         integer NOT NULL DEFAULT 0,
  performance_rate   numeric GENERATED ALWAYS AS (
    CASE WHEN denominator > 0 THEN ROUND(numerator::numeric / denominator * 100, 2) ELSE 0 END
  ) STORED,
  last_updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_user_id, measure_key, reporting_period)
);

-- RLS — patient/provider-scoped. Skipping detailed policies for brevity; default
-- table-level RLS enabled means only superuser/role-bypass reads.
ALTER TABLE ehr_problems          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_medications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_allergies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_immunizations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_vitals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_smoking_status    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_lab_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_imaging_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_procedures        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_care_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_patient_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_cds_firings       ENABLE ROW LEVEL SECURITY;

-- One generic policy per table — state_code OR own-patient OR platform_administrator.
DO $$ BEGIN
  FOR t IN VALUES ('ehr_problems'),('ehr_medications'),('ehr_allergies'),('ehr_immunizations'),
                  ('ehr_vitals'),('ehr_smoking_status'),('ehr_lab_results'),('ehr_imaging_results'),
                  ('ehr_procedures'),('ehr_care_plans'),('ehr_patient_instructions') LOOP
    EXECUTE format($p$
      CREATE POLICY %1$I_state_or_patient ON %1$I FOR ALL USING (
        current_setting('app.current_role', true) = 'platform_administrator'
        OR state_code = current_setting('app.current_state_code', true)
        OR patient_id IN (SELECT id FROM patients WHERE created_by = current_setting('app.current_user_id', true)::uuid)
      )
    $p$, t.column1);
  END LOOP;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed a few CDS rules so the engine demo works
INSERT INTO ehr_cds_rules (rule_key, category, severity, rule_text, trigger_logic, source_citation) VALUES
  ('warfarin_inr_overdue',     'high_risk_med', 'warning', 'Patient on warfarin without INR check in last 30 days — order PT/INR.',
   '{"medication_active":"warfarin","missing_lab":"6301-6","window_days":30}'::jsonb,
   'AHA/ACC anticoagulation guideline'),
  ('hba1c_overdue_diabetic',   'chronic_mgmt',  'warning', 'Patient with type 2 diabetes (E11.x) without HbA1c in last 6 months.',
   '{"diagnosis_icd10_prefix":"E11","missing_lab":"4548-4","window_days":180}'::jsonb,
   'ADA Standards of Medical Care'),
  ('flu_vaccine_overdue',      'preventive',    'info',    'Annual influenza vaccine recommended; last dose >12 months ago.',
   '{"cvx":"88","window_days":365}'::jsonb,
   'CDC ACIP'),
  ('preg_rubella_check',       'preventive',    'info',    'Rubella titer recommended early in pregnancy.',
   '{"diagnosis_icd10_prefix":"Z34","missing_lab":"5334-5"}'::jsonb,
   'ACOG recommendation'),
  ('opioid_pdmp_query',        'high_risk_med', 'critical','Controlled-substance opioid Rx without PDMP query in last 7 days.',
   '{"medication_class":"opioid","missing_action":"pdmp_query","window_days":7}'::jsonb,
   '21 CFR Part 1311 + state PDMP law')
ON CONFLICT (rule_key) DO NOTHING;

SELECT 'EHR core schema ready' AS status,
       (SELECT COUNT(*) FROM ehr_cds_rules) AS cds_rules_seeded;
