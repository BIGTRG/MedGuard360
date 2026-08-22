/**
 * NC Medicaid eligibility via @medguard360/nctracks (270/271).
 * Used when stateCode === 'NC'. Real SOAP transport activates when GDIT
 * credentials are issued and NCTRACKS_MODE=soap.
 */

import { createNctracksAdapter } from '@medguard360/nctracks';
import { logger, ValidationError } from '@medguard360/shared';
import type { MmisLookupInput, MmisLookupResult } from './mmis';
import { recordEligibilityX12Audit } from './nctracks-audit';

const NC_MEDICAID_PAYER_IDS = new Set([
  'NCXIX',
  'NCCHIP',
  'NCTRACKS',
  'NCMEDICAID',
  'NC_MEDICAID',
  'NC-MEDICAID',
  'NCMMIS',
]);

function normalized(raw: string | undefined): string {
  return (raw ?? '').trim().toUpperCase();
}

export function isNcMedicaidPayer(payerId: string | undefined): boolean {
  const payer = normalized(payerId);
  return NC_MEDICAID_PAYER_IDS.has(payer) || payer.includes('MEDICAID') || payer.includes('CHIP');
}

export function isNctracksCoverage(coverageType: string | undefined): boolean {
  const coverage = normalized(coverageType);
  return coverage === '' || coverage === 'MEDICAID' || coverage === 'CHIP';
}

export function isValidNctracksRecipientId(value: string | undefined): value is string {
  const id = (value ?? '').trim();
  if (!id) return false;
  if (/^(UNKNOWN|UNSET|MISSING|PENDING|TEST|MEMBERID|MEDICAIDID)$/i.test(id)) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return false;
  return /^[A-Z0-9-]{6,20}$/i.test(id);
}

export function shouldUseNctracks(stateCode: string, payerId?: string, coverageType?: string): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  return stateCode.toUpperCase() === 'NC'
    && mode !== 'disabled'
    && isNcMedicaidPayer(payerId)
    && isNctracksCoverage(coverageType);
}

export async function lookupNctracks(input: MmisLookupInput): Promise<MmisLookupResult> {
  if (!isValidNctracksRecipientId(input.medicaidId)) {
    throw new ValidationError('NCTracks eligibility requires a real NC Medicaid/CHIP recipient ID');
  }
  const recipientId = input.medicaidId.trim();

  const adapter = createNctracksAdapter();
  const dateOfService = new Date().toISOString().slice(0, 10);

  const resp = await adapter.checkEligibility({
    subscriberId: recipientId,
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

  await recordEligibilityX12Audit({
    subscriberId: recipientId,
    traceId: resp.traceId,
    adapterMode: adapter.mode,
    raw271: resp.raw271,
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