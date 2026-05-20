/**
 * Reporting consumer: subscribes to all the major business events and
 * increments the corresponding daily_rollups so dashboards are real-time.
 */

import { consumeEvents, logger, DomainEvent } from '@medguard360/shared';
import { incrementRollup } from './reports';

interface FraudEventPayload { stateCode?: string; recommendation?: string }

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function dayOf(d: string | undefined): string {
  if (!d) return today();
  return d.slice(0, 10);
}

export async function startConsumer(): Promise<void> {
  await consumeEvents(
    'reporting-service',
    [
      'claim.submitted', 'claim.paid', 'claim.denied', 'claim.appealed',
      'pa.requested', 'pa.approved', 'pa.denied',
      'fraud.score.computed', 'fraud.flag.raised',
      'credentialing.approved', 'credentialing.denied',
      'eligibility.checked',
      'crisis.alert.raised',
    ],
    async (event: DomainEvent) => {
      try {
        const payload = event.payload as Record<string, unknown>;
        const state = (payload['stateCode'] as string) ?? 'XX';
        const day = dayOf(payload['submittedAt'] as string | undefined);

        switch (event.eventType) {
          case 'claim.submitted':
            await incrementRollup(state, 'claims_submitted', day, 1);
            break;
          case 'claim.paid':
            await incrementRollup(state, 'claims_paid', day, 1);
            break;
          case 'claim.denied':
            await incrementRollup(state, 'claims_denied', day, 1);
            break;
          case 'claim.appealed':
            await incrementRollup(state, 'claims_appealed', day, 1);
            break;
          case 'pa.requested':
            await incrementRollup(state, 'pa_requested', day, 1);
            break;
          case 'pa.approved':
            await incrementRollup(state, 'pa_approved', day, 1);
            break;
          case 'pa.denied':
            await incrementRollup(state, 'pa_denied', day, 1);
            break;
          case 'fraud.score.computed': {
            const fp = event.payload as FraudEventPayload;
            const bucket = `fraud_${fp.recommendation ?? 'unknown'}`;
            await incrementRollup(fp.stateCode ?? state, bucket, day, 1);
            break;
          }
          case 'fraud.flag.raised':
            await incrementRollup(state, 'fraud_flagged', day, 1);
            break;
          case 'credentialing.approved':
            await incrementRollup(state, 'credentialing_approved', day, 1);
            break;
          case 'credentialing.denied':
            await incrementRollup(state, 'credentialing_denied', day, 1);
            break;
          case 'eligibility.checked':
            await incrementRollup(state, 'eligibility_checks', day, 1);
            break;
          case 'crisis.alert.raised':
            await incrementRollup(state, 'crisis_alerts', day, 1);
            break;
        }
      } catch (err) {
        logger.error('reporting consumer failed for event', {
          eventType: event.eventType, error: (err as Error).message,
        });
        throw err;     // re-throw so kafka retries with backoff
      }
    },
  );
  logger.info('reporting consumer started');
}
