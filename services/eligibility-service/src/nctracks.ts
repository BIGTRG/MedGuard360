/**
 * NC Medicaid eligibility via @medguard360/nctracks (270/271).
 * Used when stateCode === 'NC'. Real SOAP transport activates when GDIT
 * credentials are issued and NCTRACKS_MODE=soap.
 */

import { createNctracksAdapter } from '@medguard360/nctracks';
import { logger, ValidationError } from '@medguard360/shared';
import type { MmisLookupInput, MmisLookupResult } from './mmis';
import { recordEligibilityX12Audit } from './nctracks-audit';

const NCTRACKS_PAYER_IDS = new Set([
  'NCXIX',
  'NCMEDPAY',
  'NCMEDICAID',
  'NCMEDICAIDPAY',
]);

function normalizePayerId(payerId: string): string {
  return payerId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isNctracksPayer(payerId?: string): boolean {
  if (!payerId) return false;
  return NCTRACKS_PAYER_IDS.has(normalizePayerId(payerId));
}

export function isValidNctracksRecipientId(medicaidId?: string): boolean {
  const value = medicaidId?.trim();
  if (!value) return false;
  if (/^(UNKNOWN|N\/A|NA|NONE|NULL|PENDING)$/i.test(value)) return false;
  if (/^0+$/.test(value)) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return false;
  return /^[A-Z0-9]{6,}$/i.test(value);
}

export function shouldUseNctracks(stateCode: string, payerId?: string, coverageType?: string): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  if (stateCode.toUpperCase() !== 'NC' || mode === 'disabled') return false;
  if (coverageType && !['medicaid', 'chip'].includes(coverageType.toLowerCase())) return false;
  return payerId ? isNctracksPayer(payerId) : true;
}

export async function lookupNctracks(input: MmisLookupInput): Promise<MmisLookupResult> {
  const subscriberId = input.medicaidId?.trim() ?? '';
  if (!isValidNctracksRecipientId(subscriberId)) {
    throw new ValidationError('A valid NC Medicaid recipient ID is required for NCTracks eligibility checks');
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