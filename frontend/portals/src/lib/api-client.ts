/**
 * Typed fetch wrapper. Attaches bearer token, auto-refreshes on 401,
 * and routes errors through a single throw site.
 *
 * Usage:
 *   const cases = await api.get<FraudCaseSummary[]>('/v1/fraud/cases');
 *   await api.post('/v1/prior-auth/pa-requests/:id/decide', { status: 'approved', explanation });
 */

import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './auth';
import type { Tokens } from './types';

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? '/api';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

let refreshInFlight: Promise<void> | null = null;

async function refreshAccess(): Promise<void> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async (): Promise<void> => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new ApiError(401, 'NO_REFRESH', 'Not authenticated');
    const r = await fetch(`${BASE}/v1/auth/refresh`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!r.ok) {
      clearTokens();
      throw new ApiError(401, 'REFRESH_FAILED', 'Session expired');
    }
    const tokens = await r.json() as Tokens;
    saveTokens(tokens);
  })().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const fire = async (): Promise<Response> => {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    const token = getAccessToken();
    if (token) headers['authorization'] = `Bearer ${token}`;
    return fetch(`${BASE}${path}`, {
      method, headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'include',
    });
  };

  let resp = await fire();
  if (resp.status === 401 && getRefreshToken()) {
    try {
      await refreshAccess();
      resp = await fire();
    } catch {
      // fall through to error handling
    }
  }
  if (resp.status === 204) return undefined as T;
  if (!resp.ok) {
    let payload: { error?: { code?: string; message?: string; details?: unknown } } = {};
    try { payload = await resp.json(); } catch { /* ignore */ }
    throw new ApiError(
      resp.status,
      payload.error?.code ?? `HTTP_${resp.status}`,
      payload.error?.message ?? resp.statusText,
      payload.error?.details,
    );
  }
  return await resp.json() as T;
}

export const api = {
  get:    <T>(path: string): Promise<T> => request<T>('GET', path),
  post:   <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, body),
  patch:  <T>(path: string, body?: unknown): Promise<T> => request<T>('PATCH', path, body),
  delete: <T>(path: string): Promise<T> => request<T>('DELETE', path),
};

/** Login is a special case — no auth header. */
export async function login(email: string, password: string): Promise<Tokens> {
  const r = await fetch(`${BASE}/v1/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new ApiError(r.status, e?.error?.code ?? 'LOGIN_FAILED', e?.error?.message ?? 'Login failed');
  }
  return await r.json() as Tokens;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) await request<void>('POST', '/v1/auth/logout', { refreshToken });
  } finally {
    clearTokens();
  }
}
