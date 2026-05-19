import { withRlsContext, AuthClaims, NotFoundError, query } from '@medguard360/shared';

export interface PharmacyClaimRow {
  id: string;
  claim_control_number: string;
  patient_id: string;
  prescribing_provider_id: string;
  pharmacy_provider_id: string;
  payer_id: string;
  state_code: string;
  ndc: string;
  drug_name: string;
  quantity_dispensed: string;
  days_supply: number;
  refill_number: number;
  total_charge_cents: string;
  prior_auth_id: string | null;
  date_of_service: string;
  status: string;
  rejection_code: string | null;
  ncpdp_payload: string | null;
}

export interface FormularyEntry {
  ndc: string;
  drug_name: string;
  tier: number;
  pa_required: boolean;
  step_therapy: boolean;
  quantity_limit: number | null;
}

export async function lookupFormulary(stateCode: string, payerId: string, ndc: string): Promise<FormularyEntry | null> {
  const r = await query<FormularyEntry>(
    'pharmacy.formularyLookup',
    `SELECT ndc, drug_name, tier, pa_required, step_therapy, quantity_limit
       FROM formulary_entries
       WHERE state_code = $1 AND payer_id = $2 AND ndc = $3
         AND (effective_to IS NULL OR effective_to > now())
       ORDER BY effective_from DESC LIMIT 1`,
    [stateCode, payerId, ndc],
  );
  return r.rows[0] ?? null;
}

export interface CreateClaimInput {
  ccn: string;
  patientId: string;
  prescribingProviderId: string;
  pharmacyProviderId: string;
  payerId: string;
  stateCode: string;
  ndc: string;
  drugName: string;
  quantityDispensed: string;
  daysSupply: number;
  refillNumber: number;
  totalChargeCents: number;
  priorAuthId?: string;
  dateOfService: string;
  ncpdpPayload: string;
}

export async function createClaim(auth: AuthClaims, input: CreateClaimInput): Promise<PharmacyClaimRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<PharmacyClaimRow>(
      `INSERT INTO pharmacy_claims (
         claim_control_number, patient_id, prescribing_provider_id, pharmacy_provider_id,
         payer_id, state_code, ndc, drug_name, quantity_dispensed, days_supply, refill_number,
         total_charge_cents, prior_auth_id, date_of_service, ncpdp_payload, status, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'submitted',$16)
       RETURNING *`,
      [input.ccn, input.patientId, input.prescribingProviderId, input.pharmacyProviderId,
       input.payerId, input.stateCode, input.ndc, input.drugName, input.quantityDispensed,
       input.daysSupply, input.refillNumber, input.totalChargeCents,
       input.priorAuthId ?? null, input.dateOfService, input.ncpdpPayload, auth.sub],
    );
    return r.rows[0];
  });
}

export async function getClaim(auth: AuthClaims, id: string): Promise<PharmacyClaimRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<PharmacyClaimRow>('SELECT * FROM pharmacy_claims WHERE id = $1', [id]);
    if (!r.rows[0]) throw new NotFoundError('Pharmacy claim');
    return r.rows[0];
  });
}

export async function setClaimStatus(auth: AuthClaims, id: string, status: string, rejectionCode?: string): Promise<PharmacyClaimRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<PharmacyClaimRow>(
      `UPDATE pharmacy_claims SET status = $2, rejection_code = $3 WHERE id = $1 RETURNING *`,
      [id, status, rejectionCode ?? null],
    );
    if (!r.rows[0]) throw new NotFoundError('Pharmacy claim');
    return r.rows[0];
  });
}

async function nextCcn(): Promise<string> {
  const r = await query<{ nextval: string }>('pharmacy.ccn', "SELECT nextval('claim_ccn_seq') AS nextval");
  const seq = Number.parseInt(r.rows[0].nextval, 10);
  const d = new Date();
  return `RX${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}-${String(seq).padStart(6,'0')}`;
}
export { nextCcn };
