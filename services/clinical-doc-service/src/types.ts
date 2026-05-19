export interface EncounterRow {
  id: string;
  provider_user_id: string;
  patient_id: string;
  state_code: string;
  service_date: Date;
  location_lat: number | null;
  location_lng: number | null;
  status: 'in_progress' | 'transcribed' | 'coded' | 'signed' | 'locked';
  audio_file_path: string | null;
  video_file_path: string | null;
  transcript: string | null;
  note_text: string | null;
  suggested_diagnosis_codes: Array<{ code: string; description: string; confidence: number; rationale: string }>;
  suggested_procedure_codes: Array<{ code: string; description: string; confidence: number; rationale: string }>;
  signed_by: string | null;
  signed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface ClinicalDocumentRow {
  id: string;
  encounter_id: string;
  document_type: string;
  file_path: string | null;
  content: string | null;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface AudioProcessResult {
  transcript: string;
  suggestedDiagnosisCodes: Array<{ code: string; description: string; confidence: number; rationale: string }>;
  suggestedProcedureCodes: Array<{ code: string; description: string; confidence: number; rationale: string }>;
}
