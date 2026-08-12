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
  'NC_MEDICAID',
  'NCMEDICAID',
  'NCMEDPAY',
  'NC_MEDICAID_DIRECT',
  'NCCHIP',
  'NC_CHIP',
  'NC_HEALTH_CHOICE',
  'NCHEALTHCHOICE',
]);

const PLACEHOLDER_RECIPIENT_IDS = new Set([
  'UNKNOWN',
  'N/A',
  'NA',
  'NONE',
  'NULL',
  'UNAVAILABLE',
  'PENDING',
  'TEST',
  '000000',
  '0000000000',
]);

function normalize(raw?: string): string {
  return (raw ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}

export function isNcMedicaidPayer(payerId?: string, coverageType?: string): boolean {
  const normalizedPayer = normalize(payerId);
  const normalizedCoverage = normalize(coverageType);
  const isMedicaidCoverage = normalizedCoverage === 'MEDICAID' || normalizedCoverage === 'CHIP';

  if (!normalizedPayer) return isMedicaidCoverage;
  if (NC_MEDICAID_PAYER_IDS.has(normalizedPayer)) return true;
  if (normalizedPayer.startsWith('NCXIX')) return true;
  if (normalizedPayer.startsWith('NCMED') || normalizedPayer.startsWith('NC_MED')) return true;
  if (normalizedPayer.startsWith('NCCHIP') || normalizedPayer.startsWith('NC_CHIP')) return true;
  return isMedicaidCoverage && normalizedPayer.includes('MEDICAID');
}

export function isValidNcRecipientId(medicaidId?: string): boolean {
  const trimmed = (medicaidId ?? '').trim();
  const normalized = normalize(trimmed);
  if (!trimmed || PLACEHOLDER_RECIPIENT_IDS.has(normalized)) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)) {
    return false;
  }
  return /^[A-Z0-9]{6,20}$/i.test(trimmed);
}

export function shouldUseNctracks(stateCode: string, payerId?: string, coverageType?: string): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  return stateCode.toUpperCase() === 'NC'
    && mode !== 'disabled'
    && isNcMedicaidPayer(payerId, coverageType);
}

export async function lookupNctracks(input: MmisLookupInput): Promise<MmisLookupResult> {
  if (!isValidNcRecipientId(input.medicaidId)) {
    throw new ValidationError('NCTracks eligibility requires a real NC Medicaid recipient ID');
  }

  const adapter = createNctracksAdapter();
  const dateOfService = new Date().toISOString().slice(0, 10);
  const subscriberId = input.medicaidId?.trim() ?? '';

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