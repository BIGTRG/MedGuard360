/**
 * Service configuration loader.
 *
 * Secrets MUST come from /opt/credential-vault/ at process start,
 * NOT from process.env in production. This loader supports both:
 *   - Local dev: process.env (with .env.local file ignored by git)
 *   - Production: /opt/credential-vault/<service>.json mounted into the container
 *
 * Per CLAUDE.md: never store secrets in .env files committed to the repo.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface ServiceConfig {
  serviceName: string;
  env: 'development' | 'staging' | 'production';
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';

  // Postgres (PgBouncer-aware)
  pgHost: string;
  pgPort: number;
  pgDatabase: string;
  pgUser: string;
  pgPassword: string;
  pgPoolMax: number;
  pgSsl: boolean;

  // Redis
  redisHost: string;
  redisPort: number;

  // Kafka
  kafkaBrokers: string[];
  kafkaClientId: string;

  // Auth
  jwtSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  jwtAccessTtlSec: number;
  jwtRefreshTtlSec: number;
}

function loadVaultSecrets(serviceName: string): Record<string, string> {
  const vaultPath = `/opt/credential-vault/${serviceName}.json`;
  if (fs.existsSync(vaultPath)) {
    const raw = fs.readFileSync(vaultPath, 'utf-8');
    return JSON.parse(raw) as Record<string, string>;
  }
  return {};
}

function required(name: string, value: string | undefined): string {
  if (value === undefined || value === '') {
    throw new Error(`Missing required config value: ${name}`);
  }
  return value;
}

function int(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) throw new Error(`Config ${name} must be an integer, got: ${value}`);
  return n;
}

export function loadConfig(serviceName: string): ServiceConfig {
  const vault = loadVaultSecrets(serviceName);
  const get = (key: string): string | undefined => vault[key] ?? process.env[key];

  return {
    serviceName,
    env: (get('NODE_ENV') ?? 'development') as ServiceConfig['env'],
    port: int('PORT', get('PORT'), 3000),
    logLevel: (get('LOG_LEVEL') ?? 'info') as ServiceConfig['logLevel'],

    pgHost: get('PG_HOST') ?? 'localhost',
    pgPort: int('PG_PORT', get('PG_PORT'), 5432),
    pgDatabase: get('PG_DATABASE') ?? 'medguard360',
    pgUser: required('PG_USER', get('PG_USER') ?? 'medguard'),
    pgPassword: required('PG_PASSWORD', get('PG_PASSWORD')),
    pgPoolMax: int('PG_POOL_MAX', get('PG_POOL_MAX'), 20),
    pgSsl: (get('PG_SSL') ?? 'false') === 'true',

    redisHost: get('REDIS_HOST') ?? 'localhost',
    redisPort: int('REDIS_PORT', get('REDIS_PORT'), 6379),

    kafkaBrokers: (get('KAFKA_BROKERS') ?? 'localhost:9092').split(',').map(s => s.trim()),
    kafkaClientId: get('KAFKA_CLIENT_ID') ?? serviceName,

    jwtSecret: required('JWT_SECRET', get('JWT_SECRET')),
    jwtIssuer: get('JWT_ISSUER') ?? 'medguard360',
    jwtAudience: get('JWT_AUDIENCE') ?? 'medguard360-platform',
    jwtAccessTtlSec: int('JWT_ACCESS_TTL_SEC', get('JWT_ACCESS_TTL_SEC'), 900),    // 15m
    jwtRefreshTtlSec: int('JWT_REFRESH_TTL_SEC', get('JWT_REFRESH_TTL_SEC'), 60 * 60 * 24 * 7), // 7d
  };
}

// Lazy singleton used by logger/metrics/etc. so services don't need to thread config everywhere.
// Services should call `initConfig(serviceName)` once at boot.
let _config: ServiceConfig | undefined;

export function initConfig(serviceName: string): ServiceConfig {
  _config = loadConfig(serviceName);
  return _config;
}

export const config: ServiceConfig = new Proxy({} as ServiceConfig, {
  get(_target, prop: keyof ServiceConfig) {
    if (!_config) {
      // Provide minimal defaults so logger works before initConfig is called.
      // Real values are required for DB / Kafka / JWT operations.
      const stub: Partial<ServiceConfig> = {
        serviceName: process.env.SERVICE_NAME ?? path.basename(process.cwd()),
        env: (process.env.NODE_ENV ?? 'development') as ServiceConfig['env'],
        logLevel: (process.env.LOG_LEVEL ?? 'info') as ServiceConfig['logLevel'],
      };
      return stub[prop];
    }
    return _config[prop];
  },
});

// ---------------------------------------------------------------------------
// Flat key-value config accessors (spec-compatible API)
//
// In production: reads first from /opt/credential-vault/<service>.json,
// then falls back to process.env. In development: reads process.env.
// ---------------------------------------------------------------------------

/** Flat secrets cache loaded from credential vault (populated lazily). */
let _flatSecrets: Record<string, string> | undefined;

function getFlatSecrets(): Record<string, string> {
  if (_flatSecrets !== undefined) return _flatSecrets;
  const serviceName = process.env.SERVICE_NAME ?? path.basename(process.cwd());
  const vaultPath = `/opt/credential-vault/${serviceName}.json`;
  if (fs.existsSync(vaultPath)) {
    try {
      _flatSecrets = JSON.parse(fs.readFileSync(vaultPath, 'utf-8')) as Record<string, string>;
      return _flatSecrets;
    } catch {
      // Fall through to env
    }
  }
  _flatSecrets = {};
  return _flatSecrets;
}

/**
 * Get a required config / secret value. Throws if the key is absent.
 * Checks credential-vault first (production), then process.env (development).
 */
export function getConfig(key: string): string {
  const secrets = getFlatSecrets();
  const value = secrets[key] ?? process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing required config key: ${key}`);
  }
  return value;
}

/**
 * Get an optional config / secret value.
 * Returns `defaultVal` (or `undefined`) if the key is absent.
 */
export function getConfigOptional(key: string, defaultVal?: string): string | undefined {
  const secrets = getFlatSecrets();
  return secrets[key] ?? process.env[key] ?? defaultVal;
}
