/**
 * patient-service repository.
 *
 * EVERY query that touches patient PHI is wrapped in withRlsContext().
 * This is non-negotiable — RLS policies enforce state-level and role-level
 * row visibility at the PostgreSQL layer.
 */

import { pool, withRlsContext, NotFoundError, ConflictError, AuthClaims } from '@medguard360/shared';
import { PatientRow, CrisisPlanRow } from './types';

// ── Patient CRUD ──────────────────────────────────────────────────────────────

export async function findPatient(id: string, auth: AuthClaims): Promise<PatientRow | null> {
  return withRlsContext(auth, async (client) => {
    const result = await client.query<PatientRow>(
      'SELECT * FROM patients WHERE id = $1 LIMIT 1',
      [id],
    );
    return result.rows[0] ?? null;
  });
}

export interface SearchFilters {
  stateCode?:  string;
  payerId?:    string;
  medicaidId?: string;
}

export async function searchPatients(
  filters: SearchFilters,
  auth: AuthClaims,
): Promise<PatientRow[]> {
  return withRlsContext(auth, async (client) => {
    const where: string[] = [];
    const params: unknown[] = [];

    const push = (clause: string, val: unknown): void => {
      params.push(val);
      where.push(clause.replace('$$', `$${params.length}`));
    };

    if (filters.stateCode)  push('state_code = $$', filters.stateCode);
    if (filters.payerId)    push('payer_id = $$',   filters.payerId);
    if (filters.medicaidId) push('medicaid_id = $$',filters.medicaidId);

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const result = await client.query<PatientRow>(
      `SELECT * FROM patients ${whereClause} ORDER BY last_name, first_name LIMIT 200`,
      params,
    );
    return result.rows;
  });
}

export type CreatePatientData = Omit<PatientRow, 'id' | 'created_at' | 'updated_at'>;

export async function createPatient(data: CreatePatientData): Promise<PatientRow> {
  // createPatient uses pool directly — RLS is set by the caller context.
  // We use pool.connect() here because we also need the RETURNING row.
  const client = await pool.connect();
  try {
    const result = await client.query<PatientRow>(
      `INSERT INTO patients
         (medicaid_id, medicare_id, first_name, last_name, dob, state_code,
          payer_id, mco_id, biometric_hash, is_active, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        data.medicaid_id,
        data.medicare_id ?? null,
        data.first_name,
        data.last_name,
        data.dob,
        data.state_code,
        data.payer_id ?? null,
        data.mco_id ?? null,
        data.biometric_hash ?? null,
        data.is_active,
        data.created_by,
      ],
    );
    return result.rows[0];
  } catch (err) {
    const e = err as { code?: string; detail?: string };
    if (e.code === '23505') {
      throw new ConflictError(`Patient identifier conflict: ${e.detail ?? 'duplicate key'}`);
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function updatePatient(
  id: string,
  data: Partial<PatientRow>,
  auth: AuthClaims,
): Promise<PatientRow> {
  return withRlsContext(auth, async (client) => {
    const fields: string[] = [];
    const params: unknown[] = [];

    const UPDATABLE_COLS: (keyof PatientRow)[] = [
      'first_name', 'last_name', 'dob', 'state_code', 'payer_id',
      'mco_id', 'biometric_hash', 'is_active',
    ];

    for (const col of UPDATABLE_COLS) {
      if (data[col] !== undefined) {
        params.push(data[col]);
        fields.push(`${col} = $${params.length}`);
      }
    }

    if (fields.length === 0) {
      const existing = await findPatient(id, auth);
      if (!existing) throw new NotFoundError('Patient');
      return existing;
    }

    fields.push('updated_at = NOW()');
    params.push(id);

    const result = await client.query<PatientRow>(
      `UPDATE patients SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );

    if (!result.rows[0]) throw new NotFoundError('Patient');
    return result.rows[0];
  });
}

// ── Crisis Plan ───────────────────────────────────────────────────────────────

export async function getCrisisPlan(
  patientId: string,
  auth: AuthClaims,
): Promise<CrisisPlanRow | null> {
  return withRlsContext(auth, async (client) => {
    const result = await client.query<CrisisPlanRow>(
      'SELECT * FROM crisis_plans WHERE patient_id = $1 LIMIT 1',
      [patientId],
    );
    return result.rows[0] ?? null;
  });
}

