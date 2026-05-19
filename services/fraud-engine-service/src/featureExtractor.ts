/**
 * Convert a claim.submitted Kafka event into the feature vector
 * that fraud-detection expects.
 *
 * Behavioral features (provider volume, charge averages, distance) ideally
 * come from a feature store or precomputed materialized views. For now we
 * approximate with quick Postgres queries.
 */

import { query } from '@medguard360/shared';

export interface ClaimSubmittedPayload {
  claimId: string;
  claimControlNumber: string;
  patientId: string;
  billingProviderId: string;
  payerId: string;
  stateCode: string;
  totalChargeCents: string;       // bigint serialized
  lineCount: number;
  serviceCodes: string[];
  diagnosisCodes: string[];
  paRequestId: string | null;
  submittedAt: string;
}

export interface ClaimFeatures {
  claim_id: string;
  provider_id: string;
  patient_id: string;
  state_code: string;
  total_charge_cents: number;
  line_count: number;
  avg_line_charge_cents: number;
  service_codes: string[];
  diagnosis_codes: string[];
  provider_claims_last_24h: number;
  provider_claims_last_7d: number;
  provider_avg_charge_30d_cents: number;
  patient_claims_last_30d: number;
  distance_provider_to_patient_miles: number | null;
  submitted_at_hour: number;
  submitted_at_weekday: number;
}

export async function buildFeatures(p: ClaimSubmittedPayload): Promise<ClaimFeatures> {
  const total = Number.parseInt(p.totalChargeCents, 10);
  const avgLine = p.lineCount > 0 ? Math.round(total / p.lineCount) : 0;

  // Behavioral history — three quick aggregations.
  const provHistory = await query<{ c24: string; c7: string; avg30: string }>(
    'fraud.providerHistory',
    `SELECT
       (SELECT COUNT(*) FROM claims WHERE billing_provider_id = $1 AND submitted_at > now() - interval '24 hours') AS c24,
       (SELECT COUNT(*) FROM claims WHERE billing_provider_id = $1 AND submitted_at > now() - interval '7 days')   AS c7,
       (SELECT COALESCE(AVG(total_charge_cents)::bigint, 0)
          FROM claims WHERE billing_provider_id = $1
                       AND submitted_at > now() - interval '30 days') AS avg30`,
    [p.billingProviderId],
  );
  const ph = provHistory.rows[0];

  const ptHistory = await query<{ c30: string }>(
    'fraud.patientHistory',
    `SELECT COUNT(*) AS c30
       FROM claims WHERE patient_id = $1 AND submitted_at > now() - interval '30 days'`,
    [p.patientId],
  );

  const submitted = new Date(p.submittedAt);

  return {
    claim_id: p.claimId,
    provider_id: p.billingProviderId,
    patient_id: p.patientId,
    state_code: p.stateCode,
    total_charge_cents: total,
    line_count: p.lineCount,
    avg_line_charge_cents: avgLine,
    service_codes: p.serviceCodes,
    diagnosis_codes: p.diagnosisCodes,
    provider_claims_last_24h: Number.parseInt(ph.c24, 10),
    provider_claims_last_7d:  Number.parseInt(ph.c7, 10),
    provider_avg_charge_30d_cents: Number.parseInt(ph.avg30, 10),
    patient_claims_last_30d: Number.parseInt(ptHistory.rows[0].c30, 10),
    distance_provider_to_patient_miles: null,   // populate when provider geo is available
    submitted_at_hour: submitted.getUTCHours(),
    submitted_at_weekday: submitted.getUTCDay(),
  };
}
