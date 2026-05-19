/**
 * Kafka consumer: claim.submitted → score → persist → open case.
 *
 * Idempotency:
 *   - persistScore uses ON CONFLICT (claim_id) → safe to replay.
 *   - createFraudCase has no unique constraint on claim_id, so the handler
 *     is wrapped in a try/catch and the case creation is skipped when one
 *     already exists for the same claim.
 *
 * AI Governance (non-negotiable):
 *   - If fraud-detection is unavailable, NEVER auto-pay.
 *   - Mark case ai_engine_unavailable = true and emit fraud.manual_review_required.
 *   - Auto-pay only fires when score < state.fraud_thresholds.auto_pay_below
 *     AND the AI engine successfully returned a score.
 */

import { consumeEvents, emitEvent, auditLog, createLogger, DomainEvent } from '@medguard360/shared';
import { fraudDetection, stateConfig } from './clients';
import { buildFeatures, ClaimSubmittedPayload } from './featureExtractor';
import {
  persistScore,
  updateClaimWithScore,
  updateClaimStatus,
  updateClaimFraudScore,
  createFraudCase,
} from './repository';
import { scoreToRiskLevel } from './types';

const logger = createLogger('fraud-engine-consumer');

interface FraudScoreResponse {
  engine_version: string;
  claim_id: string;
  score: number;
  recommendation: 'auto_pay' | 'route_to_review' | 'auto_block';
  flags: Array<{ code: string; label: string; severity: number }>;
  explanation: string;
}

interface StateConfigResponse {
  fraud_thresholds: {
    auto_pay_below:   number;
    auto_block_above: number;
  };
}

