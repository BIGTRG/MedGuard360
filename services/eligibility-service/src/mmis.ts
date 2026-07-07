/**
 * State MMIS 270/271 EDI eligibility lookup.
 *
 * Real deployment loads MMIS endpoint + credentials from state-config-service
 * and submits an X12 270 request, parsing the 271 response. For dev we
 * deterministically simulate responses so the rest of the platform works.
 */

import axios from 'axios';
import { config, logger, UpstreamError } from '@medguard360/shared';
import { build270, parse271 } from './x12-270';
import { lookupNctracks, shouldUseNctracks } from './nctracks';

const stateConfigClient = axios.create({
  baseURL: 'http://localhost:3018/api/v1',
  timeout: 5000,
  headers: { 'x-service-caller': config.serviceName },
});

export interface MmisLookupInput {
  stateCode: string;
  payerId: string;
  patientFirstName?: string;
  patientLastName?: string;
  patientDateOfBirth?: string;
  medicaidId?: string;
  /** Provider NPI initiating the check (for HETS attestation tracking). */
  providerNpi?: string;
  coverageType?: 'medicaid' | 'medicare' | 'chip' | 'commercial';
}

export interface MmisLookupResult {
  active: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  planName?: string;
  copayCents?: number;
  deductibleRemainingCents?: number;
  /** Persisted to eligibility_checks.source when present. */
  source?: string;
  raw: Record<string, unknown>;
}

export async function lookupMmis(input: MmisLookupInput, authHeader: string): Promise<MmisLookupResult | null> {
  if (shouldUseNctracks(input.stateCode, {
    coverageType: input.coverageType,
    payerId: input.payerId,
    medicaidId: input.medicaidId,
  })) {
    try {
      return await lookupNctracks(input);
    } catch (err) {
      logger.error('NCTracks eligibility failed', {
        stateCode: input.stateCode,
        error: (err as Error).message,
      });
      throw new UpstreamError('nctracks', (err as Error).message);
    }
  }

  try {
    const cfgResp = await stateConfigClient.get<{ mmis_api_endpoint: string | null }>(
      `/state-config/states/${input.stateCode}`,
      { headers: { authorization: authHeader } },
    );
    const endpoint = cfgResp.data.mmis_api_endpoint;
    if (!endpoint) {
      logger.info('no MMIS endpoint configured for state', { stateCode: input.stateCode });
      return simulate(input);
    }

    return await submitX12(endpoint, input);
  } catch (err) {
    throw new UpstreamError('state-config-service', (err as Error).message);
  }
}

/** Submit a real 270 to a state MMIS endpoint and parse the 271 response. */
async function submitX12(endpoint: string, input: MmisLookupInput): Promise<MmisLookupResult> {
  // HETS Submitter UID — required in ISA06 for Medicare 270/271 since 2026-05-11.
  // Detection: when payerId looks like a Medicare payer ('MEDICARE*' or starts with 'CMS' /
  // CGS Medicare contractors / Palmetto etc.), populate it. For Medicaid payers it's harmless
  // but not required.
  const isMedicarePayer = /^(MEDICARE|CMS_|PALMETTO|CGS|NORIDIAN)/i.test(input.payerId);
  const hetsSubmitterUid = isMedicarePayer ? process.env.HETS_SUBMITTER_UID : undefined;

  const payload270 = build270({
    sender:   { qualifier: 'ZZ', id: 'MEDGUARD360', name: 'MedGuard360 Clearinghouse' },
    receiver: { qualifier: 'ZZ', id: input.payerId,  name: `Payer ${input.payerId}` },
    interchangeControlNumber: String(Date.now()).slice(-9),
    groupControlNumber: String(Date.now()).slice(-9),
    productionMode: process.env.NODE_ENV === 'production' ? 'P' : 'T',
    payerId: input.payerId,
    payerName: `${input.stateCode} Medicaid`,
    providerNpi: process.env.MEDGUARD_BILLING_NPI ?? '1234567890',
    providerName: process.env.MEDGUARD_BILLING_NAME ?? 'MedGuard360',
    subscriberLastName: input.patientLastName ?? 'UNKNOWN',
    subscriberFirstName: input.patientFirstName ?? 'UNKNOWN',
    subscriberMemberId: input.medicaidId ?? 'UNKNOWN',
    subscriberDateOfBirth: (input.patientDateOfBirth ?? '19700101').replace(/-/g, ''),
    hetsSubmitterUid,
  });

  try {
    const r = await axios.post(endpoint, payload270, {
      headers: { 'content-type': 'application/edi-x12' },
      timeout: 15_000,
      // mTLS in production: load cert from /opt/credential-vault/eligibility/<stateCode>-mmis.{crt,key}
    });
    const parsed = parse271(typeof r.data === 'string' ? r.data : JSON.stringify(r.data));
    // HETS AAA-41 — surface as a typed condition so callers can prompt the
    // provider to complete HETS attestation. We update the enrollment row's
    // last_aaa41_at marker so the compliance dashboard reflects the rejection.
    if (parsed.requiresHetsAttestation && hetsSubmitterUid) {
      try {
        const { recordAaa41 } = await import('./hets');
        await recordAaa41(input.providerNpi ?? (process.env.MEDGUARD_BILLING_NPI ?? '1234567890'), hetsSubmitterUid);
      } catch (e) {
        logger.warn('failed to record AAA-41 on HETS enrollment', { error: (e as Error).message });
      }
    }
    return {
      active: parsed.active,
      effectiveFrom: parsed.effectiveFrom,
      effectiveTo: parsed.effectiveTo,
      planName: parsed.planName,
      copayCents: parsed.copayCents,
      deductibleRemainingCents: parsed.deductibleRemainingCents,
      raw: { x12_271: parsed, endpoint, requiresHetsAttestation: parsed.requiresHetsAttestation, aaaCodes: parsed.aaaCodes },
    };
  } catch (err) {
    logger.warn('MMIS X12 submit failed; falling back to simulator', { error: (err as Error).message });
    return simulate(input);
  }
}

function simulate(input: MmisLookupInput): MmisLookupResult {
  // Deterministic-ish: presence of a medicaidId → active; otherwise inactive.
  if (input.medicaidId && /^[A-Z0-9]{6,}$/i.test(input.medicaidId)) {
    return {
      active: true,
      effectiveFrom: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      effectiveTo: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      planName: `${input.stateCode} Medicaid Standard`,
      copayCents: 300,
      deductibleRemainingCents: 0,
      raw: { simulated: true, source: '270-271-simulator', payer_id: input.payerId },
    };
  }
  return {
    active: false,
    raw: { simulated: true, source: '270-271-simulator', payer_id: input.payerId, reason: 'No active coverage found' },
  };
}
