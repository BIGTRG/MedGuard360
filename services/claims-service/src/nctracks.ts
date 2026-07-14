/**
 * NC Medicaid claim submission via @medguard360/nctracks (837P batch / stub).
 * Real SFTP transport activates when GDIT credentials are issued and NCTRACKS_MODE=sftp.
 */

import { createNctracksAdapter, type ClaimSubmitResult } from '@medguard360/nctracks';
import { logger } from '@medguard360/shared';

interface NctracksClaimRoutingInput {
  stateCode: string;
  payerId?: string;
  patientMedicaidId?: string;
}

const NC_MEDICAID_PAYER_IDS = new Set([
  'NCXIX',
  'NCMEDICAID',
  'NCMEDPAY',
  'NCMED',
  'NCCHIP',
  'NCHEALTHCHOICE',
]);

function normalizePayerId(payerId?: string): string {
  return (payerId ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

function isNcMedicaidPayer(payerId?: string): boolean {
  const normalized = normalizePayerId(payerId);
  return NC_MEDICAID_PAYER_IDS.has(normalized)
    || normalized.startsWith('NCMEDICAID')
    || normalized.startsWith('NCMEDPAY')
    || normalized.startsWith('NCCHIP')
    || normalized.startsWith('NCHEALTHCHOICE');
}

function hasMemberId(patientMedicaidId?: string): boolean {
  const normalized = (patientMedicaidId ?? '').trim().toUpperCase();
  return normalized.length > 0 && normalized !== 'UNKNOWN';
}

export function shouldUseNctracks(input: NctracksClaimRoutingInput): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  return input.stateCode.toUpperCase() === 'NC'
    && mode !== 'disabled'
    && isNcMedicaidPayer(input.payerId)
    && hasMemberId(input.patientMedicaidId);
}

export interface NcClaimSubmitInput {
  ccn: string;
  totalCharge: number;
  patientMedicaidId: string;
  serviceDate: string;
  billingNpi: string;
  diagnosisCodes: string[];
  lines: Array<{
    procedure_code: string;
    modifier_codes: string[];
    units: number;
    charge_amount: number;
    service_date: string;
    place_of_service: string;
    diagnosis_pointers: number[];
  }>;
}

function toIsoDate(raw: string): string {
  const d = raw.replace(/-/g, '');
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Date().toISOString().slice(0, 10);
}

export async function submitNcClaim(input: NcClaimSubmitInput): Promise<ClaimSubmitResult> {
  const adapter = createNctracksAdapter();
  const serviceIso = toIsoDate(input.serviceDate);

  const result = await adapter.submitClaim({
    claimType: 'professional',
    patientControlNumber: input.ccn,
    totalCharge: input.totalCharge,
    subscriberId: input.patientMedicaidId,
    serviceDateFrom: serviceIso,
    serviceDateTo: serviceIso,
    billingProvider: {
      npi: input.billingNpi,
      taxonomy: process.env.NCTRACKS_BILLING_TAXONOMY ?? '261Q00000X',
      atypicalId: process.env.NCTRACKS_ATYPICAL_ID,
    },
    renderingProvider: {
      npi: input.billingNpi,
      taxonomy: process.env.NCTRACKS_BILLING_TAXONOMY ?? '261Q00000X',
    },
    diagnoses: input.diagnosisCodes.map((code) => ({ code, system: 'ICD10CM' as const })),
    lines: input.lines.map((line) => ({
      procedureCode: line.procedure_code,
      modifiers: line.modifier_codes.length ? line.modifier_codes : undefined,
      units: line.units,
      charge: line.charge_amount,
      serviceDate: toIsoDate(line.service_date),
      placeOfService: line.place_of_service,
      diagnosisPointers: line.diagnosis_pointers,
    })),
  });

  logger.info('nctracks claim submit', {
    mode: adapter.mode,
    ccn: input.ccn,
    fileName: result.fileName,
    isa13: result.interchangeControlNumber,
    ack999Accepted: result.ack999?.accepted,
  });

  return result;
}