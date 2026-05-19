/**
 * Consumes claim.denied. Persists the denial. The appeal draft is generated
 * on demand by a specialist via POST /denials/:id/draft-appeal — we don't
 * auto-draft because most denials need human triage first (write off vs appeal).
 */

import { consumeEvents, emitEvent, logger, DomainEvent } from '@medguard360/shared';
import { persistDenial } from './repository';

interface ClaimDeniedPayload {
  claimId: string;
  stateCode: string;
  carcCode: string;
  carcDescription: string;
  rarcCodes?: string[];
  deniedAmountCents: number;
  payerMessage?: string;
}

export async function startConsumer(): Promise<void> {
  await consumeEvents('denial-service', ['claim.denied'], async (event: DomainEvent) => {
    const payload = event.payload as ClaimDeniedPayload;
    const denial = await persistDenial(payload);

    await emitEvent('claim.appealed', {     // soft-emit so reporting can track denial volume
      denialId: denial.id, claimId: payload.claimId, carcCode: payload.carcCode,
    }, { correlationId: event.correlationId });

    logger.info('denial captured', { denialId: denial.id, claimId: payload.claimId });
  });
  logger.info('denial-service consumer started');
}