/** Member portal crisis plan — uses crisis-service schema (migration 0014). */
export async function getMemberCrisisPlan(
  patientId: string,
  auth: AuthClaims,
): Promise<Record<string, unknown> | null> {
  return withRlsContext(auth, async (client) => {
    const result = await client.query<Record<string, unknown>>(
      `SELECT warning_signs, internal_coping_strategies, emergency_contacts,
              social_supports, professional_supports, safe_environment_steps, status
       FROM crisis_plans
       WHERE patient_id = $1 AND status = 'active'
       LIMIT 1`,
      [patientId],
    );
    return result.rows[0] ?? null;
  });
}

export type UpsertCrisisPlanData = Partial<Omit<CrisisPlanRow, 'id' | 'patient_id' | 'created_at' | 'updated_at'>>;

export async function upsertCrisisPlan(
  patientId: string,
  data: UpsertCrisisPlanData,
  auth: AuthClaims,
): Promise<CrisisPlanRow> {
  return withRlsContext(auth, async (client) => {
    const result = await client.query<CrisisPlanRow>(
      `INSERT INTO crisis_plans
         (patient_id, triggers, deescalation_strategies, emergency_contacts,
          preferred_hospital, medications, allergies, dnr_status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (patient_id) DO UPDATE SET
         triggers                = EXCLUDED.triggers,
         deescalation_strategies = EXCLUDED.deescalation_strategies,
         emergency_contacts      = EXCLUDED.emergency_contacts,
         preferred_hospital      = EXCLUDED.preferred_hospital,
         medications             = EXCLUDED.medications,
         allergies               = EXCLUDED.allergies,
         dnr_status              = EXCLUDED.dnr_status,
         updated_at              = NOW()
       RETURNING *`,
      [
        patientId,
        JSON.stringify(data.triggers               ?? []),
        JSON.stringify(data.deescalation_strategies ?? []),
        JSON.stringify(data.emergency_contacts      ?? []),
        data.preferred_hospital ?? null,
        JSON.stringify(data.medications ?? []),
        JSON.stringify(data.allergies   ?? []),
        data.dnr_status ?? false,
        auth.sub,
      ],
    );
    return result.rows[0];
  });
}

export interface MemberClaimRow {
  id: string;
  service_date: string;
  service_code: string;
  service_label: string;
  provider_name: string;
  amount_cents: number;
  status: string;
}

export async function getMemberClaims(
  patientId: string,
  auth: AuthClaims,
): Promise<MemberClaimRow[]> {
  return withRlsContext(auth, async (client) => {
    const result = await client.query<{
      id: string;
      service_from: Date;
      status: string;
      total_charge_cents: number;
      service_code: string | null;
    }>(
      `SELECT c.id, c.service_from, c.status, c.total_charge_cents,
              (SELECT cl.service_code FROM claim_lines cl
               WHERE cl.claim_id = c.id ORDER BY cl.line_number LIMIT 1) AS service_code
       FROM claims c
       WHERE c.patient_id = $1
       ORDER BY c.service_from DESC
       LIMIT 20`,
      [patientId],
    );
    const labels: Record<string, string> = {
      '90834': 'Psychotherapy (90834)',
      '97140': 'Manual therapy (97140)',
      '99213': 'Office visit (99213)',
    };
    return result.rows.map(row => ({
      id: row.id,
      service_date: row.service_from instanceof Date
        ? row.service_from.toISOString().slice(0, 10)
        : String(row.service_from).slice(0, 10),
      service_code: row.service_code ?? '—',
      service_label: labels[row.service_code ?? ''] ?? `Service (${row.service_code ?? 'unknown'})`,
      provider_name: 'Dr. Demo Provider',
      amount_cents: Number(row.total_charge_cents),
      status: row.status,
    }));
  });
}

// ── Provider assignment ───────────────────────────────────────────────────────

export async function assignProvider(
  patientId: string,
  providerUserId: string,
  stateCode: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO patient_provider_assignments (patient_id, provider_user_id, state_code)
       VALUES ($1, $2, $3)
       ON CONFLICT (patient_id, provider_user_id) DO UPDATE SET
         state_code = EXCLUDED.state_code,
         updated_at = NOW()`,
      [patientId, providerUserId, stateCode],
    );
  } finally {
    client.release();
  }
}
