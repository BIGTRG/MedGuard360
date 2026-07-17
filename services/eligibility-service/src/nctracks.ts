/**
 * NC Medicaid eligibility via @medguard360/nctracks (270/271).
 * Used when stateCode === 'NC'. Real SOAP transport activates when GDIT
 * credentials are issued and NCTRACKS_MODE=soap.
 */

import { createNctracksAdapter } from '@medguard360/nctracks';
import { logger, ValidationError } from '@medguard360/shared';
import type { MmisLookupInput, MmisLookupResult } from './mmis';

const NC_MEDICAID_PAYER_IDS = new Set([
  'NCXIX',
  'NCMEDPAY',
  'NCMEDICAID',
  'NCTRACKS',
  'NCCHIP',
]);

function normalizePayerId(payerId: string | undefined): string {
  return (payerId ?? '').trim().toUpperCase().replace(/[\s_-]/g, '');
}

export function isNcMedicaidPayer(payerId: string | undefined): boolean {
  const normalized = normalizePayerId(payerId);
  return NC_MEDICAID_PAYER_IDS.has(normalized);
}

export function hasRealMemberId(memberId: string | undefined): memberId is string {
  const normalized = (memberId ?? '').trim().toUpperCase();
  return /^[A-Z0-9]{6,}$/.test(normalized) && normalized !== 'UNKNOWN';
}

function isMedicaidCoverage(coverageType: string | undefined): boolean {
  const normalized = (coverageType ?? 'medicaid').trim().toLowerCase();
  return normalized === 'medicaid' || normalized === 'chip';
}

export function shouldUseNctracks(input: MmisLookupInput): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  return input.stateCode.toUpperCase() === 'NC'
    && mode !== 'disabled'
    && isMedicaidCoverage(input.coverageType)
    && isNcMedicaidPayer(input.payerId)
    && hasRealMemberId(input.medicaidId);
}

export async function lookupNctracks(input: MmisLookupInput): Promise<MmisLookupResult> {
  if (!hasRealMemberId(input.medicaidId)) {
    throw new ValidationError('NCTracks eligibility requires a real Medicaid/member ID');
  }

  const adapter = createNctracksAdapter();
  const dateOfService = new Date().toISOString().slice(0, 10);

  const resp = await adapter.checkEligibility({
    subscriberId: input.medicaidId.trim(),
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