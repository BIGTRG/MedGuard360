/**
 * Clerk session → MedGuard360 JWT exchange.
 *
 * Called after Clerk signs the user in. We POST the Clerk session token to
 * our auth-service, which returns the internal JWT (with role + state +
 * biometric claims) that all our APIs expect.
 */

import { saveTokens } from './auth';
import type { Tokens } from './types';

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? '/api';

export async function exchangeClerkSession(clerkSessionToken: string): Promise<Tokens> {
  const r = await fetch(`${BASE}/v1/auth/clerk/exchange`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionToken: clerkSessionToken }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Exchange failed (HTTP ${r.status})`);
  }
  const tokens = await r.json() as Tokens;
  saveTokens(tokens);
  return tokens;
}

/** True when Clerk env vars are configured. Drives whether the UI shows the
 *  Clerk SignIn button or the legacy password form. */
export function clerkConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}
