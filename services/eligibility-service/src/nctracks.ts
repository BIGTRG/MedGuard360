/**
 * NC Medicaid eligibility via @medguard360/nctracks (270/271).
 * Used when stateCode === 'NC'. Real SOAP transport activates when GDIT
 * credentials are issued and NCTRACKS_MODE=soap.
 */

import { createNctracksAdapter } from '@medguard360/nctracks';
import { logger } from '@medguard360/shared';
import type { MmisLookupInput, MmisLookupResult } from './mmis';

type EligibilityCoverageType = 'medicaid' | 'medicare' | 'chip' | 'commercial';

interface NctracksEligibilityRoutingInput {
  stateCode: string;
  payerId: string;
  coverageType?: EligibilityCoverageType;
  medicaidId?: string;
}

const NC_MEDICAID_PAYER_IDS = new Set([
  'NCXIX',
  'NCMEDICAID',
  'NCMEDICAIDDIRECT',
  'NCMEDICAIDMANAGEDCARE',
  'NCTRACKS',
  'NCCHIP',
  'NCHC',
  'NCHEALTHCHOICE',
]);

function normalizePayerId(payerId: string): string {
  return payerId.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isNcMedicaidOrChipPayer(payerId: string): boolean {
  return NC_MEDICAID_PAYER_IDS.has(normalizePayerId(payerId));
}

function hasMemberId(medicaidId?: string): boolean {
  return Boolean(medicaidId?.trim());
}

export function shouldUseNctracks(input: NctracksEligibilityRoutingInput): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  const coverageType = input.coverageType ?? 'medicaid';

  return input.stateCode.toUpperCase() === 'NC'
    && mode !== 'disabled'
    && (coverageType === 'medicaid' || coverageType === 'chip')
    && isNcMedicaidOrChipPayer(input.payerId)
    && hasMemberId(input.medicaidId);
}

export async function lookupNctracks(input: MmisLookupInput): Promise<MmisLookupResult> {
  const subscriberId = input.medicaidId?.trim();

  if (!subscriberId) {
    throw new Error('NCTracks eligibility requires a Medicaid/member ID');
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