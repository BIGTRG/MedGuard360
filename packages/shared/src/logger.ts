/**
 * Structured JSON logger for MedGuard360 services.
 *
 * - Always emits JSON to stdout — ELK Stack (Logstash) ingests directly.
 * - Includes service name, env, request id, and timestamp on every line.
 * - NEVER log PHI. Use `auditLog()` from ./audit/client for PHI access events.
 */

import winston from 'winston';
import { config } from './config';

const { combine, timestamp, errors, json, splat } = winston.format;

export const logger = winston.createLogger({
  level: config.logLevel,
  defaultMeta: {
    service: config.serviceName,
    env: config.env,
  },
  format: combine(
    errors({ stack: true }),
    timestamp(),
    splat(),
    json(),
  ),
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

/**
 * Create a child logger with persistent context fields. Typical use:
 *   const log = childLogger({ requestId, userId });
 */
export function childLogger(meta: Record<string, unknown>): winston.Logger {
  return logger.child(meta);
}

/**
 * Create a service-scoped logger. Adds `service` to every log line.
 * Compatible with the spec's `createLogger(service)` contract.
 */
export function createLogger(service: string): winston.Logger {
  return logger.child({ service });
}
