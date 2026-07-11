/**
 * NC Medicaid eligibility via @medguard360/nctracks (270/271).
 * Used when stateCode === 'NC'. Real SOAP transport activates when GDIT
 * credentials are issued and NCTRACKS_MODE=soap.
 */

import { createNctracksAdapter } from '@medguard360/nctracks';
import { logger, ValidationError } from '@medguard360/shared';
import type { MmisLookupInput, MmisLookupResult } from './mmis';

const DEFAULT_NC_MEDICAID_PAYER_IDS = ['NCXIX', 'NCMEDPAY', 'NCTRACKS', 'NC_MEDICAID', 'NCMEDICAID'];

function configuredNcMedicaidPayerIds(): Set<string> {
  const configured = process.env.NCTRACKS_PAYER_IDS?.split(',')
    .map((payerId) => payerId.trim().toUpperCase())
    .filter((payerId) => payerId.length > 0);

  return new Set(configured?.length ? configured : DEFAULT_NC_MEDICAID_PAYER_IDS);
}

export function isNcMedicaidPayer(payerId: string): boolean {
  const normalized = payerId.trim().toUpperCase();
  return configuredNcMedicaidPayerIds().has(normalized);
}

export function hasNcMedicaidSubscriberId(medicaidId: string | undefined): boolean {
  const normalized = medicaidId?.trim();
  if (!normalized) return false;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return !uuidPattern.test(normalized) && /^[A-Z0-9]{6,}$/i.test(normalized);
}

export function shouldUseNctracks(stateCode: string, payerId: string, coverageType: string): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  const normalizedCoverageType = coverageType.toLowerCase();
  const isMedicaidCoverage = normalizedCoverageType === 'medicaid' || normalizedCoverageType === 'chip';
  return stateCode.toUpperCase() === 'NC'
    && mode !== 'disabled'
    && isMedicaidCoverage
    && isNcMedicaidPayer(payerId);
}

export async function lookupNctracks(input: MmisLookupInput): Promise<MmisLookupResult> {
  const subscriberId = input.medicaidId?.trim();
  if (!hasNcMedicaidSubscriberId(subscriberId) || !subscriberId) {
    throw new ValidationError('NCTracks eligibility checks require a Medicaid member ID');
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