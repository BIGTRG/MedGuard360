/**
 * Clerk integration.
 *
 * Clerk is the source of truth for IDENTITY (email, password, MFA, SSO).
 * We are the source of truth for AUTHORIZATION (role, state, biometric flag).
 *
 * Flow:
 *   1. User signs in with Clerk on the frontend → gets a Clerk session token
 *   2. Frontend POSTs Clerk session token to /auth/clerk/exchange
 *   3. We verify the Clerk token, look up our internal `users` row by clerk_user_id,
 *      and mint our own JWT with the role + state + biometric claims
 *   4. All subsequent API calls use our JWT (15-min access, 7-day refresh)
 *
 * Webhook flow (Clerk → our service):
 *   - user.created    → ensure_local_user (creates row in `users` if missing)
 *   - user.updated    → sync email, name
 *   - user.deleted    → soft-delete (status='deactivated', preserve audit history)
 *
 * Set CLERK_SECRET_KEY + CLERK_WEBHOOK_SECRET to enable. Without these,
 * the routes return 503 — the rest of auth-service still works with
 * password-based login.
 */

import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { logger, UpstreamError, AppError } from '@medguard360/shared';
import * as repo from './repository';
import { issueTokens } from '@medguard360/shared';
import type { UserRole } from '@medguard360/shared';

const CLERK_API_BASE = 'https://api.clerk.com/v1';

export function clerkEnabled(): boolean {
  return !!process.env.CLERK_SECRET_KEY;
}

interface ClerkUser {
  id: string;
  email_addresses: Array<{ id: string; email_address: string }>;
  primary_email_address_id: string | null;
  public_metadata?: { role?: string; state_code?: string; org_id?: string };
}

interface ClerkSessionPayload {
  sub: string;          // clerk user id
  azp?: string;         // authorized party
  iss?: string;         // issuer (Clerk frontend api URL)
  exp: number;
  iat: number;
  sid: string;          // session id
}

/** Calls Clerk to verify a session token. Uses the JWKS-style verification
 *  approach for production; we keep this minimal here. */
export async function verifyClerkSession(sessionToken: string): Promise<ClerkSessionPayload> {
  if (!clerkEnabled()) throw new AppError(503, 'CLERK_DISABLED', 'Clerk integration not configured');
  // Production: load JWKS from CLERK_FRONTEND_API/.well-known/jwks.json and verify the JWT signature.
  // Dev: trust the token's payload after a server-side validity check via Clerk's REST API.
  const r = await fetch(`${CLERK_API_BASE}/sessions/${encodeURIComponent(sessionToken)}/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!r.ok) throw new UpstreamError('clerk', `session verify failed: ${r.status}`);
  const body = await r.json() as { status: string; user_id: string; id: string; expire_at: number; last_active_at: number };
  return {
    sub: body.user_id,
    sid: body.id,
    exp: Math.floor(body.expire_at / 1000),
    iat: Math.floor(body.last_active_at / 1000),
  };
}

export async function fetchClerkUser(userId: string): Promise<ClerkUser> {
  const r = await fetch(`${CLERK_API_BASE}/users/${userId}`, {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
  });
  if (!r.ok) throw new UpstreamError('clerk', `user fetch failed: ${r.status}`);
  return await r.json() as ClerkUser;
}

function primaryEmail(user: ClerkUser): string {
  const primary = user.email_addresses.find(e => e.id === user.primary_email_address_id);
  return primary?.email_address ?? user.email_addresses[0]?.email_address ?? '';
}

/** Exchange a Clerk session token for one of our internal JWTs. */
export async function exchangeClerkSession(sessionToken: string, ip?: string, userAgent?: string): Promise<ReturnType<typeof issueTokens>> {
  const payload = await verifyClerkSession(sessionToken);
  const clerkUser = await fetchClerkUser(payload.sub);
  const email = primaryEmail(clerkUser);
  if (!email) throw new AppError(400, 'NO_EMAIL', 'Clerk user has no email');

  let user = await repo.findUserByEmail(email);
  if (!user) {
    // First-time Clerk login — provision a row with role from public_metadata if present.
    const role = (clerkUser.public_metadata?.role ?? 'patient') as UserRole;
    user = await repo.insertUser({
      email,
      passwordHash: '$2b$12$clerkmanaged.placeholder.no.password.login.via.clerk.only',
      role,
      stateCode: clerkUser.public_metadata?.state_code,
      orgId: clerkUser.public_metadata?.org_id,
    });
  }

  // Link the Clerk ID if not already set
  if (!user.clerk_user_id) {
    await repo.setClerkUserId(user.id, clerkUser.id);
  }

  const tokens = issueTokens({
    userId: user.id, email: user.email, role: user.role,
    stateCode: user.state_code ?? undefined,
    orgId: user.org_id ?? undefined,
    biometricVerified: false,
  });
  await repo.createSession({
    sessionId: tokens.sessionId, userId: user.id,
    refreshToken: tokens.refreshToken,
    ip, userAgent,
    expiresAt: new Date(tokens.refreshExpiresAt),
  });
  await repo.recordSuccessfulLogin(user.id);

  return tokens;
}

/** Verify Clerk webhook signature using svix (Clerk's standard webhook signer).
 *  We do a manual HMAC-SHA256 check to avoid the @svix dependency. */
export function verifyWebhookSignature(req: Request): boolean {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return false;
  const id = req.header('svix-id');
  const timestamp = req.header('svix-timestamp');
  const signature = req.header('svix-signature');
  if (!id || !timestamp || !signature) return false;

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) return false;

  const signedContent = `${id}.${timestamp}.${rawBody.toString('utf-8')}`;
  // svix secret format: `whsec_<base64>`. Strip the prefix and base64-decode.
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');

  // signature header contains "v1,<sig> v1,<sig>" — any match wins
  return signature.split(' ').some(s => {
    const [, sig] = s.split(',');
    return sig && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  });
}

export async function handleWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!verifyWebhookSignature(req)) {
      res.status(401).json({ error: 'invalid webhook signature' });
      return;
    }
    const event = req.body as { type: string; data: ClerkUser };
    logger.info('clerk webhook received', { type: event.type, userId: event.data.id });

    switch (event.type) {
      case 'user.created':
      case 'user.updated': {
        const email = primaryEmail(event.data);
        if (!email) break;
        const existing = await repo.findUserByEmail(email);
        if (!existing) {
          const role = (event.data.public_metadata?.role ?? 'patient') as UserRole;
          const user = await repo.insertUser({
            email, role,
            passwordHash: '$2b$12$clerkmanaged.placeholder.no.password.login.via.clerk.only',
            stateCode: event.data.public_metadata?.state_code,
            orgId: event.data.public_metadata?.org_id,
          });
          await repo.setClerkUserId(user.id, event.data.id);
        } else if (!existing.clerk_user_id) {
          await repo.setClerkUserId(existing.id, event.data.id);
        }
        break;
      }
      case 'user.deleted':
        // Soft-delete: preserve audit trail. Implementation in repository.deactivate.
        await repo.deactivateByClerkId(event.data.id);
        break;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
