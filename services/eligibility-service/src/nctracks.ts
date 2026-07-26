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
  'NCMEDICAID',
  'NCMMIS',
  'NCTRACKS',
  'NCCHIP',
  'NCHEALTHCHOICE',
]);

const PLACEHOLDER_MEMBER_IDS = new Set(['UNKNOWN', 'N/A', 'NA', 'NONE', 'NULL', 'TBD']);

function normalizePayerId(payerId: string | undefined): string {
  return (payerId ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}

export function isRealNcMedicaidId(medicaidId: string | undefined): boolean {
  const id = medicaidId?.trim();
  if (!id) return false;
  if (PLACEHOLDER_MEMBER_IDS.has(id.toUpperCase())) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return false;
  }
  return /^[a-z0-9-]{6,}$/i.test(id);
}

export function shouldUseNctracks(
  stateCode: string,
  payerId?: string,
  coverageType?: string,
): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  const normalizedPayerId = normalizePayerId(payerId);
  const normalizedCoverageType = coverageType?.toLowerCase();
  const isMedicaidCoverage = normalizedCoverageType === undefined
    || normalizedCoverageType === 'medicaid'
    || normalizedCoverageType === 'chip';
  return stateCode.toUpperCase() === 'NC'
    && mode !== 'disabled'
    && isMedicaidCoverage
    && NC_MEDICAID_PAYER_IDS.has(normalizedPayerId);
}

export async function lookupNctracks(input: MmisLookupInput): Promise<MmisLookupResult> {
  if (!isRealNcMedicaidId(input.medicaidId)) {
    throw new Error('NCTracks eligibility requires a real NC Medicaid member ID');
  }
  const medicaidId = input.medicaidId!.trim();

  const adapter = createNctracksAdapter();
  const dateOfService = new Date().toISOString().slice(0, 10);

  const resp = await adapter.checkEligibility({
    subscriberId: medicaidId,
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