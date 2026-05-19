/**
 * Prometheus metrics registry shared across services.
 *
 * Per CLAUDE.md: every service exposes /metrics on the standard port.
 * Scrape interval is 15s.
 *
 * Named exports match both the internal conventions used by db/pool.ts,
 * kafka/client.ts etc. AND the spec-required names for consumer services.
 */

import type { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const _registry = new client.Registry();
client.collectDefaultMetrics({ register: _registry });

/** The prom-client Registry — use for /metrics scrape endpoint. */
export const register = _registry;

/** Alias: metricsRegistry — used internally by http/server.ts. */
export const metricsRegistry = _registry;

// ---------------------------------------------------------------------------
// HTTP metrics
// ---------------------------------------------------------------------------

/** Counts every HTTP request handled by the service. */
export const httpRequestsTotal = new client.Counter({
  name: 'medguard_http_requests_total',
  help: 'Total HTTP requests handled, labeled by method, route, and status code.',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [_registry],
});

/** Latency histogram for HTTP requests (in seconds internally; exposed as ms-suffixed alias). */
export const httpRequestDurationSeconds = new client.Histogram({
  name: 'medguard_http_request_duration_seconds',
  help: 'HTTP request latency in seconds.',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [_registry],
});

/** Spec-compatible alias for httpRequestDurationSeconds. */
export const httpRequestDurationMs = httpRequestDurationSeconds;

// ---------------------------------------------------------------------------
// Kafka metrics
// ---------------------------------------------------------------------------

/** Kafka events produced by this service. */
export const kafkaEventsProduced = new client.Counter({
  name: 'medguard_kafka_events_produced_total',
  help: 'Domain events produced to Kafka.',
  labelNames: ['topic', 'event_type'] as const,
  registers: [_registry],
});

/** Spec-compatible alias for kafkaEventsProduced. */
export const kafkaEventsEmittedTotal = kafkaEventsProduced;

/** Kafka events consumed by this service. */
export const kafkaEventsConsumed = new client.Counter({
  name: 'medguard_kafka_events_consumed_total',
  help: 'Domain events consumed from Kafka.',
  labelNames: ['topic', 'event_type', 'outcome'] as const, // outcome: success | error
  registers: [_registry],
});

/** Spec-compatible alias for kafkaEventsConsumed. */
export const kafkaEventsConsumedTotal = kafkaEventsConsumed;

// ---------------------------------------------------------------------------
// Database metrics
// ---------------------------------------------------------------------------

/** Postgres query latency histogram. */
export const dbQueryDurationSeconds = new client.Histogram({
  name: 'medguard_db_query_duration_seconds',
  help: 'Postgres query latency in seconds.',
  labelNames: ['operation'] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [_registry],
});

/** Spec-compatible alias for dbQueryDurationSeconds. */
export const dbQueryDurationMs = dbQueryDurationSeconds;

// ---------------------------------------------------------------------------
// PHI / compliance metrics
// ---------------------------------------------------------------------------

/** PHI access events (count only — full record goes to audit-log-service). */
export const phiAccessTotal = new client.Counter({
  name: 'medguard_phi_access_total',
  help: 'Count of PHI access events, labeled by resource type and role.',
  labelNames: ['resource', 'role', 'action'] as const,
  registers: [_registry],
});

// ---------------------------------------------------------------------------
// Express middleware
// ---------------------------------------------------------------------------

/**
 * Express middleware that records http_requests_total and request duration
 * on every response finish. Mount early in the middleware chain.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const stop = httpRequestDurationSeconds.startTimer();
  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: (req.route?.path as string | undefined) ?? req.path,
      status: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    stop(labels);
  });
  next();
}
