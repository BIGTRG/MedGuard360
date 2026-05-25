/**
 * Drug PA scaffolding — CMS-0062-P (proposed rule, effective 2027-10-01).
 *
 * Extends electronic prior authorization to drugs covered under the pharmacy
 * benefit. Uses NCPDP SCRIPT 2017071 (not FHIR PAS) since pharmacies and PBMs
 * standardize on NCPDP.
 *
 * Flow:
 *   1. Provider e-prescribes a drug → pharmacy receives NCPDP NewRx
 *   2. Pharmacy tries adjudication via NCPDP D.0 → PBM responds with reject
 *      code 75 (PA required)
 *   3. Pharmacy sends NCPDP SCRIPT PAInitiationRequest to MedGuard360
 *   4. We create a drug PA request, run formulary tier check, step therapy
 *      gate, and the standard pa-nlp-matcher BERT evaluation against PBM
 *      coverage policy
 *   5. Human pharmacist or PA specialist reviews → POST /decide
 *   6. We respond to PBM via NCPDP SCRIPT PAResponse
 *
 * SLA: 24h standard (per CMS-0062-P), 24h emergency (4h target).
 *
 * Reference: migration 0027_drug_pa.sql
 */

import { query } from '@medguard360/shared';

export interface FormularyEntry {
  id: string;
  payer_id: string;
  state_code: string;
  ndc_code: string;
  drug_name: string;
  tier: 'preferred' | 'non_preferred' | 'specialty' | 'excluded';
  prior_auth_required: boolean;
  step_therapy_required: boolean;
  quantity_limit: number | null;
  copay_cents: number | null;
}

export interface DrugPaInput {
  patientId: string;
  orderingProviderUserId: string;
  pharmacyProviderId?: string;
  payerId: string;
  stateCode: string;
  ndcCode: string;
  drugName: string;
  daysSupply: number;
  quantity: number;
  diagnosisCodes: string[];
  priorDrugTrials?: { ndcCode: string; drugName: string; outcome: 'failed' | 'intolerant' | 'contraindicated'; durationDays: number }[];
  urgency: 'standard' | 'expedited' | 'drug';  // 'drug' = 24h, 'expedited' = 24h emergency target
  ncpdpMessageId?: string;
  createdBy: string;
}

export interface FormularyCheckResult {
  found: boolean;
  entry?: FormularyEntry;
  pa_required: boolean;
  step_therapy_required: boolean;
  reason: string;
}

/** Pre-PA formulary tier check. If drug is preferred + no PA flag → no PA needed. */
export async function checkFormulary(payerId: string, ndcCode: string): Promise<FormularyCheckResult> {
  const r = await query<FormularyEntry>(
    'drugPa.formulary',
    `SELECT * FROM drug_formulary
      WHERE payer_id = $1 AND ndc_code = $2
        AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
      ORDER BY effective_from DESC LIMIT 1`,
    [payerId, ndcCode],
  );
  const entry = r.rows[0];
  if (!entry) {
    return {
      found: false, pa_required: true, step_therapy_required: false,
      reason: 'Drug not on formulary — PA required as off-formulary exception request.',
    };
  }
  if (entry.tier === 'excluded') {
    return {
      found: true, entry, pa_required: true, step_therapy_required: false,
      reason: 'Drug is on the excluded list — non-coverage decision; appeal pathway via denials.',
    };
  }
  return {
    found: true, entry,
    pa_required: entry.prior_auth_required,
    step_therapy_required: entry.step_therapy_required,
    reason: entry.prior_auth_required
      ? `PA required for ${entry.tier} tier drug.`
      : `No PA required — ${entry.tier} tier.`,
  };
}

/**
 * Build the minimal NCPDP SCRIPT 2017071 PAInitiationResponse message body.
 * Real submission requires Surescripts certification + the full XML envelope.
 */
export function buildNcpdpPaResponse(input: {
  paId: string;
  drugPaStatus: 'approved' | 'denied' | 'needs_more_info';
  ndcCode: string;
  denialReason?: string;
  approvalNumber?: string;
}): string {
  // Highly abbreviated. Real NCPDP SCRIPT messages are XML with full envelope.
  return JSON.stringify({
    MessageHeader: { To: 'PBM', From: 'MEDGUARD360', MessageID: input.paId, SentTime: new Date().toISOString() },
    PAResponse: {
      PAID: input.paId,
      Status: input.drugPaStatus.toUpperCase(),
      Drug: { NDC: input.ndcCode },
      ApprovalNumber: input.approvalNumber,
      Reason: input.denialReason,
    },
  });
}
