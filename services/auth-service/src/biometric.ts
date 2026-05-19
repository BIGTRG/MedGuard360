/**
 * Biometric verification + enrollment, dispatching to the active vendor.
 *
 * Per CLAUDE.md: biometric vendor SDK integrates with Clerk; we trust the
 * vendor's match score and only mint a "biometric_verified" claim when the
 * score exceeds the configured threshold. Vendor is selected per state.
 *
 * See ./biometric/vendor.ts for the Suprema + NEC adapters.
 */

import { logger } from '@medguard360/shared';
import * as v from './biometric/vendor';

const SCORE_THRESHOLD = Number.parseFloat(process.env.BIOMETRIC_SCORE_THRESHOLD ?? '0.92');
const LIVENESS_THRESHOLD = Number.parseFloat(process.env.BIOMETRIC_LIVENESS_THRESHOLD ?? '0.80');

export interface BiometricVerifyInput {
  userId: string;
  modality: 'face' | 'thumbprint' | 'voice';
  samplePayloadBase64: string;
  stateCode?: string;       // overrides default vendor selection
}

export interface BiometricVerifyResult {
  verified: boolean;
  score: number;
  vendor: string;
  vendorTxnId: string;
  livenessConfidence?: number;
  rejectionReason?: string;
}

export async function verifyBiometric(input: BiometricVerifyInput): Promise<BiometricVerifyResult> {
  const result = await v.verify(input, input.stateCode);

  let rejectionReason: string | undefined;
  let verified = result.matched && result.score >= SCORE_THRESHOLD;

  // Liveness gate (when the vendor provides it) prevents spoofing with photos/recordings.
  if (verified && result.livenessConfidence !== undefined && result.livenessConfidence < LIVENESS_THRESHOLD) {
    verified = false;
    rejectionReason = `Liveness confidence ${result.livenessConfidence.toFixed(2)} below threshold ${LIVENESS_THRESHOLD}`;
  } else if (!result.matched || result.score < SCORE_THRESHOLD) {
    rejectionReason = `Score ${result.score.toFixed(2)} below threshold ${SCORE_THRESHOLD}`;
  }

  if (!verified) {
    logger.warn('biometric verify rejected', {
      userId: input.userId, modality: input.modality, vendor: result.vendor,
      score: result.score, livenessConfidence: result.livenessConfidence, rejectionReason,
    });
  }

  return {
    verified,
    score: result.score,
    vendor: result.vendor,
    vendorTxnId: result.vendorTxnId,
    livenessConfidence: result.livenessConfidence,
    rejectionReason,
  };
}

export interface BiometricEnrollInput {
  userId: string;
  modality: 'face' | 'thumbprint' | 'voice';
  enrollmentSamplesBase64: string[];
  stateCode?: string;
}

export interface BiometricEnrollResult {
  vendor: string;
  templateId: string;
  encryptedTemplate: Buffer;
  templateKid: string;
}

export async function enrollBiometric(input: BiometricEnrollInput): Promise<BiometricEnrollResult> {
  if (input.enrollmentSamplesBase64.length < 3) {
    throw new Error('At least 3 enrollment samples are required (varied angles / impressions).');
  }
  const result = await v.enroll(input, input.stateCode);
  logger.info('biometric enrollment complete', {
    userId: input.userId, modality: input.modality, vendor: result.vendor, templateId: result.templateId,
  });
  return result;
}
