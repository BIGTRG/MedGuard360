import { initConfig } from '../config';
import { issueTokens, verifyAccessToken, verifyRefreshToken } from './jwt';
import { UnauthorizedError } from '../errors';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod-32chars-min';
  process.env.PG_PASSWORD = 'test';
  initConfig('test-service');
});

describe('JWT issue + verify', () => {
  const input = {
    userId: '00000000-0000-0000-0000-000000000001',
    email: 'test@example.com',
    role: 'compliance_officer' as const,
    stateCode: 'NC',
    biometricVerified: true,
  };

  it('issues access + refresh tokens with correct claims', () => {
    const tokens = issueTokens(input);
    expect(tokens.accessToken).toBeTruthy();
    expect(tokens.refreshToken).toBeTruthy();
    expect(tokens.sessionId).toMatch(/^[0-9a-f-]{36}$/);

    const claims = verifyAccessToken(tokens.accessToken);
    expect(claims.sub).toBe(input.userId);
    expect(claims.email).toBe(input.email);
    expect(claims.role).toBe('compliance_officer');
    expect(claims.stateCode).toBe('NC');
    expect(claims.biometricVerified).toBe(true);
    expect(claims.sessionId).toBe(tokens.sessionId);
  });

  it('rejects garbage access tokens', () => {
    expect(() => verifyAccessToken('not-a-token')).toThrow(UnauthorizedError);
  });

  it('rejects access token used as refresh token', () => {
    const tokens = issueTokens(input);
    expect(() => verifyRefreshToken(tokens.accessToken)).toThrow(UnauthorizedError);
  });

  it('verifies refresh token correctly', () => {
    const tokens = issueTokens(input);
    const refresh = verifyRefreshToken(tokens.refreshToken);
    expect(refresh.sub).toBe(input.userId);
    expect(refresh.sessionId).toBe(tokens.sessionId);
    expect(refresh.kind).toBe('refresh');
  });

  it('preserves an existing session id when rotating tokens', () => {
    const existingSessionId = '10000000-0000-0000-0000-000000000001';
    const tokens = issueTokens({ ...input, sessionId: existingSessionId });

    const access = verifyAccessToken(tokens.accessToken);
    const refresh = verifyRefreshToken(tokens.refreshToken);

    expect(tokens.sessionId).toBe(existingSessionId);
    expect(access.sessionId).toBe(existingSessionId);
    expect(refresh.sessionId).toBe(existingSessionId);
  });
});
