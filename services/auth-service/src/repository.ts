/**
 * Postgres data access for auth-service.
 *
 * The users / sessions tables are NOT subject to per-state RLS for auth flows
 * (the user is logging in — we don't know who they are yet). We use the plain
 * `query()` helper, scoped to this service only.
 */

import crypto from 'node:crypto';
import { query, NotFoundError, ConflictError } from '@medguard360/shared';
import { UserRow, SessionRow } from './types';

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await query<UserRow>(
    'auth.findUserByEmail',
    'SELECT * FROM users WHERE email = $1 LIMIT 1',
    [email.toLowerCase()],
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow> {
  const result = await query<UserRow>(
    'auth.findUserById',
    'SELECT * FROM users WHERE id = $1 LIMIT 1',
    [id],
  );
  const user = result.rows[0];
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function bumpFailedLogin(userId: string, lockoutThreshold: number): Promise<void> {
  await query(
    'auth.bumpFailedLogin',
    `UPDATE users
       SET failed_login_count = failed_login_count + 1,
           locked_until = CASE
             WHEN failed_login_count + 1 >= $2 THEN now() + interval '15 minutes'
             ELSE locked_until
           END
     WHERE id = $1`,
    [userId, lockoutThreshold],
  );
}

export async function recordSuccessfulLogin(userId: string): Promise<void> {
  await query(
    'auth.recordSuccessfulLogin',
    `UPDATE users
       SET failed_login_count = 0,
           locked_until = NULL,
           last_login_at = now()
     WHERE id = $1`,
    [userId],
  );
}

export interface BiometricEnrollmentInput {
  userId: string;
  modality: 'face' | 'thumbprint' | 'voice';
  vendor: string;
  templateEncrypted: Buffer;
  templateKid: string;
  createdBy: string;
}

export async function upsertBiometricEnrollment(input: BiometricEnrollmentInput): Promise<void> {
  await query(
    'auth.upsertBiometricEnrollment',
    `INSERT INTO biometric_enrollments
       (user_id, modality, vendor, template_encrypted, template_kid, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, modality, vendor) DO UPDATE
       SET template_encrypted = EXCLUDED.template_encrypted,
           template_kid = EXCLUDED.template_kid,
           enrolled_at = now(),
           revoked_at = NULL`,
    [input.userId, input.modality, input.vendor, input.templateEncrypted,
     input.templateKid, input.createdBy],
  );
  await query(
    'auth.markBiometricEnrolledOnUser',
    `UPDATE users SET biometric_enrolled_at = now()
     WHERE id = $1 AND biometric_enrolled_at IS NULL`,
    [input.userId],
  );
}

export async function setClerkUserId(userId: string, clerkUserId: string): Promise<void> {
  await query(
    'auth.setClerkUserId',
    `UPDATE users SET clerk_user_id = $2 WHERE id = $1`,
    [userId, clerkUserId],
  );
}

export async function deactivateByClerkId(clerkUserId: string): Promise<void> {
  await query(
    'auth.deactivateByClerkId',
    `UPDATE users SET status = 'deactivated' WHERE clerk_user_id = $1`,
    [clerkUserId],
  );
}

export interface CreateSessionInput {
  sessionId: string;
  userId: string;
  refreshToken: string;
  ip?: string;
  userAgent?: string;
  expiresAt: Date;
}

export async function createSession(input: CreateSessionInput): Promise<void> {
  await query(
    'auth.createSession',
    `INSERT INTO sessions (id, user_id, refresh_token_hash, ip, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.sessionId,
      input.userId,
      hashRefreshToken(input.refreshToken),
      input.ip ?? null,
      input.userAgent ?? null,
      input.expiresAt,
    ],
  );
}

export async function findActiveSession(sessionId: string, refreshToken: string): Promise<SessionRow> {
  const result = await query<SessionRow>(
    'auth.findActiveSession',
    `SELECT * FROM sessions
       WHERE id = $1
         AND refresh_token_hash = $2
         AND revoked_at IS NULL
         AND expires_at > now()
       LIMIT 1`,
    [sessionId, hashRefreshToken(refreshToken)],
  );
  const session = result.rows[0];
  if (!session) throw new NotFoundError('Session');
  return session;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await query(
    'auth.revokeSession',
    'UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL',
    [sessionId],
  );
}

export async function rotateSessionRefreshToken(
  sessionId: string,
  newRefreshToken: string,
  newExpiresAt: Date,
): Promise<void> {
  await query(
    'auth.rotateSessionRefreshToken',
    `UPDATE sessions
       SET refresh_token_hash = $2, expires_at = $3
     WHERE id = $1`,
    [sessionId, hashRefreshToken(newRefreshToken), newExpiresAt],
  );
}

export async function markSessionBiometricVerified(sessionId: string): Promise<void> {
  await query(
    'auth.markBiometricVerified',
    'UPDATE sessions SET biometric_verified_at = now() WHERE id = $1',
    [sessionId],
  );
}

export interface InsertUserInput {
  email: string;
  passwordHash: string;
  role: UserRow['role'];
  stateCode?: string;
  orgId?: string;
  createdBy?: string;
}

export async function insertUser(input: InsertUserInput): Promise<UserRow> {
  try {
    const result = await query<UserRow>(
      'auth.insertUser',
      `INSERT INTO users (email, password_hash, role, state_code, org_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        input.email.toLowerCase(),
        input.passwordHash,
        input.role,
        input.stateCode ?? null,
        input.orgId ?? null,
        input.createdBy ?? null,
      ],
    );
    return result.rows[0];
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === '23505') throw new ConflictError('Email already registered');
    throw err;
  }
}
