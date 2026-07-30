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

// ── Remittances (835) ───────────────────────────────────────────────────────

export async function remittanceFileExists(fileName: string): Promise<boolean> {
  const r = await pool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM nctracks_remittance_files WHERE file_name = $1) AS exists',
    [fileName],
  );
  return Boolean(r.rows[0]?.exists);
}

export async function insertRemittanceFile(entry: {
  fileName: string;
  checkOrEftNumber: string;
  paymentDate: string;
  payeeNpi: string;
  totalPaid: number;
  raw835: string;
  adapterMode: string;
  receivedAt: string;
}): Promise<string> {
  const r = await pool.query<{ id: string }>(
    `INSERT INTO nctracks_remittance_files (
       file_name, check_or_eft_number, payment_date, payee_npi,
       total_paid, raw835, adapter_mode, received_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      entry.fileName,
      entry.checkOrEftNumber,
      entry.paymentDate,
      entry.payeeNpi || null,
      entry.totalPaid,
      entry.raw835,
      entry.adapterMode,
      entry.receivedAt,
    ],
  );
  return r.rows[0].id;
}

export async function insertRemittanceClaim(entry: {
  remittanceFileId: string;
  patientControlNumber: string;
  payerClaimControlNumber: string;
  chargedAmount: number;
  paidAmount: number;
  claimStatusCode: string;
}): Promise<string> {
  const r = await pool.query<{ id: string }>(
    `INSERT INTO nctracks_remittance_claims (
       remittance_file_id, patient_control_number, payer_claim_control_number,
       charged_amount, paid_amount, claim_status_code
     ) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (remittance_file_id, patient_control_number) DO UPDATE SET
       payer_claim_control_number = EXCLUDED.payer_claim_control_number,
       paid_amount = EXCLUDED.paid_amount,
       claim_status_code = EXCLUDED.claim_status_code
     RETURNING id`,
    [
      entry.remittanceFileId,
      entry.patientControlNumber,
      entry.payerClaimControlNumber,
      entry.chargedAmount,
      entry.paidAmount,
      entry.claimStatusCode,
    ],
  );
  return r.rows[0].id;
}

export async function findClaimIdByControlNumber(pcn: string): Promise<string | null> {
  try {
    const r = await pool.query<{ id: string }>(
      'SELECT id FROM claims WHERE claim_control_number = $1 LIMIT 1',
      [pcn],
    );
    if (r.rows[0]?.id) return r.rows[0].id;
  } catch {
    // fall through for alternate demo schema
  }
  try {
    const alt = await pool.query<{ id: string }>(
      'SELECT id FROM claims WHERE ccn = $1 LIMIT 1',
      [pcn],
    );
    return alt.rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function applyRemittanceToClaim(
  remittanceClaimId: string,
  claimId: string,
  paidCents: number,
  tcn?: string,
): Promise<void> {
  try {
    await pool.query(
      `UPDATE claims SET status = 'paid', total_paid_cents = $2, adjudicated_at = now(),
              paid_at = now(), updated_at = now()
       WHERE id = $1`,
      [claimId, paidCents],
    );
  } catch {
    await pool.query(
      `UPDATE claims SET status = 'paid', paid_at = now(), updated_at = now() WHERE id = $1`,
      [claimId],
    );
  }
  await pool.query(
    `UPDATE nctracks_remittance_claims SET claim_id = $2, applied_at = now() WHERE id = $1`,
    [remittanceClaimId, claimId],
  );
  if (tcn) {
    await pool.query(
      `UPDATE nctracks_submissions SET payer_claim_control_number = $2, updated_at = now()
       WHERE claim_id = $1 AND payer_claim_control_number IS NULL`,
      [claimId, tcn],
    ).catch(() => undefined);
  }
  await pool.query(
    `UPDATE nctracks_remittance_files SET processed_at = now()
     WHERE id = (SELECT remittance_file_id FROM nctracks_remittance_claims WHERE id = $1)`,
    [remittanceClaimId],
  );
}

export async function getLastRemittanceWatermark(): Promise<string | undefined> {
  const r = await pool.query<{ received_at: Date }>(
    'SELECT received_at FROM nctracks_remittance_files ORDER BY received_at DESC LIMIT 1',
  );
  return r.rows[0]?.received_at?.toISOString();
}

export async function getNctracksIntegrationStats(): Promise<{
  submissions: number;
  pendingAcks: number;
  remittanceFiles: number;
  x12AuditRows: number;
}> {
  const [sub, ack, rem, audit] = await Promise.all([
    pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM nctracks_submissions'),
    pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM nctracks_submissions WHERE ack_polled_at IS NULL',
    ),
    pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM nctracks_remittance_files'),
    pool.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM nctracks_x12_audit'),
  ]);
  return {
    submissions: Number(sub.rows[0]?.count ?? 0),
    pendingAcks: Number(ack.rows[0]?.count ?? 0),
    remittanceFiles: Number(rem.rows[0]?.count ?? 0),
    x12AuditRows: Number(audit.rows[0]?.count ?? 0),
  };
}

// ── X12 audit archival ────────────────────────────────────────────────────

export interface X12AuditRow {
  id: string;
  claim_id: string | null;
  direction: string;
  transaction_type: string;
  patient_control_number: string | null;
  interchange_control_number: string | null;
  file_name: string | null;
  payload: string;
  adapter_mode: string;
  recorded_at: Date;
}

export async function listX12AuditOlderThan(cutoff: Date, limit: number): Promise<X12AuditRow[]> {
  const r = await pool.query<X12AuditRow>(
    `SELECT id, claim_id, direction, transaction_type, patient_control_number,
            interchange_control_number, file_name, payload, adapter_mode, recorded_at
     FROM nctracks_x12_audit
     WHERE recorded_at < $1
     ORDER BY recorded_at ASC
     LIMIT $2`,
    [cutoff, limit],
  );
  return r.rows;
}

export async function deleteX12AuditByIds(ids: string[]): Promise<void> {
  if (!ids.length) return;
  await pool.query('DELETE FROM nctracks_x12_audit WHERE id = ANY($1::uuid[])', [ids]);
}

export async function insertX12ArchiveManifest(entry: {
  batchId: string;
  recordCount: number;
  oldestRecordedAt: Date;
  newestRecordedAt: Date;
  archivePath: string;
  sha256: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO nctracks_x12_audit_archives (
       batch_id, record_count, oldest_recorded_at, newest_recorded_at, archive_path, sha256
     ) VALUES ($1,$2,$3,$4,$5,$6)`,
    [
      entry.batchId,
      entry.recordCount,
      entry.oldestRecordedAt,
      entry.newestRecordedAt,
      entry.archivePath,
      entry.sha256,
    ],
  );
}
