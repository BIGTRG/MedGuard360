/**
 * JWT issuance + verification.
 *
 * Tokens are short-lived (15m access, 7d refresh). Biometric verification
 * is a claim on the token, not a separate token — set when biometric verify
 * succeeds and required for high-risk endpoints (claim submission, PHI export).
 */

import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { AuthClaims, UserRole } from '../types';
import { UnauthorizedError } from '../errors';

export interface IssueTokenInput {
  userId: string;
  email: string;
  role: UserRole;
  stateCode?: string;
  orgId?: string;
  biometricVerified?: boolean;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  sessionId: string;
}

export function issueTokens(input: IssueTokenInput): IssuedTokens {
  const sessionId = uuidv4();
  const now = Math.floor(Date.now() / 1000);

  const baseClaims: AuthClaims = {
    sub: input.userId,
    email: input.email,
    role: input.role,
    stateCode: input.stateCode,
    orgId: input.orgId,
    biometricVerified: input.biometricVerified ?? false,
    sessionId,
  };

  const accessOpts: SignOptions = {
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
    expiresIn: config.jwtAccessTtlSec,
    subject: input.userId,
  };

  const refreshOpts: SignOptions = {
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
    expiresIn: config.jwtRefreshTtlSec,
    subject: input.userId,
  };

  const accessToken = jwt.sign(baseClaims, config.jwtSecret, accessOpts);
  const refreshToken = jwt.sign(
    { sub: input.userId, sessionId, kind: 'refresh' },
    config.jwtSecret,
    refreshOpts,
  );

  return {
    accessToken,
    refreshToken,
    accessExpiresAt: new Date((now + config.jwtAccessTtlSec) * 1000).toISOString(),
    refreshExpiresAt: new Date((now + config.jwtRefreshTtlSec) * 1000).toISOString(),
    sessionId,
  };
}

export function verifyAccessToken(token: string): AuthClaims {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    }) as JwtPayload & AuthClaims;
    return {
      sub: decoded.sub as string,
      email: decoded.email,
      role: decoded.role,
      stateCode: decoded.stateCode,
      orgId: decoded.orgId,
      biometricVerified: decoded.biometricVerified ?? false,
      sessionId: decoded.sessionId,
    };
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

export interface RefreshClaims {
  sub: string;
  sessionId: string;
  kind: 'refresh';
}

export function verifyRefreshToken(token: string): RefreshClaims {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
    }) as JwtPayload & RefreshClaims;
    if (decoded.kind !== 'refresh') {
      throw new UnauthorizedError('Not a refresh token');
    }
    return { sub: decoded.sub as string, sessionId: decoded.sessionId, kind: 'refresh' };
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}