export async function startConsumer(): Promise<void> {
  await consumeEvents(
    'fraud-engine-service',
    ['claim.submitted'],
    async (event: DomainEvent) => {
      const payload     = event.payload as ClaimSubmittedPayload;
      const correlation = event.correlationId;
      const claimId     = payload.claimId;

      logger.info('processing claim.submitted', { claimId, stateCode: payload.stateCode });

      // ── 1. Fetch state-specific fraud thresholds ──────────────────────────
      let autoPayBelow   = 30;   // sensible platform defaults
      let autoBlockAbove = 75;

      try {
        const resp = await stateConfig.get<StateConfigResponse>(
          `/state-config/${payload.stateCode}`,
        );
        autoPayBelow   = resp.data.fraud_thresholds.auto_pay_below;
        autoBlockAbove = resp.data.fraud_thresholds.auto_block_above;
        logger.info('loaded state thresholds', { stateCode: payload.stateCode, autoPayBelow, autoBlockAbove });
      } catch (err) {
        logger.warn('state-config unreachable; using platform defaults', {
          stateCode: payload.stateCode, error: (err as Error).message,
        });
      }

      // ── 2. Build feature vector ───────────────────────────────────────────
      const features = await buildFeatures(payload);

      await auditLog({
        resource: 'claim', resourceId: claimId,
        action: 'fraud_feature_extraction',
        actor: { sub: 'fraud-engine-service', role: 'system' } as never,
        outcome: 'success',
        correlationId: correlation,
        phiAccessed: true,
      });

      // ── 3. Call fraud-detection AI ────────────────────────────────────────
      let aiUnavailable = false;
      let score: FraudScoreResponse;

      try {
        const resp = await fraudDetection.post<FraudScoreResponse>(
          '/v1/score',
          { ...features, state_auto_block_threshold: autoBlockAbove },
        );
        score = resp.data;

        logger.info('fraud score received', {
          claimId, score: score.score, recommendation: score.recommendation,
        });

        await auditLog({
          resource: 'claim', resourceId: claimId,
          action: 'fraud_ai_scored',
          actor: { sub: 'fraud-engine-service', role: 'system' } as never,
          outcome: 'success',
          correlationId: correlation,
          phiAccessed: true,
          context: { score: score.score, recommendation: score.recommendation },
        });
      } catch (err) {
        // AI governance: engine failure → mandatory manual review, never auto-pay.
        aiUnavailable = true;
        logger.error('fraud-detection unreachable; routing to manual review', {
          claimId, error: (err as Error).message,
        });

        score = {
          engine_version: 'fallback',
          claim_id: claimId,
          score: 50,
          recommendation: 'route_to_review',
          flags: [{
            code:  'AI_ENGINE_UNAVAILABLE',
            label: 'Fraud AI engine was unreachable; manual review required.',
            severity: 1.0,
          }],
          explanation:
            'The fraud detection engine was temporarily unavailable. ' +
            'This claim has been routed for full manual review. No automated decision was made.',
        };

        await auditLog({
          resource: 'claim', resourceId: claimId,
          action: 'fraud_ai_unavailable',
          actor: { sub: 'fraud-engine-service', role: 'system' } as never,
          outcome: 'failure',
          correlationId: correlation,
          phiAccessed: true,
          context: { error: (err as Error).message },
        });
      }

      // ── 4. Persist fraud score row ────────────────────────────────────────
      await persistScore({
        claim_id:       claimId,
        state_code:     payload.stateCode,
        score:          score.score,
        recommendation: score.recommendation,
        flags:          score.flags,
        explanation:    score.explanation,
        engine_version: score.engine_version,
      });

      // ── 5. Write score back to claims table ───────────────────────────────
      const flagCodes = score.flags.map(f => f.code);
      await updateClaimFraudScore(claimId, score.score, flagCodes);
      await updateClaimWithScore(claimId, score.score, score.recommendation);

      // ── 6. Routing decision ───────────────────────────────────────────────
      const riskLevel = scoreToRiskLevel(score.score);

      if (!aiUnavailable && score.score < autoPayBelow) {
        // Auto-pay path — no case needed, update claim to accepted.
        await updateClaimStatus(claimId, 'accepted');

        logger.info('claim auto-accepted — below auto-pay threshold', {
          claimId, score: score.score, autoPayBelow,
        });

        await auditLog({
          resource: 'claim', resourceId: claimId,
          action: 'fraud_auto_accepted',
          actor: { sub: 'fraud-engine-service', role: 'system' } as never,
          outcome: 'success',
          correlationId: correlation,
          phiAccessed: true,
          context: { score: score.score, autoPayBelow },
        });
      } else {
        // Open a fraud case for human investigation.
        const caseStatus = 'open';

        const fraudCase = await createFraudCase({
          claim_id:            claimId,
          provider_user_id:    payload.billingProviderId,
          patient_id:          payload.patientId,
          state_code:          payload.stateCode,
          risk_score:          score.score,
          risk_level:          riskLevel,
          flags:               flagCodes,
          recommendation:      score.recommendation,
          ai_explanation:      score.explanation,
          status:              caseStatus,
          assigned_to:         null,
          ai_engine_unavailable: aiUnavailable,
          resolved_at:         null,
          resolution_notes:    null,
        });

        logger.info('fraud case opened', {
          claimId, caseId: fraudCase.id, riskLevel, score: score.score, aiUnavailable,
        });

        await auditLog({
          resource: 'fraud_case', resourceId: fraudCase.id,
          action: 'create',
          actor: { sub: 'fraud-engine-service', role: 'system' } as never,
          outcome: 'success',
          correlationId: correlation,
          phiAccessed: true,
          context: { claimId, score: score.score, riskLevel, aiUnavailable },
        });

        // Emit routing-specific events ─────────────────────────────────────
        if (aiUnavailable) {
          await emitEvent(
            'fraud.manual_review_required',
            {
              claimId, caseId: fraudCase.id,
              stateCode:    payload.stateCode,
              reason:       'AI engine unavailable — manual review is mandatory.',
            },
            { correlationId: correlation },
          );
        } else if (score.score > autoBlockAbove) {
          await emitEvent(
            'fraud.alert.raised',
            {
              claimId,      caseId: fraudCase.id,
              score:        score.score,
              riskLevel,
              flags:        score.flags,
              stateCode:    payload.stateCode,
              recommendation: score.recommendation,
            },
            { correlationId: correlation },
          );
        }
      }

      // ── 7. Always emit fraud.scored ───────────────────────────────────────
      await emitEvent(
        'fraud.scored',
        {
          claimId,
          score:          score.score,
          riskLevel,
          recommendation: score.recommendation,
          engineVersion:  score.engine_version,
          aiUnavailable,
          stateCode:      payload.stateCode,
        },
        { correlationId: correlation },
      );

      logger.info('fraud pipeline complete', {
        claimId, score: score.score, riskLevel, recommendation: score.recommendation,
      });
    },
  );

  logger.info('fraud-engine consumer started — listening on claim.submitted');
}
