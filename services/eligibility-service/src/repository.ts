import { withRlsContext, AuthClaims, NotFoundError } from '@medguard360/shared';
import { EligibilityRow, CheckSource } from './types';

export interface PersistInput {
  patientId: string;
  stateCode: string;
  payerId: string;
  coverageType: string;
  source: CheckSource;
  active: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  planName?: string;
  copayCents?: number;
  deductibleRemainingCents?: number;
  details: Record<string, unknown>;
}

export async function persist(auth: AuthClaims, input: PersistInput): Promise<EligibilityRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<EligibilityRow>(
      `INSERT INTO eligibility_checks (
         patient_id, state_code, payer_id, coverage_type, source, active,
         effective_from, effective_to, plan_name, copay_cents, deductible_remaining_cents,
         details, requested_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13)
       RETURNING *`,
      [input.patientId, input.stateCode, input.payerId, input.coverageType, input.source, input.active,
       input.effectiveFrom ?? null, input.effectiveTo ?? null, input.planName ?? null,
       input.copayCents ?? null, input.deductibleRemainingCents ?? null,
       JSON.stringify(input.details), auth.sub],
    );
    return r.rows[0];
  });
}

export async function findFreshCache(auth: AuthClaims, patientId: string, payerId: string, stateCode: string): Promise<EligibilityRow | null> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<EligibilityRow>(
      `SELECT * FROM eligibility_checks
         WHERE patient_id = $1 AND payer_id = $2 AND state_code = $3
           AND ttl_until > now()
         ORDER BY checked_at DESC LIMIT 1`,
      [patientId, payerId, stateCode],
    );
    return r.rows[0] ?? null;
  });
}

export async function getOne(auth: AuthClaims, id: string): Promise<EligibilityRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<EligibilityRow>('SELECT * FROM eligibility_checks WHERE id = $1', [id]);
    if (!r.rows[0]) throw new NotFoundError('Eligibility check');
    return r.rows[0];
  });
}
