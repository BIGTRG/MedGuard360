/**
 * Two-tier storage: SecureStore for tokens, SQLite for offline records.
 *
 * - Tokens: expo-secure-store (Keychain on iOS, Keystore on Android).
 *   NEVER in AsyncStorage — it's plain-text on Android.
 * - Cache: SQLite with TTL columns; we sync on app foreground + on demand.
 */

import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

const TOKEN_KEYS = { access: 'mg_access', refresh: 'mg_refresh', session: 'mg_session' };

export async function saveTokens(t: { accessToken: string; refreshToken: string; sessionId: string }): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEYS.access, t.accessToken),
    SecureStore.setItemAsync(TOKEN_KEYS.refresh, t.refreshToken),
    SecureStore.setItemAsync(TOKEN_KEYS.session, t.sessionId),
  ]);
}
export async function getAccessToken(): Promise<string | null>  { return SecureStore.getItemAsync(TOKEN_KEYS.access); }
export async function getRefreshToken(): Promise<string | null> { return SecureStore.getItemAsync(TOKEN_KEYS.refresh); }
export async function clearTokens(): Promise<void> {
  await Promise.all(Object.values(TOKEN_KEYS).map(k => SecureStore.deleteItemAsync(k)));
}

// ============================================================
// SQLite cache
// ============================================================

let _db: SQLite.SQLiteDatabase | undefined;
async function db(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('medguard360.db');
    await _db.execAsync(`
      CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        cached_at INTEGER NOT NULL,
        ttl_seconds INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        body TEXT,
        created_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );
    `);
  }
  return _db;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const d = await db();
  const row = await d.getFirstAsync<{ value: string; cached_at: number; ttl_seconds: number }>(
    'SELECT value, cached_at, ttl_seconds FROM cache WHERE key = ?', [key],
  );
  if (!row) return null;
  if (Date.now() / 1000 - row.cached_at > row.ttl_seconds) return null;
  return JSON.parse(row.value) as T;
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
  const d = await db();
  await d.runAsync(
    `INSERT INTO cache (key, value, cached_at, ttl_seconds)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, cached_at=excluded.cached_at, ttl_seconds=excluded.ttl_seconds`,
    [key, JSON.stringify(value), Math.floor(Date.now() / 1000), ttlSeconds],
  );
}

/**
 * Outbox pattern: queue write-side requests when offline, replay when network returns.
 */
export interface OutboxItem { id: number; method: string; path: string; body: string | null; attempts: number }
export async function outboxEnqueue(method: string, path: string, body?: unknown): Promise<void> {
  const d = await db();
  await d.runAsync(
    `INSERT INTO outbox (method, path, body, created_at) VALUES (?, ?, ?, ?)`,
    [method, path, body ? JSON.stringify(body) : null, Math.floor(Date.now() / 1000)],
  );
}
export async function outboxPending(): Promise<OutboxItem[]> {
  const d = await db();
  return d.getAllAsync<OutboxItem>(`SELECT id, method, path, body, attempts FROM outbox ORDER BY id ASC`);
}
export async function outboxComplete(id: number): Promise<void> {
  const d = await db();
  await d.runAsync(`DELETE FROM outbox WHERE id = ?`, [id]);
}
export async function outboxRecordError(id: number, error: string): Promise<void> {
  const d = await db();
  await d.runAsync(`UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?`, [error, id]);
}
