/**
 * Clearinghouse submission adapter for 837P claims.
 *
 * Supported clearinghouses:
 *   - change_healthcare  (REST via Change Healthcare Medical Network)
 *   - availity           (REST via Availity Essentials API)
 *   - trizetto           (SFTP — claim batches uploaded to vendor dropbox)
 *   - generic_rest       (any vendor that accepts EDI POST)
 *   - stub               (logs only — dev default)
 *
 * Each clearinghouse returns acknowledgments (999) and status (277CA) on a
 * separate timeline, usually fetched via callback or polling. We persist:
 *   claims.edi_payload          — the 837P we generated
 *   claims.status               — 'submitted' immediately
 *   on response → status becomes 'paid' / 'denied' via 835 remit parsing
 */

import { logger } from '@medguard360/shared';

export type Clearinghouse = 'change_healthcare' | 'availity' | 'trizetto' | 'generic_rest' | 'stub';

export interface SubmissionResult {
  ok: boolean;
  clearinghouse: Clearinghouse;
  /** Vendor's transaction id for this submission (used later to correlate 999/277/835). */
  vendorSubmissionId: string;
  /** Original ISA control number for our records. */
  ourControlNumber: string;
  acknowledgmentReceivedAt?: string;
  error?: string;
}

export function activeClearinghouse(payerId?: string): Clearinghouse {
  if (payerId) {
    const override = process.env[`CLEARINGHOUSE_${payerId}`] as Clearinghouse | undefined;
    if (override) return override;
  }
  return (process.env.CLEARINGHOUSE as Clearinghouse | undefined) ?? 'stub';
}

/** Extract ISA control number from an 837P payload for response correlation. */
function isaControlNumber(payload: string): string {
  const match = payload.match(/^ISA\*[^~]+/);
  if (!match) return '000000000';
  const parts = match[0].split('*');
  return parts[13] ?? '000000000';
}

// ============================================================
// Change Healthcare
// https://developers.changehealthcare.com/eligibilityandclaims
// ============================================================
async function submitChangeHealthcare(payload: string, payerId: string): Promise<SubmissionResult> {
  const endpoint = process.env.CHANGE_HEALTHCARE_API ?? 'https://apis.changehealthcare.com/medicalnetwork/claims/professional/v1/submission';
  const token = process.env.CHANGE_HEALTHCARE_TOKEN;
  if (!token) throw new Error('CHANGE_HEALTHCARE_TOKEN not set');

  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${token}`,
      'content-type': 'application/edi-x12',
      'x-payer-id': payerId,
    },
    body: payload,
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) {
    return {
      ok: false, clearinghouse: 'change_healthcare',
      vendorSubmissionId: '', ourControlNumber: isaControlNumber(payload),
      error: `HTTP ${r.status}: ${await r.text()}`,
    };
  }
  const body = await r.json() as { submissionId: string; ackTimestamp?: string };
  return {
    ok: true, clearinghouse: 'change_healthcare',
    vendorSubmissionId: body.submissionId,
    ourControlNumber: isaControlNumber(payload),
    acknowledgmentReceivedAt: body.ackTimestamp,
  };
}

// ============================================================
// Availity Essentials
// https://developer.availity.com/partner/products
// ============================================================
async function submitAvaility(payload: string, payerId: string): Promise<SubmissionResult> {
  const endpoint = process.env.AVAILITY_API ?? 'https://api.availity.com/v3/edi-submissions';
  const token = process.env.AVAILITY_TOKEN;
  if (!token) throw new Error('AVAILITY_TOKEN not set');

  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${token}`,
      'content-type': 'application/edi-x12',
      'x-availity-payer-id': payerId,
    },
    body: payload,
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) {
    return {
      ok: false, clearinghouse: 'availity',
      vendorSubmissionId: '', ourControlNumber: isaControlNumber(payload),
      error: `HTTP ${r.status}`,
    };
  }
  const body = await r.json() as { id: string; status: string };
  return {
    ok: true, clearinghouse: 'availity',
    vendorSubmissionId: body.id, ourControlNumber: isaControlNumber(payload),
  };
}

// ============================================================
// Trizetto (SFTP)
// Implementation note: production uses ssh2-sftp-client to PUT the EDI to
// the vendor's /inbound directory. The vendor picks it up on their schedule
// and posts 999/277CA back to /outbound. Here we stub to make compose-up easy.
// ============================================================
async function submitTrizetto(payload: string, _payerId: string): Promise<SubmissionResult> {
  const sftpHost = process.env.TRIZETTO_SFTP_HOST;
  if (!sftpHost) throw new Error('TRIZETTO_SFTP_HOST not set');
  // In real deployment: dynamic import('ssh2-sftp-client'), connect, PUT under /inbound/<batchId>.x12
  logger.info('trizetto SFTP submit (stub)', { host: sftpHost, payloadBytes: payload.length });
  return {
    ok: true, clearinghouse: 'trizetto',
    vendorSubmissionId: `trz-${Date.now()}`,
    ourControlNumber: isaControlNumber(payload),
  };
}

// ============================================================
// Generic REST (for any vendor that accepts EDI POST)
// ============================================================
async function submitGenericRest(payload: string, payerId: string): Promise<SubmissionResult> {
  const endpoint = process.env.GENERIC_CLEARINGHOUSE_URL;
  if (!endpoint) throw new Error('GENERIC_CLEARINGHOUSE_URL not set');
  const r = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/edi-x12',
      ...(process.env.GENERIC_CLEARINGHOUSE_AUTH
          ? { authorization: process.env.GENERIC_CLEARINGHOUSE_AUTH }
          : {}),
    },
    body: payload,
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) {
    return {
      ok: false, clearinghouse: 'generic_rest',
      vendorSubmissionId: '', ourControlNumber: isaControlNumber(payload),
      error: `HTTP ${r.status}`,
    };
  }
  return {
    ok: true, clearinghouse: 'generic_rest',
    vendorSubmissionId: r.headers.get('x-submission-id') ?? `gen-${Date.now()}`,
    ourControlNumber: isaControlNumber(payload),
  };
}

