/**
 * MA Plan Provider Directory compliance (CMS CY2026 final rule).
 *
 * MA plans must:
 *   - Submit provider directory data to CMS in the CMS-required JSON format
 *   - Update CMS within 30 days of any change to a network provider's data
 *   - Annually attest to the accuracy of the published directory
 *
 * This module:
 *   - Exports directory in CMS format
 *   - Tracks changes that affect MA plan directories (logged in ma_directory_change_log)
 *   - Records annual attestations
 *
 * Reference: migration 0030_ma_directory.sql
 */

import { query } from '@medguard360/shared';

export interface CmsDirectoryEntry {
  npi: string;
  legal_name: string;
  doing_business_as: string | null;
  provider_type: string;
  primary_taxonomy_code: string | null;
  enrolled_medicare: boolean;
  active: boolean;
  state_codes: string[];
  locations: { address_line1?: string; city?: string; state_code: string; postal_code?: string; phone?: string }[];
  specialties: { code: string; description: string }[];
  accepting_new_patients: boolean | null;
  last_attested_at: string | null;
}

/** Build the CMS-format directory export for a state (and optionally per-MCO). */
export async function exportCmsDirectory(stateCode: string): Promise<CmsDirectoryEntry[]> {
  const r = await query<{
    id: string; npi: string; legal_name: string; doing_business_as: string | null;
    type: string; primary_taxonomy_code: string | null;
    enrolled_medicare: boolean; status: string; state_code: string | null;
    enrolled_medicaid_states: string[];
  }>('maDir.export',
    `SELECT id, npi, legal_name, doing_business_as, type, primary_taxonomy_code,
            enrolled_medicare, status, state_code, enrolled_medicaid_states
       FROM providers
      WHERE (state_code = $1 OR $1 = ANY(enrolled_medicaid_states))
        AND status = 'active'
        AND enrolled_medicare = TRUE`,
    [stateCode]);

  const npis = r.rows.map(p => p.id);

  const locs = await query<{ provider_id: string; address_line1: string | null; city: string | null; state_code: string; postal_code: string | null }>(
    'maDir.locations',
    `SELECT provider_id, address_line1, city, state_code, postal_code
       FROM provider_locations WHERE provider_id = ANY($1::uuid[]) AND active = TRUE`,
    [npis]);

  const specs = await query<{ provider_id: string; taxonomy_code: string; taxonomy_description: string }>(
    'maDir.specs',
    `SELECT provider_id, taxonomy_code, taxonomy_description
       FROM provider_specialties WHERE provider_id = ANY($1::uuid[])`,
    [npis]);

  return r.rows.map(p => ({
    npi: p.npi,
    legal_name: p.legal_name,
    doing_business_as: p.doing_business_as,
    provider_type: p.type,
    primary_taxonomy_code: p.primary_taxonomy_code,
    enrolled_medicare: p.enrolled_medicare,
    active: p.status === 'active',
    state_codes: p.enrolled_medicaid_states ?? [],
    locations: locs.rows.filter(l => l.provider_id === p.id).map(l => ({
      address_line1: l.address_line1 ?? undefined, city: l.city ?? undefined,
      state_code: l.state_code, postal_code: l.postal_code ?? undefined,
    })),
    specialties: specs.rows.filter(s => s.provider_id === p.id).map(s => ({
      code: s.taxonomy_code, description: s.taxonomy_description,
    })),
    accepting_new_patients: null,    // placeholder until provider_locations has this column
    last_attested_at: null,
  }));
}

/** Log a directory-affecting change for 30-day notification. */
export async function logChange(input: {
  providerId: string; stateCode: string; changeType: string;
  oldValue?: string; newValue?: string;
  affectedPayerIds: string[];
}): Promise<void> {
  const due = new Date(Date.now() + 30 * 86_400_000).toISOString();
  await query('maDir.logChange',
    `INSERT INTO ma_directory_change_log (provider_id, state_code, change_type, old_value, new_value, affected_payer_ids, notification_due_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [input.providerId, input.stateCode, input.changeType,
      input.oldValue ?? null, input.newValue ?? null, input.affectedPayerIds, due]);
}

export interface AttestationInput {
  mcoPayerId: string; stateCode: string; attestationYear: number;
  attestedByUserId: string;
  accuracyPct: number; totalProviders: number;
  providersVerified: number; providersUnableToVerify: number;
  notes?: string;
}

export async function recordAttestation(input: AttestationInput): Promise<void> {
  await query('maDir.attest',
    `INSERT INTO ma_directory_attestations (
       mco_payer_id, state_code, attestation_year, attested_by_user_id, attested_at,
       accuracy_pct, total_providers, providers_verified, providers_unable_to_verify, notes
     ) VALUES ($1,$2,$3,$4, now(), $5,$6,$7,$8,$9)
     ON CONFLICT (mco_payer_id, attestation_year) DO UPDATE SET
       attested_by_user_id = EXCLUDED.attested_by_user_id,
       attested_at = EXCLUDED.attested_at,
       accuracy_pct = EXCLUDED.accuracy_pct,
       total_providers = EXCLUDED.total_providers,
       providers_verified = EXCLUDED.providers_verified,
       providers_unable_to_verify = EXCLUDED.providers_unable_to_verify,
       notes = EXCLUDED.notes,
       updated_at = now()`,
    [input.mcoPayerId, input.stateCode, input.attestationYear, input.attestedByUserId,
      input.accuracyPct, input.totalProviders, input.providersVerified,
      input.providersUnableToVerify, input.notes ?? null]);
}
