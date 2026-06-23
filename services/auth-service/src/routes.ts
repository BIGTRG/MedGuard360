/**
 * HTTP routes for auth-service.
 *
 * Routes mounted under /api/v1 (set up by createServer in @medguard360/shared).
 * Effective public paths:
 *   POST /api/v1/auth/register
 *   POST /api/v1/auth/login
 *   POST /api/v1/auth/refresh
 *   POST /api/v1/auth/logout
 *   POST /api/v1/auth/biometric/verify
 *   GET  /api/v1/auth/me
 */

import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import {
  issueTokens, verifyRefreshToken, requireAuth, auditLog, emitEvent,
  UnauthorizedError, ValidationError, ConflictError, ALL_USER_ROLES, UserRole, config,
} from '@medguard360/shared';
import * as repo from './repository';
import { enrollBiometric, verifyBiometric } from './biometric';

const BCRYPT_ROUNDS = 12;
const LOCKOUT_THRESHOLD = 5;

// ---------- schemas ----------
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  role: z.enum(ALL_USER_ROLES as unknown as [UserRole, ...UserRole[]]),
  stateCode: z.string().length(2).optional(),
  orgId: z.string().uuid().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const LogoutSchema = z.object({
  refreshToken: z.string().min(1),
});

const BiometricVerifySchema = z.object({
  modality: z.enum(['face', 'thumbprint', 'voice']),
  samplePayloadBase64: z.string().min(1),
});

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError('Invalid request body', result.error.flatten());
  }
  return result.data;
}

const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };

// ---------- router ----------
export const router = Router();

// POST /auth/register — admin-only typically; for bootstrap can be open in dev.
router.post('/auth/register', asyncHandler(async (req, res) => {
  const input = parse(RegisterSchema, req.body);
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await repo.insertUser({
    email: input.email,
    passwordHash,
    role: input.role,
    stateCode: input.stateCode,
    orgId: input.orgId,
    createdBy: req.auth?.sub,
  });

  await emitEvent('user.created', {
    userId: user.id,
    email: user.email,
    role: user.role,
    stateCode: user.state_code,
    orgId: user.org_id,
  }, { actorUserId: req.auth?.sub, correlationId: req.correlationId });

  await auditLog({
    resource: 'user', resourceId: user.id, action: 'create',
    actor: req.auth ?? {
      sub: 'system', role: 'platform_administrator', email: 'system@medguard360', sessionId: 'system',
    },
    outcome: 'success', correlationId: req.correlationId,
  });

  res.status(201).json({ id: user.id, email: user.email, role: user.role });
}));

// POST /auth/login
router.post('/auth/login', asyncHandler(async (req, res) => {
  const input = parse(LoginSchema, req.body);
  const user = await repo.findUserByEmail(input.email);

  if (!user) {
    // Constant-time: still hash a dummy to avoid revealing whether email exists.
    await bcrypt.compare(input.password, '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvali');
    throw new UnauthorizedError('Invalid credentials');
  }

  if (user.locked_until && user.locked_until > new Date()) {
    await emitEvent('user.login.failed', { userId: user.id, reason: 'locked' });
    throw new UnauthorizedError('Account temporarily locked');
  }
  if (user.status !== 'active') {
    throw new UnauthorizedError('Account not active');
  }

  const ok = await bcrypt.compare(input.password, user.password_hash);
  if (!ok) {
    await repo.bumpFailedLogin(user.id, LOCKOUT_THRESHOLD);
    await emitEvent('user.login.failed', { userId: user.id, reason: 'bad_password' });
    throw new UnauthorizedError('Invalid credentials');
  }

  const tokens = issueTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
    stateCode: user.state_code ?? undefined,
    orgId: user.org_id ?? undefined,
    biometricVerified: false,
  });

  await repo.createSession({
    sessionId: tokens.sessionId,
    userId: user.id,
    refreshToken: tokens.refreshToken,
    ip: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
    expiresAt: new Date(tokens.refreshExpiresAt),
  });
  await repo.recordSuccessfulLogin(user.id);

  await emitEvent('user.login.succeeded', {
    userId: user.id, sessionId: tokens.sessionId, role: user.role,
  }, { actorUserId: user.id, correlationId: req.correlationId });

  await auditLog({
    resource: 'session', resourceId: tokens.sessionId, action: 'login',
    actor: { sub: user.id, role: user.role, email: user.email,
             sessionId: tokens.sessionId, orgId: user.org_id ?? undefined,
             stateCode: user.state_code ?? undefined },
    outcome: 'success', correlationId: req.correlationId,
    context: { ip: req.ip, userAgent: req.header('user-agent') },
  });

  res.json(tokens);
}));

// POST /auth/refresh
router.post('/auth/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = parse(RefreshSchema, req.body);
  const claims = verifyRefreshToken(refreshToken);
  const session = await repo.findActiveSession(claims.sessionId, refreshToken);
  const user = await repo.findUserById(session.user_id);

  const tokens = issueTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
    stateCode: user.state_code ?? undefined,
    orgId: user.org_id ?? undefined,
    biometricVerified: session.biometric_verified_at !== null,
    sessionId: session.id,
  });
  // Rotate refresh token while keeping JWT claims aligned with the persisted session row.
  await repo.rotateSessionRefreshToken(
    session.id,
    tokens.refreshToken,
    new Date(tokens.refreshExpiresAt),
  );

  res.json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    accessExpiresAt: tokens.accessExpiresAt,
    refreshExpiresAt: tokens.refreshExpiresAt,
    sessionId: tokens.sessionId,
  });
}));

