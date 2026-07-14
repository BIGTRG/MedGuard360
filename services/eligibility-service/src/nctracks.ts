/**
 * NC Medicaid eligibility via @medguard360/nctracks (270/271).
 * Used when stateCode === 'NC'. Real SOAP transport activates when GDIT
 * credentials are issued and NCTRACKS_MODE=soap.
 */

import { createNctracksAdapter } from '@medguard360/nctracks';
import { logger } from '@medguard360/shared';
import type { MmisLookupInput, MmisLookupResult } from './mmis';

type NctracksCoverageType = 'medicaid' | 'chip' | 'medicare' | 'commercial';

interface NctracksRoutingInput {
  stateCode: string;
  payerId?: string;
  coverageType?: NctracksCoverageType;
  medicaidId?: string;
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

function hasMemberId(medicaidId?: string): boolean {
  const normalized = (medicaidId ?? '').trim().toUpperCase();
  return normalized.length > 0 && normalized !== 'UNKNOWN';
}

export function shouldUseNctracks(input: NctracksRoutingInput): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  const isMedicaidCoverage = input.coverageType === undefined
    || input.coverageType === 'medicaid'
    || input.coverageType === 'chip';
  return input.stateCode.toUpperCase() === 'NC'
    && mode !== 'disabled'
    && isMedicaidCoverage
    && isNcMedicaidPayer(input.payerId)
    && hasMemberId(input.medicaidId);
}

export async function lookupNctracks(input: MmisLookupInput): Promise<MmisLookupResult> {
  const adapter = createNctracksAdapter();
  const dateOfService = new Date().toISOString().slice(0, 10);

  const resp = await adapter.checkEligibility({
    subscriberId: input.medicaidId ?? 'UNKNOWN',
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