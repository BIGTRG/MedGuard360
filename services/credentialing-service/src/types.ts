export type AppType = 'initial' | 'recredential' | 'add_state' | 'add_mco';
export type AppStatus =
  | 'received' | 'docs_pending' | 'psv_pending' | 'review_pending'
  | 'approved' | 'denied' | 'withdrawn' | 'expired';
export type PsvSource =
  | 'npi_registry' | 'pecos' | 'leie' | 'sam_gov' | 'state_license_board' | 'dea_registry';
export type PsvStatus = 'pending' | 'clear' | 'flagged' | 'error';

export interface ApplicationRow {
  id: string;
  provider_id: string;
  state_code: string;
  mco_id: string | null;
  application_type: AppType;
  status: AppStatus;
  assigned_specialist: string | null;
  submitted_at: Date;
  target_decision_by: Date;
  decision_at: Date | null;
  decision_reason: string | null;
}

export interface DocumentRow {
  id: string;
  application_id: string;
  doc_type: string;
  mime_type: string;
  minio_bucket: string;
  minio_object_key: string;
  size_bytes: string;
  sha256: string;
  ocr_text: string | null;
  ocr_classified_as: string | null;
  ocr_classification_confidence: string | null;
  extracted_fields: unknown | null;
  ocr_engine_version: string | null;
}

export interface PsvRow {
  id: string;
  application_id: string;
  source: PsvSource;
  status: PsvStatus;
  result_summary: string | null;
  source_reference: string | null;
  raw_response: unknown | null;
  checked_at: Date;
  expires_at: Date | null;
}
