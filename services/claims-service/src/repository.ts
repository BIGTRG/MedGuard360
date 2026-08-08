import { pool, NotFoundError } from '@medguard360/shared';
import { ClaimRow, ClaimLineInput } from './types';
import {
  mapClaimRow,
  mapClaimLineRow,
  dollarsToChargeCents,
  type DbClaimRow,
} from './claim-map';

export { mapClaimRow, dollarsToChargeCents } from './claim-map';

type QueryClient = {
  query: typeof pool.query;
};

const CLAIM_FROM = `
  SELECT
    id, claim_control_number, billing_provider_id, patient_id, payer_id,
    claim_type, state_code, service_from, total_charge_cents, status,
    fraud_score, edi_payload, submitted_at, adjudicated_at,
    created_at, updated_at, created_by
  FROM claims
`;

// ── CCN generation ────────────────────────────────────────────────────────────

/** Generate a Claim Control Number: YYMMDD-NNNNNN from postgres sequence. */
async function generateCcn(): Promise<string> {
  const result = await pool.query<{ nextval: string }>(
    "SELECT nextval('claim_ccn_seq') AS nextval",
  );
  const seq = Number.parseInt(result.rows[0].nextval, 10);
  const now = new Date();
  const yy = String(now.getUTCFullYear()).slice(2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}-${String(seq).padStart(6, '0')}`;
}

// ── createClaim ─────────────────────────────────────────────────────────────

export async function createClaim(
  data: Omit<
    ClaimRow,
    'id' | 'ccn' | 'created_at' | 'updated_at' | 'fraud_score' | 'fraud_flags' | 'edi_payload' | 'submitted_at' | 'paid_at'
  >,
): Promise<ClaimRow> {
  const ccn = await generateCcn();
  const serviceDate = data.service_date instanceof Date
    ? data.service_date.toISOString().slice(0, 10)
    : String(data.service_date).slice(0, 10);

  const result = await pool.query<{ id: string }>(
    `INSERT INTO claims (
       claim_control_number, patient_id, billing_provider_id, payer_id,
       state_code, claim_type, service_from, service_to, diagnosis_codes,
       total_charge_cents, status, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$7,ARRAY[]::text[],$8,$9,$10)
     RETURNING id`,
    [
      ccn,
      data.patient_id,
      data.provider_user_id,
      data.payer_id,
      data.state_code,
      data.claim_type,
      serviceDate,
      dollarsToChargeCents(data.total_amount),
      data.status,
      data.created_by,
    ],
  );

  const claim = await findClaim(result.rows[0].id);
  if (!claim) throw new NotFoundError('Claim');
  return claim;
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
    const mods = line.modifier_codes ?? [];
    const base = params.length;
    params.push(
      line.line_number,
      line.procedure_code,
      'CPT',
      mods[0] ?? null,
      mods[1] ?? null,
      mods[2] ?? null,
      mods[3] ?? null,
      line.units,
      dollarsToChargeCents(line.charge_amount),
      line.diagnosis_pointers ?? [],
      line.service_date,
      line.place_of_service ?? '11',
    );
    values.push(
      `($1,$${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12})`,
    );
  }

  await pool.query(
    `INSERT INTO claim_lines (
       claim_id, line_number, service_code, service_code_type,
       modifier_1, modifier_2, modifier_3, modifier_4,
       units, charge_cents, diagnosis_pointers, service_date, place_of_service
     ) VALUES ${values.join(',')}`,
    params,
  );
}

// ── findClaim ─────────────────────────────────────────────────────────────────

export async function findClaim(id: string): Promise<ClaimRow | null> {
  const result = await pool.query<DbClaimRow>(
    `${CLAIM_FROM} WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? mapClaimRow(result.rows[0]) : null;
}

export async function findClaimLines(claimId: string): Promise<Record<string, unknown>[]> {
  const result = await pool.query(
    'SELECT * FROM claim_lines WHERE claim_id = $1 ORDER BY line_number',
    [claimId],
  );
  return result.rows.map(mapClaimLineRow);
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

  const result = await client.query<DbClaimRow>(
    `${CLAIM_FROM} ${where} ORDER BY created_at DESC LIMIT 500`,
    params,
  );
  return result.rows.map(mapClaimRow);
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
      ['edi_payload', 'edi_payload'],
      ['submitted_at', 'submitted_at'],
    ];
    for (const [key, col] of extraFields) {
      if (key in extra) {
        params.push((extra as Record<string, unknown>)[key]);
        setClauses.push(`${col} = $${params.length}`);
      }
    }
    if ('paid_at' in extra && extra.paid_at) {
      setClauses.push('adjudicated_at = now()');
    }
  }

  const result = await pool.query<DbClaimRow>(
    `UPDATE claims SET ${setClauses.join(', ')} WHERE id = $1 RETURNING
       id, claim_control_number, billing_provider_id, patient_id, payer_id,
       claim_type, state_code, service_from, total_charge_cents, status,
       fraud_score, edi_payload, submitted_at, adjudicated_at,
       created_at, updated_at, created_by`,
    params,
  );
  if (!result.rows[0]) throw new NotFoundError('Claim');
  return mapClaimRow(result.rows[0]);
}

// ── updateClaimEdi ────────────────────────────────────────────────────────────

export async function updateClaimEdi(id: string, ediPayload: string): Promise<void> {
  await pool.query(
    `UPDATE claims SET edi_payload = $2, edi_generated_at = now(), updated_at = now() WHERE id = $1`,
    [id, ediPayload],
  );
}
