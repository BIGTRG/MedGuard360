/**
 * Client-side auth helpers.
 *
 * Tokens live in sessionStorage so a tab refresh keeps the session but
 * closing the tab terminates it (HIPAA-friendly default).
 * Refresh tokens are in localStorage with an `mg_*` prefix so they survive
 * tab reload; they're hashed server-side so leakage is the user's exposure,
 * not the platform's.
 */

import type { AuthClaims, Tokens, UserRole } from './types';

const ACCESS_KEY  = 'mg_access';
const REFRESH_KEY = 'mg_refresh';
const SESSION_KEY = 'mg_session';

function decodeJwtPayload(token: string): AuthClaims | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(part.length + (4 - part.length % 4) % 4, '=');
    const json = typeof atob === 'function' ? atob(padded) : Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(json) as AuthClaims;
  } catch {
    return null;
  }
}

export function saveTokens(t: Tokens): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ACCESS_KEY, t.accessToken);
  sessionStorage.setItem(SESSION_KEY, t.sessionId);
  localStorage.setItem(REFRESH_KEY, t.refreshToken);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function getCurrentClaims(): AuthClaims | null {
  const t = getAccessToken();
  return t ? decodeJwtPayload(t) : null;
}

/** Where to send a user after login, based on their role. */
export function homePathForRole(role: UserRole): string {
  switch (role) {
    case 'state_medicaid_agency':
    case 'mco_admin':
    case 'federal_cms':
      return '/state';
    case 'fraud_investigator':
      return '/fraud';
    case 'prior_auth_specialist':
      return '/pa-queue';
    case 'denial_appeals_specialist':
      return '/denials';
    case 'credentialing_specialist':
      return '/credentialing';
    case 'individual_provider':
    case 'facility_provider':
      return '/provider';
    case 'pharmacy':
      return '/pharmacy';
    case 'dmepos_supplier':
      return '/dme';
    case 'nemt_broker':
      return '/nemt';
    case 'compliance_officer':
    case 'qa_auditor':
      return '/audit';
    case 'emergency_responder':
      return '/responder';
    case 'school_administrator':
      return '/school';
    case 'hie_administrator':
      return '/hie';
    case 'platform_administrator':
      return '/admin';
    case 'patient':
    default:
      return '/patient';
  }
}