// ============================================================
// Stub (dev / CI)
// ============================================================
function submitStub(payload: string, payerId: string): SubmissionResult {
  logger.info('clearinghouse submit (stub)', { payerId, payloadBytes: payload.length });
  return {
    ok: true, clearinghouse: 'stub',
    vendorSubmissionId: `stub-${Date.now()}`,
    ourControlNumber: isaControlNumber(payload),
    acknowledgmentReceivedAt: new Date().toISOString(),
  };
}

// ============================================================
// Dispatcher
// ============================================================
export async function submit837P(payload: string, payerId: string): Promise<SubmissionResult> {
  const vendor = activeClearinghouse(payerId);
  logger.info('837P submission dispatch', { vendor, payerId, payloadBytes: payload.length });
  try {
    if (vendor === 'change_healthcare') return await submitChangeHealthcare(payload, payerId);
    if (vendor === 'availity')           return await submitAvaility(payload, payerId);
    if (vendor === 'trizetto')           return await submitTrizetto(payload, payerId);
    if (vendor === 'generic_rest')       return await submitGenericRest(payload, payerId);
    return submitStub(payload, payerId);
  } catch (err) {
    return {
      ok: false, clearinghouse: vendor,
      vendorSubmissionId: '', ourControlNumber: isaControlNumber(payload),
      error: (err as Error).message,
    };
  }
}

// ============================================================
// 999 / 277CA / 835 parsers (high-level summaries; not full segment-by-segment)
// ============================================================

export interface Parsed999 {
  accepted: boolean;
  errors: Array<{ segment: string; message: string }>;
}
/** Parse a 999 Implementation Acknowledgment. */
export function parse999(payload: string): Parsed999 {
  const ak9 = payload.match(/AK9\*([^~*]+)/);
  const accepted = ak9 ? ak9[1] === 'A' : false;
  const errors: Parsed999['errors'] = [];
  for (const m of payload.matchAll(/IK3\*([^*~]+)\*[^~]*~[^]*?IK4\*[^~]*~?/g)) {
    errors.push({ segment: m[1], message: 'rejected per IK3/IK4' });
  }
  return { accepted, errors };
}

export interface Parsed277CA {
  claimControlNumber: string;
  statusCategory: string;        // A0 (accepted), A2 (acknowledged), A3 (rejected), F1 (finalized), P (pending)
  statusCode: string;
  statusDescription?: string;
}
/** Parse a 277CA Claim Acknowledgment. Returns one entry per claim in the batch. */
export function parse277CA(payload: string): Parsed277CA[] {
  const out: Parsed277CA[] = [];
  const segments = payload.split(/[~\n\r]+/).filter(Boolean);
  let currentClaim: string | undefined;
  for (const seg of segments) {
    const parts = seg.split('*');
    if (parts[0] === 'TRN' && parts[1] === '2') {
      currentClaim = parts[2];
    } else if (parts[0] === 'STC' && currentClaim) {
      const status = (parts[1] ?? '').split(SUB[0] ?? ':');
      out.push({
        claimControlNumber: currentClaim,
        statusCategory: status[0] ?? '',
        statusCode: status[1] ?? '',
        statusDescription: parts[4],
      });
      currentClaim = undefined;
    }
  }
  return out;
}
const SUB = ':';

export interface Parsed835 {
  claimControlNumber: string;
  paidAmountCents: number;
  patientResponsibilityCents: number;
  claimStatus: 'paid' | 'denied' | 'pending';
  adjustments: Array<{ groupCode: string; reasonCode: string; amountCents: number }>;
}

/** Parse an 835 Remittance Advice. Returns one row per claim in the remittance. */
export function parse835(payload: string): Parsed835[] {
  const out: Parsed835[] = [];
  const segments = payload.split(/[~\n\r]+/).filter(Boolean);
  let current: Parsed835 | undefined;

  for (const seg of segments) {
    const parts = seg.split('*');

    if (parts[0] === 'CLP') {
      if (current) out.push(current);
      // CLP01: payer claim control number (or our CCN)
      // CLP02: claim status (1=Processed as Primary, 4=Denied, etc.)
      // CLP03: total submitted charges
      // CLP04: amount paid
      // CLP05: patient responsibility
      const statusCode = parts[2];
      const claimStatus: Parsed835['claimStatus'] =
        statusCode === '4' || statusCode === '22' ? 'denied' :
        statusCode === '1' || statusCode === '2'  ? 'paid'   : 'pending';
      current = {
        claimControlNumber: parts[1] ?? '',
        paidAmountCents: Math.round((Number.parseFloat(parts[4] ?? '0') || 0) * 100),
        patientResponsibilityCents: Math.round((Number.parseFloat(parts[5] ?? '0') || 0) * 100),
        claimStatus,
        adjustments: [],
      };
    } else if (parts[0] === 'CAS' && current) {
      // CAS*<group>*<reason>*<amount>...
      current.adjustments.push({
        groupCode: parts[1] ?? '',
        reasonCode: parts[2] ?? '',
        amountCents: Math.round((Number.parseFloat(parts[3] ?? '0') || 0) * 100),
      });
    }
  }
  if (current) out.push(current);
  return out;
}
