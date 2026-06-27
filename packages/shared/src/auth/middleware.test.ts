import { NextFunction, Request, Response } from 'express';
import { ForbiddenError, InternalError, UnauthorizedError } from '../errors';
import { AuthClaims } from '../types';
import { errorHandler, requireBiometric, requireRole } from './middleware';

function makeRequest(auth?: AuthClaims): Request {
  return {
    auth,
    requestId: 'req-123',
  } as unknown as Request;
}

function makeResponse(): Response {
  const res = {
    status: jest.fn<(code: number) => Response>().mockReturnThis(),
    json: jest.fn<(body: unknown) => Response>().mockReturnThis(),
  };
  return res as unknown as Response;
}

function makeNext(): jest.MockedFunction<NextFunction> {
  return jest.fn() as jest.MockedFunction<NextFunction>;
}

const baseClaims: AuthClaims = {
  sub: '00000000-0000-0000-0000-000000000001',
  email: 'reviewer@example.com',
  role: 'prior_auth_specialist',
  stateCode: 'NC',
  biometricVerified: true,
  sessionId: 'session-123',
};

describe('auth middleware permission gates', () => {
  it('blocks requests without auth before role checks', () => {
    const next = makeNext();

    requireRole('prior_auth_specialist')(makeRequest(), makeResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });

  it('blocks authenticated users with roles outside the allow-list', () => {
    const next = makeNext();

    requireRole('compliance_officer')(makeRequest(baseClaims), makeResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    const error = next.mock.calls[0]?.[0] as ForbiddenError;
    expect(error.message).toContain('prior_auth_specialist');
  });

  it('allows authenticated users whose role is explicitly permitted', () => {
    const next = makeNext();

    requireRole('prior_auth_specialist', 'compliance_officer')(
      makeRequest(baseClaims),
      makeResponse(),
      next,
    );

    expect(next).toHaveBeenCalledWith();
  });

  it('requires biometric verification for high-risk routes', () => {
    const next = makeNext();
    const claimsWithoutBiometric: AuthClaims = {
      ...baseClaims,
      biometricVerified: false,
    };

    requireBiometric(makeRequest(claimsWithoutBiometric), makeResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });
});

describe('errorHandler', () => {
  it('serializes AppError responses with the request id', () => {
    const res = makeResponse();

    errorHandler(
      new ForbiddenError('Human review required'),
      makeRequest(baseClaims),
      res,
      makeNext(),
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'FORBIDDEN',
        message: 'Human review required',
        details: undefined,
      },
      requestId: 'req-123',
    });
  });

  it('does not leak unhandled error details to API callers', () => {
    const res = makeResponse();

    errorHandler(
      new Error('database password leaked in stack'),
      makeRequest(baseClaims),
      res,
      makeNext(),
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
      requestId: 'req-123',
    });
  });

  it('preserves InternalError details for service-side AppError diagnostics', () => {
    const res = makeResponse();

    errorHandler(
      new InternalError('Database query failed', { operation: 'phi-read' }),
      makeRequest(baseClaims),
      res,
      makeNext(),
    );

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Database query failed',
        details: { operation: 'phi-read' },
      },
      requestId: 'req-123',
    });
  });
});
