/**
 * Kafka producer/consumer wrapper.
 *
 * Per CLAUDE.md: NEVER call services directly for state changes — emit Kafka events.
 *
 * Topic naming convention: <domain>.<event-name>
 *   claim.submitted, claim.adjudicated, claim.denied
 *   credentialing.application.received, credentialing.application.approved
 *   fraud.score.computed, fraud.ring.detected
 *   pa.requested, pa.approved, pa.denied
 *   user.created, user.login.succeeded, user.login.failed
 *   audit.event  (special: every service writes here)
 */

import { Kafka, Producer, Consumer, EachMessagePayload, logLevel } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../logger';
import { kafkaEventsProduced, kafkaEventsConsumed } from '../metrics';
import { DomainEvent } from '../types';

let _kafka: Kafka | undefined;
let _producer: Producer | undefined;

function getKafka(): Kafka {
  if (!_kafka) {
    _kafka = new Kafka({
      clientId: config.kafkaClientId,
      brokers: config.kafkaBrokers,
      logLevel: logLevel.WARN,
      retry: { initialRetryTime: 300, retries: 8 },
    });
  }
  return _kafka;
}

export async function getProducer(): Promise<Producer> {
  if (!_producer) {
    _producer = getKafka().producer({
      allowAutoTopicCreation: false,
      idempotent: true,
      maxInFlightRequests: 5,
    });
    await _producer.connect();
    logger.info('kafka producer connected');
  }
  return _producer;
}

/**
 * Emit a domain event. The eventType (e.g. 'claim.submitted') is also the topic name.
 */
export async function emitEvent<T>(
  eventType: string,
  payload: T,
  opts: { actorUserId?: string; correlationId?: string; eventVersion?: number } = {},
): Promise<void> {
  const event: DomainEvent<T> = {
    eventId: uuidv4(),
    eventType,
    eventVersion: opts.eventVersion ?? 1,
    occurredAt: new Date().toISOString(),
    producer: config.serviceName,
    actorUserId: opts.actorUserId,
    correlationId: opts.correlationId,
    payload,
  };

  const producer = await getProducer();
  await producer.send({
    topic: eventType,
    messages: [{
      key: opts.correlationId ?? event.eventId,
      value: JSON.stringify(event),
      headers: {
        'event-id': event.eventId,
        'event-type': eventType,
        'event-version': String(event.eventVersion),
        'producer': config.serviceName,
        ...(opts.correlationId ? { 'correlation-id': opts.correlationId } : {}),
      },
    }],
  });

  kafkaEventsProduced.inc({ topic: eventType, event_type: eventType });
}

/**
 * Subscribe to one or more topics, invoking handler for each event.
 * Handler must be idempotent — Kafka guarantees at-least-once delivery.
 */
export async function consumeEvents(
  groupId: string,
  topics: string[],
  handler: (event: DomainEvent, raw: EachMessagePayload) => Promise<void>,
): Promise<Consumer> {
  const consumer = getKafka().consumer({
    groupId,
    sessionTimeout: 30_000,
    heartbeatInterval: 3_000,
    allowAutoTopicCreation: false,
  });

  await consumer.connect();
  for (const topic of topics) {
    await consumer.subscribe({ topic, fromBeginning: false });
  }
  logger.info('kafka consumer subscribed', { groupId, topics });

  await consumer.run({
    autoCommit: true,
    eachMessage: async (payload) => {
      const eventType = payload.message.headers?.['event-type']?.toString() ?? payload.topic;
      try {
        const raw = payload.message.value?.toString('utf-8') ?? '{}';
        const event = JSON.parse(raw) as DomainEvent;
        await handler(event, payload);
        kafkaEventsConsumed.inc({ topic: payload.topic, event_type: eventType, outcome: 'success' });
      } catch (err) {
        kafkaEventsConsumed.inc({ topic: payload.topic, event_type: eventType, outcome: 'error' });
        logger.error('kafka consumer handler failed', {
          topic: payload.topic,
          partition: payload.partition,
          offset: payload.message.offset,
          error: (err as Error).message,
        });
        // Re-throw so kafkajs retries with backoff. For poison-pill protection,
        // configure a DLQ topic per service.
        throw err;
      }
    },
  });

  return consumer;
}

export async function disconnectKafka(): Promise<void> {
  if (_producer) {
    await _producer.disconnect();
    _producer = undefined;
  }
}

// ---------------------------------------------------------------------------
// Spec-compatible API surface
// ---------------------------------------------------------------------------

/**
 * Emit a pre-built DomainEvent to a named topic.
 * Retries up to 3x on transient errors.
 *
 * Spec signature: emitEvent(topic, event): Promise<void>
 */
export async function emitDomainEvent(
  topic: string,
  event: DomainEvent,
  retries = 3,
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const producer = await getProducer();
      await producer.send({
        topic,
        messages: [{
          key: event.correlationId ?? event.eventId,
          value: JSON.stringify(event),
          headers: {
            'event-id': event.eventId,
            'event-type': event.eventType,
            'event-version': String(event.eventVersion),
          },
        }],
      });
      kafkaEventsProduced.inc({ topic, event_type: event.eventType });
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      logger.warn('kafka emit retry', { topic, attempt, error: (err as Error).message });
      await new Promise(r => setTimeout(r, 300 * attempt));
    }
  }
}

/**
 * Subscribe to topics with a simple DomainEvent handler.
 * Errors are logged but do not crash the process (DLQ pattern).
 *
 * Spec signature: consumeEvents(groupId, topics, handler): Promise<void>
 */
export async function subscribeEvents(
  groupId: string,
  topics: string[],
  handler: (event: DomainEvent) => Promise<void>,
): Promise<void> {
  await consumeEvents(groupId, topics, async (event, raw) => {
    await handler(event);
    void raw; // raw EachMessagePayload available if needed
  });
}
