/**
 * Biometric vendor abstraction.
 *
 * Two production vendors supported per CLAUDE.md: Suprema and NEC. Selection
 * is per-state (state contracts dictate which biometric platform is approved),
 * loaded from state-config-service. In dev a deterministic stub is used.
 *
 * Vendors return a match score in [0, 1]. We mint a "biometric_verified" claim
 * on the user's session when score ≥ threshold (0.92 default).
 */

import { logger } from '@medguard360/shared';

export type Modality = 'face' | 'thumbprint' | 'voice';
export type VendorName = 'suprema' | 'nec' | 'stub';

export interface VerifyInput {
  userId: string;
  modality: Modality;
  /** Captured template / probe from the client-side vendor SDK, base64-encoded. */
  samplePayloadBase64: string;
}

export interface VerifyResult {
  matched: boolean;
  score: number;
  vendor: VendorName;
  vendorTxnId: string;
  livenessConfidence?: number;
}

export interface EnrollInput {
  userId: string;
  modality: Modality;
  /** Captured enrollment templates (multiple frames for face, multiple impressions for thumb). */
  enrollmentSamplesBase64: string[];
}

export interface EnrollResult {
  vendor: VendorName;
  templateId: string;
  /** Vendor-specific encrypted template. We store this in `biometric_enrollments.template_encrypted`. */
  encryptedTemplate: Buffer;
  /** Key-id used for encryption (KMS key ARN in AWS, key name in HashiCorp Vault). */
  templateKid: string;
}

/** Select the active vendor based on state-config + env. State override wins. */
export function activeVendor(stateCode?: string): VendorName {
  if (stateCode) {
    const stateOverride = process.env[`BIOMETRIC_VENDOR_${stateCode}`] as VendorName | undefined;
    if (stateOverride) return stateOverride;
  }
  return (process.env.BIOMETRIC_VENDOR as VendorName | undefined) ?? 'stub';
}

// ============================================================
// Suprema (BioStar 2 API)
// https://supremainc.com/en/biostar2
// Production deployment: mTLS to BioStar 2 server, OAuth client credentials.
// ============================================================
async function supremaVerify(input: VerifyInput): Promise<VerifyResult> {
  const endpoint = process.env.SUPREMA_API_BASE ?? 'https://biostar.medguard360.local/api/v2';
  const apiKey = process.env.SUPREMA_API_KEY;
  if (!apiKey) throw new Error('SUPREMA_API_KEY not set');

  const r = await fetch(`${endpoint}/biometric/verify`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'bs-api-key': apiKey,
    },
    body: JSON.stringify({
      user_id: input.userId,
      modality: input.modality,
      probe: input.samplePayloadBase64,
    }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!r.ok) throw new Error(`Suprema verify failed: ${r.status}`);
  const body = await r.json() as { matched: boolean; score: number; txn_id: string; liveness_score?: number };
  return {
    matched: body.matched,
    score: body.score,
    vendor: 'suprema',
    vendorTxnId: body.txn_id,
    livenessConfidence: body.liveness_score,
  };
}

