import { pool, NotFoundError } from '@medguard360/shared';
import type { QueryResult, QueryResultRow } from 'pg';
import { ClaimRow, ClaimLineInput } from './types';

interface QueryClient {
  query<Row extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<Row>>;
}

// ── CCN generation ────────────────────────────────────────────────────────────

/** Generate a Claim Control Number: YYMMDD-NNNNNN from postgres sequence. */
async function generateCcn(): Promise<string> {
  const result = await pool.query<{ nextval: string }>(
    "SELECT nextval('claim_sequence') AS nextval",
  );
  const seq = Number.parseInt(result.rows[0].nextval, 10);
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}-${String(seq).padStart(6, '0')}`;
}

// ── createClaim ───────────────────────────────────────────────────────────────

export async function createClaim(
  data: Omit<
    ClaimRow,
    'id' | 'ccn' | 'created_at' | 'updated_at' | 'fraud_score' | 'fraud_flags' | 'edi_payload' | 'submitted_at' | 'paid_at'
  >,
): Promise<ClaimRow> {
  const ccn = await generateCcn();

  const result = await pool.query<ClaimRow>(
    `INSERT INTO claims (
       ccn, encounter_id, provider_user_id, patient_id, payer_id,
       claim_type, state_code, service_date, total_amount,
       status, fraud_score, fraud_flags, edi_payload, submitted_at, paid_at,
       created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NULL,'{}',NULL,NULL,NULL,$11)
     RETURNING *`,
    [
      ccn,
      data.encounter_id ?? null,
      data.provider_user_id,
      data.patient_id,
      data.payer_id,
      data.claim_type,
      data.state_code,
      data.service_date,
      data.total_amount,
      data.status,
      data.created_by,
    ],
  );
  return result.rows[0];
}

// ── createClaimLines ──────────────────────────────────────────────────────────

export async function createClaimLines(
  claimId: string,
  lines: ClaimLineInput[],
): Promise<void> {
  if (!lines.length) return;

  const values: string[] = [];
  const params: unknown[] = [claimId];

  for (const line of lines) {
    const base = params.length;
    params.push(
      line.line_number,
      line.procedure_code,
      line.modifier_codes ?? [],
      line.diagnosis_pointers ?? [],
      line.service_date,
      line.units,
      line.unit_type ?? 'UN',
      line.charge_amount,
      line.place_of_service ?? '11',
    );
    values.push(
      `($1,$${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9})`,
    );
  }

  await pool.query(
    `INSERT INTO claim_lines (
       claim_id, line_number, procedure_code, modifier_codes,
       diagnosis_pointers, service_date, units, unit_type,
       charge_amount, place_of_service
     ) VALUES ${values.join(',')}`,
    params,
  );
}

// ── findClaim ─────────────────────────────────────────────────────────────────

export async function findClaim(id: string): Promise<ClaimRow | null> {
  const result = await pool.query<ClaimRow>(
    'SELECT * FROM claims WHERE id = $1',
    [id],
  );
  return result.rows[0] ?? null;
}

export async function findClaimLines(claimId: string): Promise<Record<string, unknown>[]> {
  const result = await pool.query(
    'SELECT * FROM claim_lines WHERE claim_id = $1 ORDER BY line_number',
    [claimId],
  );
  return result.rows;
}

// ── listClaims ────────────────────────────────────────────────────────────────

export interface ClaimListFilters {
  providerId?: string;
  patientId?: string;
  status?: string;
  stateCode?: string;
}

export async function listClaims(
  filters: ClaimListFilters,
  client: QueryClient = pool,
): Promise<ClaimRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.providerId) {
    params.push(filters.providerId);
    conditions.push(`billing_provider_id = $${params.length}`);
  }
  if (filters.patientId) {
    params.push(filters.patientId);
    conditions.push(`patient_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }
  if (filters.stateCode) {
    params.push(filters.stateCode);
    conditions.push(`state_code = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await client.query<ClaimRow>(
    `SELECT * FROM claims ${where} ORDER BY created_at DESC LIMIT 500`,
    params,
  );
  return result.rows;
}

// ── updateClaimStatus ─────────────────────────────────────────────────────────

export async function updateClaimStatus(
  id: string,
  status: string,
  extra?: Partial<ClaimRow>,
): Promise<ClaimRow> {
  const setClauses: string[] = ['status = $2', 'updated_at = now()'];
  const params: unknown[] = [id, status];

  if (extra) {
    const extraFields: Array<[keyof ClaimRow, string]> = [
      ['fraud_score', 'fraud_score'],
      ['fraud_flags', 'fraud_flags'],
      ['edi_payload', 'edi_payload'],
      ['submitted_at', 'submitted_at'],
      ['paid_at', 'paid_at'],
    ];
    for (const [key, col] of extraFields) {
      if (key in extra) {
        params.push((extra as Record<string, unknown>)[key]);
        setClauses.push(`${col} = $${params.length}`);
      }
    }
  }

  const result = await pool.query<ClaimRow>(
    `UPDATE claims SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    params,
  );
  if (!result.rows[0]) throw new NotFoundError('Claim');
  return result.rows[0];
}

// ── updateClaimEdi ────────────────────────────────────────────────────────────

export async function updateClaimEdi(id: string, ediPayload: string): Promise<void> {
  await pool.query(
    `UPDATE claims SET edi_payload = $2, updated_at = now() WHERE id = $1`,
    [id, ediPayload],
  );
}
