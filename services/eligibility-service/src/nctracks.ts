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
  'NCTRACKS',
  'NCMEDICAID',
  'NCMEDICAIDDIRECT',
  'NCCHIP',
  'NCHEALTHCHOICE',
  'NCAMERIHEALTH',
  'NCHEALTHYBLUE',
  'NCUHC',
  'NCWELLCARE',
  'NCCAROLINACOMPLETE',
  'NCTRILLIUM',
  'NCVAYA',
  'NCALLIANCE',
  'NCPARTNERS',
  'NCEASTPOINTE',
  'NCSANDHILLS',
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLACEHOLDER_RECIPIENT_IDS = new Set(['UNKNOWN', 'N/A', 'NA', 'NONE', 'NULL', 'UNSET', 'PENDING']);

function normalizePayerId(payerId: string): string {
  return payerId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

export function isKnownNcMedicaidPayer(payerId: string): boolean {
  const normalized = normalizePayerId(payerId);
  return NC_MEDICAID_PAYER_IDS.has(normalized)
    || (normalized.startsWith('NC') && normalized.includes('MEDICAID'));
}

export function isNcMedicaidCoverage(coverageType?: string): boolean {
  if (!coverageType) return true;
  return coverageType.toLowerCase() === 'medicaid' || coverageType.toLowerCase() === 'chip';
}

export function validateNcMedicaidRecipientId(medicaidId?: string): string {
  const trimmed = medicaidId?.trim();
  if (!trimmed || PLACEHOLDER_RECIPIENT_IDS.has(trimmed.toUpperCase()) || UUID_RE.test(trimmed)) {
    throw new ValidationError('NCTracks eligibility requires a real NC Medicaid recipient ID');
  }
  return trimmed;
}

export function shouldUseNctracks(stateCode: string, payerId?: string, coverageType?: string): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  if (stateCode.toUpperCase() !== 'NC' || mode === 'disabled') return false;
  if (!payerId || !isKnownNcMedicaidPayer(payerId)) return false;
  return isNcMedicaidCoverage(coverageType);
}

export async function lookupNctracks(input: MmisLookupInput): Promise<MmisLookupResult> {
  const adapter = createNctracksAdapter();
  const dateOfService = new Date().toISOString().slice(0, 10);
  const subscriberId = validateNcMedicaidRecipientId(input.medicaidId);

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

  await recordEligibilityX12Audit({
    subscriberId,
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