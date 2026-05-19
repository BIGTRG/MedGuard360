/**
 * Redis-backed cache for state-config-service.
 *
 * State config is read on every claim and PA request and changes rarely.
 * Cache aggressively (TTL 300 s), invalidate explicitly on write.
 */

import Redis from 'ioredis';
import { createLogger } from '@medguard360/shared';

const logger = createLogger('state-config-service');

export const STATE_CONFIG_TTL = 300; // 5 minutes

let _client: Redis | undefined;

function getClient(): Redis {
  if (!_client) {
    const host = process.env['REDIS_HOST'] ?? 'localhost';
    const port = parseInt(process.env['REDIS_PORT'] ?? '6379', 10);
    _client = new Redis({ host, port, maxRetriesPerRequest: 3, lazyConnect: true });
    _client.on('error', (err: Error) =>
      logger.warn('Redis error', { error: err.message }),
    );
  }
  return _client;
}

export async function get<T>(key: string): Promise<T | null> {
  try {
    const raw = await getClient().get(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn('cache get failed', { key, error: (err as Error).message });
    return null;
  }
}

export async function set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await getClient().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn('cache set failed', { key, error: (err as Error).message });
  }
}

export async function del(key: string): Promise<void> {
  try {
    await getClient().del(key);
  } catch (err) {
    logger.warn('cache del failed', { key, error: (err as Error).message });
  }
}
