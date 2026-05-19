import { pool } from '@medguard360/shared';
import { EncounterRow, ClinicalDocumentRow } from './types';

export async function createEncounter(
  data: Omit<EncounterRow, 'id' | 'created_at' | 'updated_at' | 'status' | 'signed_by' | 'signed_at' | 'transcript' | 'note_text' | 'suggested_diagnosis_codes' | 'suggested_procedure_codes' | 'audio_file_path' | 'video_file_path'>
): Promise<EncounterRow> {
  const { rows } = await pool.query<EncounterRow>(
    `INSERT INTO clinical_encounters
       (provider_user_id, patient_id, state_code, service_date, location_lat, location_lng, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [data.provider_user_id, data.patient_id, data.state_code, data.service_date,
     data.location_lat ?? null, data.location_lng ?? null, data.created_by]
  );
  return rows[0];
}

export async function findEncounter(id: string): Promise<EncounterRow | null> {
  const { rows } = await pool.query<EncounterRow>(
    'SELECT * FROM clinical_encounters WHERE id=$1', [id]
  );
  return rows[0] ?? null;
}

export async function updateEncounter(id: string, data: Partial<EncounterRow>): Promise<EncounterRow> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  for (const [key, val] of Object.entries(data)) {
    sets.push(`${key}=$${idx++}`);
    values.push(val);
  }
  sets.push(`updated_at=NOW()`);
  values.push(id);
  const { rows } = await pool.query<EncounterRow>(
    `UPDATE clinical_encounters SET ${sets.join(',')} WHERE id=$${idx} RETURNING *`,
    values
  );
  return rows[0];
}

export async function listEncounters(filters: {
  providerId?: string;
  patientId?: string;
  status?: string;
  stateCode?: string;
}): Promise<EncounterRow[]> {
  const where: string[] = ['1=1'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters.providerId) { where.push(`provider_user_id=$${idx++}`); values.push(filters.providerId); }
  if (filters.patientId) { where.push(`patient_id=$${idx++}`); values.push(filters.patientId); }
  if (filters.status) { where.push(`status=$${idx++}`); values.push(filters.status); }
  if (filters.stateCode) { where.push(`state_code=$${idx++}`); values.push(filters.stateCode); }
  const { rows } = await pool.query<EncounterRow>(
    `SELECT * FROM clinical_encounters WHERE ${where.join(' AND ')} ORDER BY created_at DESC`,
    values
  );
  return rows;
}

export async function addDocument(
  encounterId: string,
  docType: string,
  filePath?: string,
  content?: string,
  metadata: Record<string, unknown> = {}
): Promise<ClinicalDocumentRow> {
  const { rows } = await pool.query<ClinicalDocumentRow>(
    `INSERT INTO clinical_documents (encounter_id, document_type, file_path, content, metadata)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [encounterId, docType, filePath ?? null, content ?? null, JSON.stringify(metadata)]
  );
  return rows[0];
}

export async function getDocuments(encounterId: string): Promise<ClinicalDocumentRow[]> {
  const { rows } = await pool.query<ClinicalDocumentRow>(
    'SELECT * FROM clinical_documents WHERE encounter_id=$1 ORDER BY created_at',
    [encounterId]
  );
  return rows;
}
