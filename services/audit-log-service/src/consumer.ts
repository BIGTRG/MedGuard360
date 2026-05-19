/**
 * Kafka consumer for the `audit.event` topic.
 *
 * Compliance rule: NEVER silently drop an audit event.
 * If insertEvent fails, log FATAL and exit — PM2 will restart the process.
 */

import { consumeEvents, createLogger, DomainEvent } from '@medguard360/shared';
import { insertEvent } from './repository';

const logger = createLogger('audit-log-service');

export async function startConsumer(): Promise<void> {
  await consumeEvents(
    'audit-log-service',        // Kafka consumer group ID
    ['audit.event'],            // Topic(s)
    async (event: DomainEvent) => {
      try {
        await insertEvent(event);
      } catch (err) {
        // FATAL — do NOT swallow. Losing audit events is a HIPAA violation.
        logger.error('FATAL: audit event insert failed — exiting for PM2 restart', {
          level: 'fatal',
          error:  (err as Error).message,
          stack:  (err as Error).stack,
          event:  JSON.stringify(event),
        });
        process.exit(1);
      }
    },
  );

  logger.info('Audit Kafka consumer started', { topic: 'audit.event', group: 'audit-log-service' });
}
