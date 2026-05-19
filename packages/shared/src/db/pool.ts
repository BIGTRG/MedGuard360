/**
 * PostgreSQL connection pool, PgBouncer-aware.
 *
 * Per CLAUDE.md:
 *  - Primary on 5432, replicas on 5433/5434
 *  - PgBouncer in front for high-traffic services
 *  - Row-level security enforced on ALL PHI tables — every query that touches
 *    PHI MUST set `app.user_id`, `app.role`, and `app.state_code` session vars
 *    via `withRlsContext()` so RLS policies have what they need.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';
import { logger } from '../logger';
import { dbQueryDurationSeconds } from '../metrics';
import { InternalError } from '../errors';
import { AuthClaims, UserRole } from '../types';

let _pool: Pool | undefined;

export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      host: config.pgHost,
      port: config.pgPort,
      database: config.pgDatabase,
      user: config.pgUser,
      password: config.pgPassword,
      max: config.pgPoolMax,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: config.pgSsl ? { rejectUnauthorized: true } : false,
      // PgBouncer transaction-pooling mode requires this:
      statement_timeout: 30_000,
    });

    _pool.on('error', (err: Error) => {
      logger.error('postgres pool error', { error: err.message, stack: err.stack });
    });
  }
  return _pool;
}

export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = undefined;
  }
}

/**
 * Run a single query with timing instrumentation.
 * For RLS-protected reads/writes, use `withRlsContext()` instead.
 */
export async function query<R extends QueryResultRow = QueryResultRow>(
  operation: string,
  sql: string,
  params?: ReadonlyArray<unknown>,
): Promise<QueryResult<R>> {
  const stop = dbQueryDurationSeconds.startTimer({ operation });
  try {
    const result = await getPool().query<R>(sql, params as unknown[]);
    return result;
  } catch (err) {
    const e = err as Error;
    logger.error('postgres query failed', { operation, error: e.message });
    throw new InternalError('Database query failed', { operation });
  } finally {
    stop();
  }
}

/**
 * Run callback inside a transaction that has RLS session vars set from
 * the caller's auth claims. Use this for ALL queries touching PHI tables.
 *
 *   await withRlsContext(req.auth!, async (client) => {
 *     await client.query('SELECT * FROM patients WHERE id = $1', [id]);
 *   });
 */
export async function withRlsContext<T>(
  auth: AuthClaims,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(`SET LOCAL app.user_id = '${escapeIdent(auth.sub)}'`);
    await client.query(`SET LOCAL app.role = '${escapeIdent(auth.role)}'`);
    if (auth.stateCode) {
      await client.query(`SET LOCAL app.state_code = '${escapeIdent(auth.stateCode)}'`);
    } else {
      await client.query(`SET LOCAL app.state_code = ''`);
    }
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Strict identifier sanitization — UUIDs, role names, and state codes only. */
function escapeIdent(value: string): string {
  if (!/^[A-Za-z0-9_\-]{1,64}$/.test(value)) {
    throw new InternalError('Invalid RLS context value');
  }
  return value;
}

// ---------------------------------------------------------------------------
// Spec-compatible API surface
// ---------------------------------------------------------------------------

/**
 * Set RLS session vars on an already-checked-out client using SET LOCAL.
 * Use inside an explicit BEGIN/COMMIT block.
 *
 * Spec signature: withRlsContext(client, userId, role, stateCode?)
 */
export async function setRlsContext(
  client: PoolClient,
  userId: string,
  role: UserRole,
  stateCode?: string,
): Promise<void> {
  await client.query(`SET LOCAL app.user_id = '${escapeIdent(userId)}'`);
  await client.query(`SET LOCAL app.role = '${escapeIdent(role)}'`);
  await client.query(`SET LOCAL app.state_code = '${stateCode ? escapeIdent(stateCode) : ''}'`);
}

/**
 * Simple query helper — spec-compatible signature.
 * For RLS-protected queries use `withRlsContext()` instead.
 */
export async function simpleQuery<T>(
  text: string,
  values?: unknown[],
): Promise<{ rows: T[] }> {
  return query<T & QueryResultRow>('query', text, values as ReadonlyArray<unknown>);
}

/** Exported pool instance — allows services to check-out clients directly. */
export const pool = {
  query: <R extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]) =>
    getPool().query<R>(text, values as unknown[]),
  connect: () => getPool().connect(),
  end: () => closePool(),
};
