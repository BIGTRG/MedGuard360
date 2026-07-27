/**
 * NC Medicaid claim submission via @medguard360/nctracks (837P batch / stub).
 * Real SFTP transport activates when GDIT credentials are issued and NCTRACKS_MODE=sftp.
 */

import { createNctracksAdapter, type ClaimSubmitResult } from '@medguard360/nctracks';
import { logger, ValidationError } from '@medguard360/shared';

const ncMedicaidPayerIds = new Set(['NCXIX', 'NCMEDPAY']);
const placeholderMemberIds = new Set(['UNKNOWN', 'PENDING', 'TBD', 'N/A', 'NA', 'NULL']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizedPayerIds(): Set<string> {
  const ids = new Set(ncMedicaidPayerIds);
  const configuredReceiver = process.env.NCTRACKS_RECEIVER_ID?.trim().toUpperCase();
  if (configuredReceiver) ids.add(configuredReceiver);
  return ids;
}

function isUsableNcMemberId(memberId: string): boolean {
  const normalized = memberId.trim().toUpperCase();
  if (!normalized) return false;
  if (placeholderMemberIds.has(normalized)) return false;
  if (uuidPattern.test(normalized)) return false;
  return /^[A-Z0-9-]{6,30}$/.test(normalized);
}

export function shouldUseNctracks(stateCode: string, payerId?: string): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  if (mode === 'disabled' || stateCode.toUpperCase() !== 'NC') return false;
  if (!payerId) return false;
  return normalizedPayerIds().has(payerId.trim().toUpperCase());
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
    modifier_codes?: string[];
    units: number;
    charge_amount: number;
    service_date: string;
    place_of_service?: string;
    diagnosis_pointers?: number[];
  }>;
}

function toIsoDate(raw: string): string {
  const d = raw.replace(/-/g, '');
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Date().toISOString().slice(0, 10);
}

export async function submitNcClaim(input: NcClaimSubmitInput): Promise<ClaimSubmitResult> {
  if (!isUsableNcMemberId(input.patientMedicaidId)) {
    throw new ValidationError('NCTracks claim submission requires a valid NC Medicaid member ID');
  }

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
      modifiers: line.modifier_codes?.length ? line.modifier_codes : undefined,
      units: line.units,
      charge: line.charge_amount,
      serviceDate: toIsoDate(line.service_date),
      placeOfService: line.place_of_service,
      diagnosisPointers: line.diagnosis_pointers ?? [1],
    })),
  });

  if (result.ack999 && !result.ack999.accepted) {
    throw new ValidationError('NCTracks rejected claim syntax in 999 acknowledgement', {
      errors: result.ack999.errors,
    });
  }
  if (result.ack277CA?.status === 'rejected') {
    throw new ValidationError('NCTracks rejected claim in 277CA acknowledgement', {
      perClaim: result.ack277CA.perClaim,
    });
  }

  logger.info('nctracks claim submit', {
    mode: adapter.mode,
    ccn: input.ccn,
    fileName: result.fileName,
    isa13: result.interchangeControlNumber,
    ack999Accepted: result.ack999?.accepted,
  });

  return result;
}