/**
 * NC Medicaid eligibility via @medguard360/nctracks (270/271).
 * Used when stateCode === 'NC'. Real SOAP transport activates when GDIT
 * credentials are issued and NCTRACKS_MODE=soap.
 */

import { createNctracksAdapter } from '@medguard360/nctracks';
import { logger } from '@medguard360/shared';
import type { MmisLookupInput, MmisLookupResult } from './mmis';

interface NctracksRoutingInput {
  stateCode: string;
  payerId?: string;
  coverageType?: string;
  medicaidId?: string;
}

const NC_MEDICAID_PAYER_IDS = new Set([
  'NCXIX',
  'NC_MEDICAID',
  'NC_MEDICAID_FFS',
  'NCMEDICAID',
  'NCMEDPAY',
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizePayerId(payerId: string): string {
  return payerId.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function isNcMedicaidPayer(payerId?: string): boolean {
  if (!payerId) return false;
  const normalized = normalizePayerId(payerId);
  return NC_MEDICAID_PAYER_IDS.has(normalized) || normalized.includes('MEDICAID');
}

function hasRealMedicaidId(medicaidId?: string): boolean {
  const id = medicaidId?.trim();
  return Boolean(id && id.toUpperCase() !== 'UNKNOWN' && !UUID_RE.test(id));
}

export function shouldUseNctracks(input: NctracksRoutingInput): boolean;
export function shouldUseNctracks(stateCode: string): boolean;
export function shouldUseNctracks(inputOrStateCode: NctracksRoutingInput | string): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  if (mode === 'disabled') return false;

  const input = typeof inputOrStateCode === 'string'
    ? { stateCode: inputOrStateCode }
    : inputOrStateCode;

  if (input.stateCode.toUpperCase() !== 'NC') return false;

  if (input.coverageType && !['medicaid', 'chip'].includes(input.coverageType.toLowerCase())) {
    return false;
  }

  if (input.payerId && !isNcMedicaidPayer(input.payerId)) {
    return false;
  }

  if (typeof inputOrStateCode !== 'string' && !hasRealMedicaidId(input.medicaidId)) {
    return false;
  }

  return true;
}

export async function lookupNctracks(input: MmisLookupInput): Promise<MmisLookupResult> {
  if (!hasRealMedicaidId(input.medicaidId)) {
    throw new Error('NCTracks eligibility requires a real NC Medicaid member ID');
  }

  const adapter = createNctracksAdapter();
  const dateOfService = new Date().toISOString().slice(0, 10);
  const subscriberId = input.medicaidId!.trim();

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