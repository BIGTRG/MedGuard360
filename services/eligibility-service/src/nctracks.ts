/**
 * NC Medicaid eligibility via @medguard360/nctracks (270/271).
 * Used when stateCode === 'NC'. Real SOAP transport activates when GDIT
 * credentials are issued and NCTRACKS_MODE=soap.
 */

import { createNctracksAdapter } from '@medguard360/nctracks';
import { logger, ValidationError } from '@medguard360/shared';
import type { MmisLookupInput, MmisLookupResult } from './mmis';

const ncMedicaidPayerIds = new Set(['NCXIX', 'NCMEDPAY']);
const ncMedicaidCoverageTypes = new Set(['medicaid', 'chip']);
const placeholderMemberIds = new Set(['UNKNOWN', 'PENDING', 'TBD', 'N/A', 'NA', 'NULL']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizedPayerIds(): Set<string> {
  const ids = new Set(ncMedicaidPayerIds);
  const configuredReceiver = process.env.NCTRACKS_RECEIVER_ID?.trim().toUpperCase();
  if (configuredReceiver) ids.add(configuredReceiver);
  return ids;
}

function isUsableNcMemberId(memberId?: string): memberId is string {
  const normalized = memberId?.trim().toUpperCase();
  if (!normalized) return false;
  if (placeholderMemberIds.has(normalized)) return false;
  if (uuidPattern.test(normalized)) return false;
  return /^[A-Z0-9-]{6,30}$/.test(normalized);
}

export function shouldUseNctracks(stateCode: string, payerId?: string, coverageType?: string): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  if (mode === 'disabled' || stateCode.toUpperCase() !== 'NC') return false;
  if (coverageType && !ncMedicaidCoverageTypes.has(coverageType.toLowerCase())) return false;
  if (!payerId) return false;
  return normalizedPayerIds().has(payerId.trim().toUpperCase());
}

export async function lookupNctracks(input: MmisLookupInput): Promise<MmisLookupResult> {
  if (!shouldUseNctracks(input.stateCode, input.payerId, input.coverageType)) {
    throw new ValidationError('NCTracks eligibility requires an NC Medicaid or CHIP payer context');
  }
  const memberId = input.medicaidId;
  if (!isUsableNcMemberId(memberId)) {
    throw new ValidationError('NCTracks eligibility requires a valid NC Medicaid member ID');
  }

  const adapter = createNctracksAdapter();
  const dateOfService = new Date().toISOString().slice(0, 10);

  const resp = await adapter.checkEligibility({
    subscriberId: memberId,
    dateOfService,
    firstName: input.patientFirstName,
    lastName: input.patientLastName,
    dob: input.patientDateOfBirth,
    providerNpi: input.providerNpi ?? process.env.MEDGUARD_BILLING_NPI ?? undefined,
    traceId: `MG360-NC-${Date.now()}`,
  });

  logger.info('nctracks eligibility response', {
    mode: adapter.mode,
    status: resp.status,
    traceId: resp.traceId,
    benefitPlan: resp.benefitPlan,
  });

  const copay = resp.coverageDetails.find((d) => d.serviceTypeCode === '30')?.copay
    ?? resp.coverageDetails[0]?.copay
    ?? 0;

  const planName = resp.managedCareEnrollment?.planName
    ?? resp.benefitPlan
    ?? 'NC Medicaid';

  return {
    active: resp.status === 'active',
    effectiveFrom: resp.managedCareEnrollment?.effectiveDate,
    effectiveTo: resp.managedCareEnrollment?.termDate,
    planName,
    copayCents: Math.round(copay * 100),
    deductibleRemainingCents: 0,
    source: 'nctracks_270_271',
    raw: {
      source: 'nctracks',
      mode: adapter.mode,
      traceId: resp.traceId,
      status: resp.status,
      benefitPlan: resp.benefitPlan,
      managedCareEnrollment: resp.managedCareEnrollment,
      aaaRejection: resp.aaaRejection,
      raw271: resp.raw271,
      payer_id: input.payerId,
    },
  };
}