// POST /auth/logout
router.post('/auth/logout', requireAuth, asyncHandler(async (req, res) => {
  const { refreshToken } = parse(LogoutSchema, req.body);
  const claims = verifyRefreshToken(refreshToken);
  if (claims.sub !== req.auth!.sub) throw new UnauthorizedError('Token mismatch');
  await repo.revokeSession(claims.sessionId);

  await emitEvent('user.logout', { userId: req.auth!.sub, sessionId: claims.sessionId },
    { actorUserId: req.auth!.sub, correlationId: req.correlationId });
  await auditLog({
    resource: 'session', resourceId: claims.sessionId, action: 'logout',
    actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
  });
  res.status(204).send();
}));

// POST /auth/biometric/verify — confirms biometric, marks session as biometric-verified.
// Caller MUST then exchange for a fresh access token via /auth/refresh to pick up the claim.
router.post('/auth/biometric/verify', requireAuth, asyncHandler(async (req, res) => {
  const input = parse(BiometricVerifySchema, req.body);
  const result = await verifyBiometric({
    userId: req.auth!.sub,
    modality: input.modality,
    samplePayloadBase64: input.samplePayloadBase64,
    stateCode: req.auth!.stateCode,
  });

  if (!result.verified) {
    await auditLog({
      resource: 'biometric', resourceId: req.auth!.sub, action: 'login',
      actor: req.auth!, outcome: 'denied', correlationId: req.correlationId,
      context: { modality: input.modality, score: result.score, vendor: result.vendor,
                 vendorTxnId: result.vendorTxnId, rejectionReason: result.rejectionReason },
    });
    throw new UnauthorizedError('Biometric verification failed');
  }

  await repo.markSessionBiometricVerified(req.auth!.sessionId);
  await auditLog({
    resource: 'biometric', resourceId: req.auth!.sub, action: 'login',
    actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
    context: { modality: input.modality, score: result.score, vendor: result.vendor,
               vendorTxnId: result.vendorTxnId, livenessConfidence: result.livenessConfidence },
  });
  res.json({ verified: true, requiresTokenRefresh: true });
}));

// POST /auth/biometric/enroll — register biometric template(s) for a user
const BiometricEnrollSchema = z.object({
  modality: z.enum(['face', 'thumbprint', 'voice']),
  enrollmentSamplesBase64: z.array(z.string().min(1)).min(3).max(10),
});

router.post('/auth/biometric/enroll', requireAuth, asyncHandler(async (req, res) => {
  const input = parse(BiometricEnrollSchema, req.body);
  const result = await enrollBiometric({
    userId: req.auth!.sub,
    modality: input.modality,
    enrollmentSamplesBase64: input.enrollmentSamplesBase64,
    stateCode: req.auth!.stateCode,
  });

  await repo.upsertBiometricEnrollment({
    userId: req.auth!.sub,
    modality: input.modality,
    vendor: result.vendor,
    templateEncrypted: result.encryptedTemplate,
    templateKid: result.templateKid,
    createdBy: req.auth!.sub,
  });

  await auditLog({
    resource: 'biometric', resourceId: req.auth!.sub, action: 'create',
    actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
    context: { modality: input.modality, vendor: result.vendor, templateId: result.templateId },
  });
  res.status(201).json({ enrolled: true, vendor: result.vendor, templateId: result.templateId });
}));

// POST /auth/clerk/exchange — Clerk session token → our JWT
router.post('/auth/clerk/exchange', asyncHandler(async (req, res) => {
  const Schema = z.object({ sessionToken: z.string().min(10) });
  const input = parse(Schema, req.body);
  const { exchangeClerkSession, clerkEnabled } = await import('./clerk');
  if (!clerkEnabled()) throw new ValidationError('Clerk integration not configured. Set CLERK_SECRET_KEY.');
  const tokens = await exchangeClerkSession(input.sessionToken, req.ip, req.header('user-agent') ?? undefined);
  await emitEvent('user.login.succeeded',
    { sessionId: tokens.sessionId, source: 'clerk' },
    { correlationId: req.correlationId },
  );
  res.json(tokens);
}));

// POST /auth/clerk/webhook — Clerk → us (user lifecycle events)
router.post('/auth/clerk/webhook', asyncHandler(async (req, res, next) => {
  const { handleWebhook } = await import('./clerk');
  await handleWebhook(req, res, next);
}));

// GET /auth/me — convenience for portals
router.get('/auth/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await repo.findUserById(req.auth!.sub);
  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    stateCode: user.state_code,
    orgId: user.org_id,
    biometricEnrolledAt: user.biometric_enrolled_at,
    biometricVerifiedInSession: req.auth!.biometricVerified,
  });
}));

// Surface unused import noise
void ConflictError;
void config;
