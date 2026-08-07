/**
 * NC Medicaid eligibility via @medguard360/nctracks (270/271).
 * Used when stateCode === 'NC'. Real SOAP transport activates when GDIT
 * credentials are issued and NCTRACKS_MODE=soap.
 */

import { createNctracksAdapter } from '@medguard360/nctracks';
import { logger, ValidationError } from '@medguard360/shared';
import type { MmisLookupInput, MmisLookupResult } from './mmis';
import { recordEligibilityX12Audit } from './nctracks-audit';

const KNOWN_NCTRACKS_PAYER_IDS = new Set([
  'NCXIX',
  'NCMEDPAY',
  'NCMEDICAID',
  'NC_MEDICAID',
  'MEDICAID_NC',
  'NCCHIP',
  'NC_CHIP',
  'NCHC',
  'NC_HEALTH_CHOICE',
  'NC_SP_HEALTHYBLUE',
  'PHP_HEALTHY_BLUE',
  'NC_SP_AMERIHEALTH',
  'NC_SP_CAROLINA_COMPLETE',
  'NC_SP_UNITED',
  'NC_SP_WELLCARE',
  'TP_ALLIANCE',
  'TP_PARTNERS',
  'TP_TRILLIUM',
  'TP_VAYA',
]);

function normalizePayerId(payerId?: string): string {
  return (payerId ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}

export function isKnownNctracksPayer(payerId?: string): boolean {
  const normalized = normalizePayerId(payerId);
  if (!normalized) return false;
  return KNOWN_NCTRACKS_PAYER_IDS.has(normalized)
    || (normalized.includes('NC') && (
      normalized.includes('MEDICAID')
      || normalized.includes('CHIP')
      || normalized.includes('HEALTH_CHOICE')
    ));
}

export function normalizeNctracksRecipientId(medicaidId?: string): string | null {
  const recipientId = medicaidId?.trim();
  if (!recipientId) return null;
  const upper = recipientId.toUpperCase();
  if (['UNKNOWN', 'N/A', 'NA', 'NONE', 'NULL', 'MISSING', 'TBD'].includes(upper)) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(recipientId)) {
    return null;
  }
  return /^[A-Z0-9][A-Z0-9-]{5,24}$/i.test(recipientId) ? recipientId : null;
}

export function shouldUseNctracks(stateCode: string, payerId?: string, coverageType?: string): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  if (stateCode.toUpperCase() !== 'NC' || mode === 'disabled') return false;
  if (isKnownNctracksPayer(payerId)) return true;
  const coverage = coverageType?.trim().toLowerCase();
  return (coverage === 'medicaid' || coverage === 'chip') && isKnownNctracksPayer(payerId);
}

export async function lookupNctracks(input: MmisLookupInput): Promise<MmisLookupResult> {
  const subscriberId = normalizeNctracksRecipientId(input.medicaidId);
  if (!subscriberId) {
    throw new ValidationError('NCTracks eligibility requires a valid NC Medicaid recipient ID');
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