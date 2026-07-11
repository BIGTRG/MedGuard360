/**
 * NC Medicaid claim submission via @medguard360/nctracks (837P batch / stub).
 * Real SFTP transport activates when GDIT credentials are issued and NCTRACKS_MODE=sftp.
 */

import { createNctracksAdapter, type ClaimSubmitResult } from '@medguard360/nctracks';
import { logger, ValidationError } from '@medguard360/shared';

const DEFAULT_NC_MEDICAID_PAYER_IDS = ['NCXIX', 'NCMEDPAY', 'NCTRACKS', 'NC_MEDICAID', 'NCMEDICAID'];

function configuredNcMedicaidPayerIds(): Set<string> {
  const configured = process.env.NCTRACKS_PAYER_IDS?.split(',')
    .map((payerId) => payerId.trim().toUpperCase())
    .filter((payerId) => payerId.length > 0);

  return new Set(configured?.length ? configured : DEFAULT_NC_MEDICAID_PAYER_IDS);
}

export function hasNcMedicaidSubscriberId(medicaidId: string | undefined): boolean {
  const normalized = medicaidId?.trim();
  if (!normalized) return false;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return !uuidPattern.test(normalized) && /^[A-Z0-9]{6,}$/i.test(normalized);
}

export function shouldUseNctracks(stateCode: string, payerId: string): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  return stateCode.toUpperCase() === 'NC'
    && mode !== 'disabled'
    && configuredNcMedicaidPayerIds().has(payerId.trim().toUpperCase());
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
  const subscriberId = input.patientMedicaidId.trim();
  if (!hasNcMedicaidSubscriberId(subscriberId)) {
    throw new ValidationError('NCTracks claim submission requires a Medicaid member ID');
  }

  const adapter = createNctracksAdapter();
  const serviceIso = toIsoDate(input.serviceDate);

  const result = await adapter.submitClaim({
    claimType: 'professional',
    patientControlNumber: input.ccn,
    totalCharge: input.totalCharge,
    subscriberId,
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

  const rejected277 = result.ack277CA?.status === 'rejected'
    || result.ack277CA?.perClaim.some((claim) => claim.status === 'rejected') === true;
  if (result.ack999?.accepted === false || rejected277) {
    throw new ValidationError('NCTracks rejected claim submission', {
      ack999: result.ack999,
      ack277CA: result.ack277CA,
    });
  }

  return result;
}