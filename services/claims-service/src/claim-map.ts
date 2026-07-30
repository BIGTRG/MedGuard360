import { ClaimRow } from './types';

export interface DbClaimRow {
  id: string;
  claim_control_number: string;
  billing_provider_id: string;
  patient_id: string;
  payer_id: string;
  claim_type: string;
  state_code: string;
  service_from: Date;
  total_charge_cents: string | number;
  status: string;
  fraud_score: number | null;
  edi_payload: string | null;
  submitted_at: Date | null;
  adjudicated_at: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export function mapClaimRow(row: DbClaimRow): ClaimRow {
  return {
    id: row.id,
    ccn: row.claim_control_number,
    encounter_id: null,
    provider_user_id: row.billing_provider_id,
    patient_id: row.patient_id,
    payer_id: row.payer_id,
    claim_type: row.claim_type,
    state_code: row.state_code,
    service_date: row.service_from,
    total_amount: Number(row.total_charge_cents) / 100,
    status: row.status,
    fraud_score: row.fraud_score,
    fraud_flags: [],
    edi_payload: row.edi_payload,
    submitted_at: row.submitted_at,
    paid_at: row.status === 'paid' ? row.adjudicated_at : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by,
  };
}

export function dollarsToChargeCents(amount: number): number {
  return Math.round(amount * 100);
}

export function mapClaimLineRow(row: Record<string, unknown>): Record<string, unknown> {
  const mods = [row.modifier_1, row.modifier_2, row.modifier_3, row.modifier_4]
    .filter((m): m is string => typeof m === 'string' && m.length > 0);
  return {
    line_number: row.line_number,
    procedure_code: row.service_code,
    modifier_codes: mods,
    diagnosis_pointers: row.diagnosis_pointers ?? [],
    service_date: row.service_date,
    units: row.units,
    charge_amount: Number(row.charge_cents) / 100,
    place_of_service: row.place_of_service,
  };
}
