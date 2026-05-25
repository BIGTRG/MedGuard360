/**
 * PERM (Payment Error Rate Measurement) data assembly.
 *
 * 42 CFR Part 431, Subpart Q. CMS reviews each state on a 3-year cycle.
 * MedGuard360 produces the universe file CMS asks for at universe-extraction time.
 *
 * Universe types (per PERM):
 *   - FFS  (Fee-for-Service claims)
 *   - MC   (Managed Care capitation payments)
 *   - ELIG (Eligibility determinations sample)
 *
 * Output formats (per CMS data submission specification):
 *   - Pipe-delimited flat file
 *   - One row per claim/payment/eligibility decision
 *   - Includes claim_id, paid_amount_cents, dos, member_id, provider_npi, payer
 */

import { query } from '@medguard360/shared';

export interface PermFfsRow {
  claim_id: string;
  state_code: string;
  service_from: string;
  service_to: string;
  paid_amount_cents: number;
  member_id: string;
  provider_npi: string;
  payer_id: string;
  claim_type: string;
  diagnosis_primary: string;
}

export interface PermExtractRequest {
  stateCode: string;
  fromDate: string;     // YYYY-MM-DD
  toDate: string;
  universe: 'FFS' | 'MC' | 'ELIG';
}

/** Pull FFS universe for the PERM cycle. RLS context required (state-scoped). */
export async function extractFfsUniverse(req: PermExtractRequest): Promise<PermFfsRow[]> {
  if (req.universe !== 'FFS') throw new Error('extractFfsUniverse only handles FFS universe');
  const result = await query<PermFfsRow>(
    'reporting.perm.ffs',
    `SELECT c.id AS claim_id,
            c.state_code,
            c.service_from::text  AS service_from,
            c.service_to::text    AS service_to,
            COALESCE(c.total_paid_cents, 0) AS paid_amount_cents,
            p.medicaid_id         AS member_id,
            pr.npi                AS provider_npi,
            c.payer_id,
            c.claim_type,
            (c.diagnosis_codes)[1] AS diagnosis_primary
       FROM claims c
       JOIN patients p   ON p.id = c.patient_id
       JOIN providers pr ON pr.id = c.billing_provider_id
      WHERE c.state_code = $1
        AND c.service_from >= $2::date
        AND c.service_from <= $3::date
        AND c.status = 'paid'
      ORDER BY c.service_from, c.claim_control_number`,
    [req.stateCode, req.fromDate, req.toDate],
  );
  return result.rows;
}

/** Format the universe as pipe-delimited per CMS specification. */
export function toPipeDelimited(rows: PermFfsRow[]): string {
  const header = 'CLAIM_ID|STATE|DOS_FROM|DOS_TO|PAID_CENTS|MEMBER_ID|PROV_NPI|PAYER|TYPE|DX_PRIMARY';
  const lines  = rows.map(r =>
    [r.claim_id, r.state_code, r.service_from, r.service_to, r.paid_amount_cents,
     r.member_id, r.provider_npi, r.payer_id, r.claim_type, r.diagnosis_primary ?? ''].join('|'),
  );
  return [header, ...lines].join('\n');
}
