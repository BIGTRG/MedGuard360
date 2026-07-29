import { pool } from '@medguard360/shared';
import type { Ack277CA, Ack999, ClaimSubmitResult } from '@medguard360/nctracks';

export interface NctracksSubmissionRow {
  id: string;
  claim_id: string;
  patient_control_number: string;
  interchange_control_number: string;
  group_control_number: string;
  transaction_set_control_number: string;
  file_name: string;
  adapter_mode: string;
  submitted_at: Date;
  ack999_accepted: boolean | null;
  ack999_raw: string | null;
  ack277ca_status: string | null;
  ack277ca_raw: string | null;
  ack_polled_at: Date | null;
  payer_claim_control_number: string | null;
}

export async function insertNctracksSubmission(
  claimId: string,
  patientControlNumber: string,
  result: ClaimSubmitResult,
  adapterMode: string,
): Promise<NctracksSubmissionRow> {
  const row = await pool.query<NctracksSubmissionRow>(
    `INSERT INTO nctracks_submissions (
       claim_id, patient_control_number, interchange_control_number,
       group_control_number, transaction_set_control_number, file_name,
       adapter_mode, submitted_at,
       ack999_accepted, ack999_raw, ack277ca_status, ack277ca_raw, ack_polled_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      claimId,
      patientControlNumber,
      result.interchangeControlNumber,
      result.groupControlNumber,
      result.transactionSetControlNumber,
      result.fileName,
      adapterMode,
      result.submittedAt,
      result.ack999?.accepted ?? null,
      result.ack999?.raw ?? null,
      result.ack277CA?.status ?? null,
      result.ack277CA?.raw ?? null,
      result.ack999 || result.ack277CA ? new Date() : null,
    ],
  );
  return row.rows[0];
}

export async function listSubmissionsPendingAck(limit = 100): Promise<NctracksSubmissionRow[]> {
  const row = await pool.query<NctracksSubmissionRow>(
    `SELECT * FROM nctracks_submissions
     WHERE ack_polled_at IS NULL
     ORDER BY submitted_at ASC
     LIMIT $1`,
    [limit],
  );
  return row.rows;
}

export async function updateSubmissionAcks(
  id: string,
  ack999: Ack999 | undefined,
  ack277CA: Ack277CA | undefined,
): Promise<void> {
  await pool.query(
    `UPDATE nctracks_submissions SET
       ack999_accepted = COALESCE($2, ack999_accepted),
       ack999_raw = COALESCE($3, ack999_raw),
       ack277ca_status = COALESCE($4, ack277ca_status),
       ack277ca_raw = COALESCE($5, ack277ca_raw),
       ack_polled_at = now(),
       updated_at = now()
     WHERE id = $1`,
    [
      id,
      ack999?.accepted ?? null,
      ack999?.raw ?? null,
      ack277CA?.status ?? null,
      ack277CA?.raw ?? null,
    ],
  );
}

export async function insertX12Audit(entry: {
  claimId?: string;
  direction: 'outbound' | 'inbound';
  transactionType: string;
  patientControlNumber?: string;
  interchangeControlNumber?: string;
  fileName?: string;
  payload: string;
  adapterMode: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO nctracks_x12_audit (
       claim_id, direction, transaction_type, patient_control_number,
       interchange_control_number, file_name, payload, adapter_mode
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      entry.claimId ?? null,
      entry.direction,
      entry.transactionType,
      entry.patientControlNumber ?? null,
      entry.interchangeControlNumber ?? null,
      entry.fileName ?? null,
      entry.payload,
      entry.adapterMode,
    ],
  );
}
