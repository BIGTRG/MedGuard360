-- EHR specialty extensions — behavioral health, home health, school-based.

-- ─── Behavioral Health — Assessment instruments ────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_bh_assessments (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  encounter_id       uuid REFERENCES clinical_encounters(id),
  state_code         varchar(2) NOT NULL,
  instrument         text NOT NULL CHECK (instrument IN (
    'PHQ-9','GAD-7','PCL-5','C-SSRS','CAGE-AID','DAST-10','AUDIT','PHQ-2','MDQ','EDE-Q'
  )),
  administered_at    timestamptz NOT NULL DEFAULT now(),
  administered_by    uuid REFERENCES users(id),
  raw_responses      jsonb NOT NULL,                                 -- per-item answers
  total_score        integer,
  interpretation     text,                                           -- 'minimal','mild','moderate','severe','high_risk', etc.
  high_risk_flag     boolean DEFAULT FALSE,                          -- e.g. C-SSRS positive for active ideation
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ehr_bh_patient_idx ON ehr_bh_assessments(patient_id, administered_at DESC);
CREATE INDEX IF NOT EXISTS ehr_bh_high_risk_idx ON ehr_bh_assessments(patient_id) WHERE high_risk_flag = TRUE;

-- ─── Behavioral Health — Treatment Plan ────────────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_bh_treatment_plans (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  state_code         varchar(2) NOT NULL,
  diagnoses          text[] NOT NULL DEFAULT '{}',                   -- DSM-5 codes
  goals              jsonb NOT NULL DEFAULT '[]'::jsonb,             -- [{goal,objective,intervention,target_date,progress_rating}]
  effective_from     date NOT NULL DEFAULT CURRENT_DATE,
  next_review_date   date NOT NULL,
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','revised','completed','discontinued')),
  created_by         uuid NOT NULL REFERENCES users(id),
  supervisor_user_id uuid REFERENCES users(id),                      -- when written by unlicensed staff
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ─── Behavioral Health — Group Therapy Notes (one note, many patients) ────
CREATE TABLE IF NOT EXISTS ehr_group_therapy_sessions (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_code         varchar(2) NOT NULL,
  group_name         text NOT NULL,
  conducted_at       timestamptz NOT NULL,
  facilitator_user_id uuid NOT NULL REFERENCES users(id),
  cofacilitator_user_id uuid REFERENCES users(id),
  topic              text,
  cpt_code           varchar(10),                                    -- e.g. '90853'
  shared_note        text NOT NULL,
  patient_ids        uuid[] NOT NULL,                                -- attendees
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ─── Behavioral Health — 42 CFR Part 2 (SUD) consent tracking ──────────────
CREATE TABLE IF NOT EXISTS ehr_part2_consents (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  state_code         varchar(2) NOT NULL,
  recipient_type     text NOT NULL CHECK (recipient_type IN ('provider','payer','family','researcher','court','other')),
  recipient_name     text NOT NULL,
  purpose            text NOT NULL,                                  -- what the disclosure is for
  scope              text NOT NULL,                                  -- 'full_record','treatment_episode','specific_doc'
  effective_from     date NOT NULL DEFAULT CURRENT_DATE,
  expires_at         date,                                           -- if NULL, until revoked
  revoked_at         timestamptz,
  signed_by_patient  boolean NOT NULL DEFAULT FALSE,
  patient_signature_url text,                                        -- signed consent PDF in MinIO
  witness_user_id    uuid REFERENCES users(id),
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ehr_part2_active_idx ON ehr_part2_consents(patient_id) WHERE revoked_at IS NULL;

-- ─── Home Health — OASIS-E assessment ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_oasis_assessments (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  state_code         varchar(2) NOT NULL,
  assessment_type    text NOT NULL CHECK (assessment_type IN ('SOC','ROC','RFA','transfer','discharge')),
  assessment_date    date NOT NULL,
  oasis_version      text NOT NULL DEFAULT 'OASIS-E',
  payload            jsonb NOT NULL,                                 -- full OASIS-E item set
  homebound_status_documented boolean NOT NULL DEFAULT FALSE,
  completed_by       uuid NOT NULL REFERENCES users(id),
  completed_at       timestamptz NOT NULL DEFAULT now(),
  transmitted_at     timestamptz,
  oasis_submission_id text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ehr_oasis_patient_idx ON ehr_oasis_assessments(patient_id, assessment_date DESC);

-- ─── Home Health — Plan of Care (CMS-485) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_home_health_poc (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  state_code         varchar(2) NOT NULL,
  certifying_physician_id uuid NOT NULL REFERENCES users(id),
  cert_period_start  date NOT NULL,
  cert_period_end    date NOT NULL,                                  -- 60-day period
  primary_diagnosis_icd10 varchar(10) NOT NULL,
  goals              jsonb NOT NULL DEFAULT '[]'::jsonb,
  orders             jsonb NOT NULL DEFAULT '[]'::jsonb,             -- skilled services, frequency, duration
  physician_signed_at timestamptz,
  noa_submitted_at   timestamptz,                                    -- Notice of Admission
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','recertified','discharged','cancelled')),
  created_by         uuid NOT NULL REFERENCES users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ─── Home Health — Visit notes by discipline ──────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_home_health_visits (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  poc_id             uuid REFERENCES ehr_home_health_poc(id),
  state_code         varchar(2) NOT NULL,
  discipline         text NOT NULL CHECK (discipline IN ('SN','PT','OT','ST','MSW','HHA')),
  visit_date         date NOT NULL,
  visit_start        timestamptz,
  visit_end          timestamptz,
  performed_by       uuid NOT NULL REFERENCES users(id),
  note_body          text NOT NULL,
  goals_progress     jsonb DEFAULT '{}'::jsonb,
  signed_at          timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- ─── School-based — IEP service log ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS ehr_iep_service_logs (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id         uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  state_code         varchar(2) NOT NULL,
  lea_id             uuid,                                           -- local education agency
  iep_goal_id        text NOT NULL,                                  -- text id from IEP plan
  service_date       date NOT NULL,
  minutes_delivered  integer NOT NULL,
  service_type       text NOT NULL,                                  -- 'speech','OT','PT','psych','nursing','aide'
  cpt_code           varchar(10),
  medicaid_billable  boolean NOT NULL DEFAULT FALSE,
  parent_consent_on_file boolean NOT NULL DEFAULT FALSE,
  provider_user_id   uuid NOT NULL REFERENCES users(id),
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ehr_iep_patient_idx ON ehr_iep_service_logs(patient_id, service_date DESC);

-- RLS
ALTER TABLE ehr_bh_assessments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_bh_treatment_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_group_therapy_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_part2_consents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_oasis_assessments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_home_health_poc      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_home_health_visits   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehr_iep_service_logs     ENABLE ROW LEVEL SECURITY;

-- 42 CFR Part 2 — SUD records require SEPARATE explicit consent; the bh_assessments
-- and bh_treatment_plans rows that touch SUD (CAGE-AID, DAST-10, AUDIT) are
-- gated on an ehr_part2_consents row being active for the requesting party.
-- The application layer enforces this; this comment documents the obligation.

SELECT 'EHR specialty schema ready' AS status;
