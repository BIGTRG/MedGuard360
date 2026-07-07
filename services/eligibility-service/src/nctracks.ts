/**
 * NC Medicaid eligibility via @medguard360/nctracks (270/271).
 * Used when stateCode === 'NC'. Real SOAP transport activates when GDIT
 * credentials are issued and NCTRACKS_MODE=soap.
 */

import { createNctracksAdapter } from '@medguard360/nctracks';
import { logger } from '@medguard360/shared';
import type { MmisLookupInput, MmisLookupResult } from './mmis';

type CoverageType = 'medicaid' | 'medicare' | 'chip' | 'commercial';

interface NctracksRoutingOptions {
  coverageType?: CoverageType;
  payerId?: string;
  medicaidId?: string;
}

function isNcMedicaidPayer(payerId: string): boolean {
  const normalized = payerId.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return normalized === 'NCXIX'
    || normalized === 'NCMEDICAID'
    || normalized === 'NCMEDPAY'
    || normalized.startsWith('NCSP')
    || normalized.startsWith('NCTP')
    || normalized.includes('MEDICAID');
}

export function shouldUseNctracks(stateCode: string, options: NctracksRoutingOptions = {}): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  if (stateCode.toUpperCase() !== 'NC' || mode === 'disabled') return false;
  if (options.coverageType && !['medicaid', 'chip'].includes(options.coverageType)) return false;
  if (options.payerId && !isNcMedicaidPayer(options.payerId)) return false;
  if (options.medicaidId !== undefined && options.medicaidId.trim().length === 0) return false;
  return true;
}

export async function lookupNctracks(input: MmisLookupInput): Promise<MmisLookupResult> {
  const subscriberId = input.medicaidId?.trim();
  if (!subscriberId) {
    return {
      active: false,
      source: 'nctracks_270_271',
      raw: {
        source: 'nctracks',
        status: 'error',
        payer_id: input.payerId,
        reason: 'missing_medicaid_id',
      },
    };
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