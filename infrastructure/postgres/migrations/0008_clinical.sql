BEGIN;

CREATE TABLE IF NOT EXISTS clinical_encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_user_id UUID NOT NULL REFERENCES users(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  state_code CHAR(2) NOT NULL,
  service_date DATE NOT NULL,
  location_lat NUMERIC(10,7),
  location_lng NUMERIC(10,7),
  status TEXT NOT NULL DEFAULT 'in_progress',
  audio_file_path TEXT,
  video_file_path TEXT,
  transcript TEXT,
  note_text TEXT,
  suggested_diagnosis_codes JSONB NOT NULL DEFAULT '[]',
  suggested_procedure_codes JSONB NOT NULL DEFAULT '[]',
  signed_by UUID REFERENCES users(id),
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS clinical_encounters_patient_idx ON clinical_encounters(patient_id);
CREATE INDEX IF NOT EXISTS clinical_encounters_provider_idx ON clinical_encounters(provider_user_id);
CREATE INDEX IF NOT EXISTS clinical_encounters_status_idx ON clinical_encounters(status);

CREATE TABLE IF NOT EXISTS clinical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id UUID NOT NULL REFERENCES clinical_encounters(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_path TEXT,
  content TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
