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
  'NCMEDPAY',
  'NCMEDICAID',
  'NCTRACKS',
  'NCTRACKSMEDICAID',
  'NCCHIP',
  'NCHEALTHCHOICE',
]);

const PLACEHOLDER_RECIPIENT_IDS = new Set([
  'UNKNOWN',
  'MISSING',
  'NONE',
  'NULL',
  'N/A',
  'NA',
  'TBD',
  'TEST',
]);

function normalizePayerId(payerId: string): string {
  return payerId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

export function isKnownNcMedicaidPayer(payerId: string): boolean {
  return NC_MEDICAID_PAYER_IDS.has(normalizePayerId(payerId));
}

export function hasUsableNcRecipientId(medicaidId: string | undefined): medicaidId is string {
  const normalized = medicaidId?.trim();
  if (!normalized) return false;
  const upper = normalized.toUpperCase();
  if (PLACEHOLDER_RECIPIENT_IDS.has(upper)) return false;
  if (/^0+$/.test(normalized)) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized)) {
    return false;
  }
  return /^[A-Z0-9-]{6,}$/i.test(normalized);
}

export function shouldUseNctracks(stateCode: string, payerId?: string, coverageType?: string): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  if (stateCode.toUpperCase() !== 'NC' || mode === 'disabled') return false;
  if (payerId === undefined && coverageType === undefined) return true;
  if (!payerId || !isKnownNcMedicaidPayer(payerId)) return false;
  if (!coverageType) return true;
  return ['medicaid', 'chip'].includes(coverageType.toLowerCase());
}

export async function lookupNctracks(input: MmisLookupInput): Promise<MmisLookupResult> {
  if (!shouldUseNctracks(input.stateCode, input.payerId, input.coverageType)) {
    throw new ValidationError('NCTracks eligibility requires NC Medicaid/CHIP payer context', {
      stateCode: input.stateCode,
      payerId: input.payerId,
      coverageType: input.coverageType,
    });
  }
  if (!hasUsableNcRecipientId(input.medicaidId)) {
    throw new ValidationError('NCTracks eligibility requires a real NC Medicaid recipient ID');
  }

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

  await recordEligibilityX12Audit({
    subscriberId: input.medicaidId,
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