import type { NextFunction, Request, Response } from 'express';
import { initConfig } from '../config';
import { ForbiddenError, UnauthorizedError, ValidationError } from '../errors';
import type { AuthClaims } from '../types';
import { issueTokens } from './jwt';
import { errorHandler, requireAuth, requireBiometric, requireRole } from './middleware';

type NextMock = jest.Mock<void, [unknown?]>;

interface CapturedResponse {
  response: Response;
  statusCode?: number;
  body?: unknown;
}

function makeRequest(headers: Record<string, string> = {}): Request {
  const lowerHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    header: (name: string) => lowerHeaders[name.toLowerCase()],
    requestId: 'req-test-1',
  } as Request;
}

function makeResponse(): CapturedResponse {
  const captured: CapturedResponse = {
    response: {} as Response,
  };
  const response = {} as Response;

  response.status = jest.fn<Response, [number]>((status: number) => {
    captured.statusCode = status;
    return response;
  });
  response.json = jest.fn<Response, [unknown]>((body: unknown) => {
    captured.body = body;
    return response;
  });
  captured.response = response;

  return captured;
}

function makeNext(): NextMock {
  return jest.fn<void, [unknown?]>();
}

const authClaims: AuthClaims = {
  sub: '00000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  role: 'billing_manager',
  stateCode: 'NC',
  biometricVerified: true,
  sessionId: '00000000-0000-0000-0000-000000000002',
};

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod-32chars-min';
  process.env.PG_PASSWORD = 'test';
  initConfig('shared-middleware-test');
});

describe('requireAuth', () => {
  it('rejects missing bearer tokens', () => {
    const next = makeNext();

    requireAuth(makeRequest(), makeResponse().response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('attaches verified auth claims for valid bearer tokens', () => {
    const tokens = issueTokens({
      userId: authClaims.sub,
      email: authClaims.email,
      role: authClaims.role,
      stateCode: authClaims.stateCode,
      biometricVerified: authClaims.biometricVerified,
    });
    const req = makeRequest({ authorization: `Bearer ${tokens.accessToken}` });
    const next = makeNext();

    requireAuth(req, makeResponse().response, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
    expect(req.auth).toMatchObject({
      sub: authClaims.sub,
      email: authClaims.email,
      role: 'billing_manager',
      stateCode: 'NC',
      biometricVerified: true,
    });
  });
});

describe('authorization gates', () => {
  it('rejects roles outside the allowed set', () => {
    const req = makeRequest();
    req.auth = { ...authClaims, role: 'patient' };
    const next = makeNext();

    requireRole('billing_manager')(req, makeResponse().response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('requires biometric verification for high-risk actions', () => {
    const req = makeRequest();
    req.auth = { ...authClaims, biometricVerified: false };
    const next = makeNext();

    requireBiometric(req, makeResponse().response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});

describe('errorHandler', () => {
  it('serializes AppError instances without dropping request IDs', () => {
    const res = makeResponse();

    errorHandler(
      new ValidationError('Invalid input', { fieldErrors: { payerId: ['Required'] } }),
      makeRequest(),
      res.response,
      makeNext() as NextFunction,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: { fieldErrors: { payerId: ['Required'] } },
      },
      requestId: 'req-test-1',
    });
  });

  it('maps unexpected errors to a safe 500 response', () => {
    const res = makeResponse();

    errorHandler(new Error('database password leaked'), makeRequest(), res.response, makeNext() as NextFunction);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      requestId: 'req-test-1',
    });
  });
});
