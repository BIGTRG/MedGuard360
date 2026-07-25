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
  'NCTRACKS',
  'NCMMIS',
  'NCMEDICAID',
  'NCMEDICAIDMMIS',
  'NCCHIP',
  'NCHEALTHCHOICE',
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NC_MEDICAID_ID_PATTERN = /^[A-Z0-9]{6,20}$/i;

function normalizePayerId(payerId: string): string {
  return payerId.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isNcMedicaidPayer(payerId: string): boolean {
  const normalized = normalizePayerId(payerId);
  return NC_MEDICAID_PAYER_IDS.has(normalized)
    || (normalized.startsWith('NC') && normalized.includes('MEDICAID'));
}

export function assertValidNcMedicaidId(medicaidId: string | undefined): asserts medicaidId is string {
  if (!medicaidId || medicaidId.toUpperCase() === 'UNKNOWN') {
    throw new ValidationError('NCTracks eligibility requires an NC Medicaid member ID');
  }
  if (UUID_PATTERN.test(medicaidId) || !NC_MEDICAID_ID_PATTERN.test(medicaidId)) {
    throw new ValidationError('NCTracks eligibility requires a valid NC Medicaid member ID');
  }
}

export function shouldUseNctracks(stateCode: string, payerId?: string, coverageType = 'medicaid'): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  if (stateCode.toUpperCase() !== 'NC' || mode === 'disabled') return false;
  if (coverageType !== 'medicaid' && coverageType !== 'chip') return false;
  return payerId !== undefined && isNcMedicaidPayer(payerId);
}

export async function lookupNctracks(input: MmisLookupInput): Promise<MmisLookupResult> {
  if (!isNcMedicaidPayer(input.payerId)) {
    throw new ValidationError('NCTracks eligibility is only available for NC Medicaid and CHIP payers');
  }
  assertValidNcMedicaidId(input.medicaidId);

  const adapter = createNctracksAdapter();
  const dateOfService = new Date().toISOString().slice(0, 10);

  const resp = await adapter.checkEligibility({
    subscriberId: input.medicaidId,
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