async function supremaEnroll(input: EnrollInput): Promise<EnrollResult> {
  const endpoint = process.env.SUPREMA_API_BASE ?? 'https://biostar.medguard360.local/api/v2';
  const apiKey = process.env.SUPREMA_API_KEY;
  if (!apiKey) throw new Error('SUPREMA_API_KEY not set');

  const r = await fetch(`${endpoint}/biometric/enroll`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'bs-api-key': apiKey },
    body: JSON.stringify({
      user_id: input.userId,
      modality: input.modality,
      samples: input.enrollmentSamplesBase64,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) throw new Error(`Suprema enroll failed: ${r.status}`);
  const body = await r.json() as { template_id: string; encrypted_template_b64: string; key_id: string };
  return {
    vendor: 'suprema',
    templateId: body.template_id,
    encryptedTemplate: Buffer.from(body.encrypted_template_b64, 'base64'),
    templateKid: body.key_id,
  };
}

// ============================================================
// NEC NeoFace + Bio-IDiom Watch
// Production deployment: NEC NeoFace Cloud or on-prem NeoFace SDK.
// ============================================================
async function necVerify(input: VerifyInput): Promise<VerifyResult> {
  const endpoint = process.env.NEC_API_BASE ?? 'https://neoface.medguard360.local/api/v1';
  const token = process.env.NEC_API_TOKEN;
  if (!token) throw new Error('NEC_API_TOKEN not set');

  const r = await fetch(`${endpoint}/match`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      subjectId: input.userId,
      modality: input.modality === 'thumbprint' ? 'fingerprint' : input.modality,
      probeImage: input.samplePayloadBase64,
    }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!r.ok) throw new Error(`NEC verify failed: ${r.status}`);
  const body = await r.json() as { match: boolean; matchScore: number; transactionId: string; livenessScore?: number };
  return {
    matched: body.match,
    score: body.matchScore,
    vendor: 'nec',
    vendorTxnId: body.transactionId,
    livenessConfidence: body.livenessScore,
  };
}

async function necEnroll(input: EnrollInput): Promise<EnrollResult> {
  const endpoint = process.env.NEC_API_BASE ?? 'https://neoface.medguard360.local/api/v1';
  const token = process.env.NEC_API_TOKEN;
  if (!token) throw new Error('NEC_API_TOKEN not set');

  const r = await fetch(`${endpoint}/enroll`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      subjectId: input.userId,
      modality: input.modality === 'thumbprint' ? 'fingerprint' : input.modality,
      images: input.enrollmentSamplesBase64,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) throw new Error(`NEC enroll failed: ${r.status}`);
  const body = await r.json() as { templateId: string; encryptedTemplate: string; keyId: string };
  return {
    vendor: 'nec',
    templateId: body.templateId,
    encryptedTemplate: Buffer.from(body.encryptedTemplate, 'base64'),
    templateKid: body.keyId,
  };
}

// ============================================================
// Stub (dev / CI)
// ============================================================
async function stubVerify(input: VerifyInput): Promise<VerifyResult> {
  const decoded = Buffer.from(input.samplePayloadBase64, 'base64').toString('utf-8');
  if (decoded === 'PASS') return { matched: true,  score: 0.98, vendor: 'stub', vendorTxnId: `stub-${Date.now()}` };
  if (decoded === 'FAIL') return { matched: false, score: 0.40, vendor: 'stub', vendorTxnId: `stub-${Date.now()}` };
  return { matched: true, score: 0.94, vendor: 'stub', vendorTxnId: `stub-${Date.now()}` };
}

async function stubEnroll(input: EnrollInput): Promise<EnrollResult> {
  return {
    vendor: 'stub',
    templateId: `stub-${input.userId}-${input.modality}`,
    encryptedTemplate: Buffer.from(`stub-template-${input.modality}`),
    templateKid: 'stub-key',
  };
}

// ============================================================
// Dispatchers
// ============================================================
export async function verify(input: VerifyInput, stateCode?: string): Promise<VerifyResult> {
  const vendor = activeVendor(stateCode);
  logger.info('biometric verify dispatched', { vendor, userId: input.userId, modality: input.modality });
  try {
    if (vendor === 'suprema') return await supremaVerify(input);
    if (vendor === 'nec')     return await necVerify(input);
    return await stubVerify(input);
  } catch (err) {
    logger.error('biometric verify failed', { vendor, error: (err as Error).message });
    throw err;
  }
}

export async function enroll(input: EnrollInput, stateCode?: string): Promise<EnrollResult> {
  const vendor = activeVendor(stateCode);
  logger.info('biometric enroll dispatched', { vendor, userId: input.userId, modality: input.modality });
  if (vendor === 'suprema') return supremaEnroll(input);
  if (vendor === 'nec')     return necEnroll(input);
  return stubEnroll(input);
}
