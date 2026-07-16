/**
 * NC Medicaid eligibility via @medguard360/nctracks (270/271).
 * Used when stateCode === 'NC'. Real SOAP transport activates when GDIT
 * credentials are issued and NCTRACKS_MODE=soap.
 */

import { createNctracksAdapter } from '@medguard360/nctracks';
import { logger } from '@medguard360/shared';
import type { MmisLookupInput, MmisLookupResult } from './mmis';

const NC_MEDICAID_PAYER_IDS = new Set([
  'NCXIX',
  'NCMEDPAY',
  'NCTRACKS',
  'NC_MEDICAID',
  'NCMEDICAID',
]);

function isEnabled(): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  return mode !== 'disabled';
}

function normalized(value: string): string {
  return value.trim().toUpperCase();
}

export function isNcMedicaidOrChip(input: Pick<MmisLookupInput, 'coverageType' | 'payerId' | 'stateCode'>): boolean {
  const coverageType = input.coverageType ?? 'medicaid';
  const payerId = normalized(input.payerId);
  return input.stateCode.toUpperCase() === 'NC'
    && (coverageType === 'medicaid' || coverageType === 'chip')
    && (NC_MEDICAID_PAYER_IDS.has(payerId) || payerId.startsWith('NCXIX'));
}

export function shouldUseNctracks(input: MmisLookupInput | string): boolean {
  if (!isEnabled()) return false;
  if (typeof input === 'string') return input.toUpperCase() === 'NC';
  return isNcMedicaidOrChip(input) && Boolean(input.medicaidId?.trim());
}

export async function lookupNctracks(input: MmisLookupInput): Promise<MmisLookupResult> {
  if (!isNcMedicaidOrChip(input)) {
    throw new Error('NCTracks eligibility requires an NC Medicaid or CHIP payer');
  }
  const subscriberId = input.medicaidId?.trim();
  if (!subscriberId) {
    throw new Error('NCTracks eligibility requires a Medicaid member ID');
  }

  const adapter = createNctracksAdapter();
  const dateOfService = new Date().toISOString().slice(0, 10);

  const resp = await adapter.checkEligibility({
    subscriberId,
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