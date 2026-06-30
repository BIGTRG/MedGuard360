import express, { ErrorRequestHandler, RequestHandler } from 'express';
import request from 'supertest';
import { router } from './routes';
import * as repo from './repository';

type AuthRole = 'platform_administrator' | 'billing_manager';

interface TestAuthClaims {
  sub: string;
  email: string;
  role: AuthRole;
  biometricVerified: boolean;
  sessionId: string;
  stateCode?: string;
}

interface StatusError extends Error {
  status?: number;
  code?: string;
}

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(async () => 'hashed-password'),
  },
}));

jest.mock('./repository', () => ({
  insertUser: jest.fn(),
}));

jest.mock('@medguard360/shared', () => {
  class UnauthorizedError extends Error {
    status = 401;
    code = 'UNAUTHORIZED';
  }

  class ForbiddenError extends Error {
    status = 403;
    code = 'FORBIDDEN';
  }

  class ValidationError extends Error {
    status = 400;
    code = 'VALIDATION_ERROR';
  }

  class ConflictError extends Error {
    status = 409;
    code = 'CONFLICT';
  }

  const authByToken: Record<string, TestAuthClaims> = {
    admin: {
      sub: 'admin-user-id',
      email: 'admin@demo.medguard360.com',
      role: 'platform_administrator',
      biometricVerified: false,
      sessionId: 'admin-session-id',
      stateCode: 'NC',
    },
    billing: {
      sub: 'billing-user-id',
      email: 'billing@demo.medguard360.com',
      role: 'billing_manager',
      biometricVerified: false,
      sessionId: 'billing-session-id',
      stateCode: 'NC',
    },
  };

  const requireAuth: RequestHandler = (req, _res, next) => {
    const authorization = req.header('authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;
    const auth = token ? authByToken[token] : undefined;
    if (!auth) return next(new UnauthorizedError('Missing bearer token'));
    req.auth = auth;
    return next();
  };

  const requireRole = (...allowed: AuthRole[]): RequestHandler =>
    (req, _res, next) => {
      if (!req.auth) return next(new UnauthorizedError('Missing bearer token'));
      if (!allowed.includes(req.auth.role as AuthRole)) {
        return next(new ForbiddenError(`Role ${req.auth.role} not permitted for this resource`));
      }
      return next();
    };

  return {
    ALL_USER_ROLES: [
      'patient',
      'individual_provider',
      'facility_provider',
      'pharmacy',
      'dmepos_supplier',
      'nemt_broker',
      'mco_admin',
      'state_medicaid_agency',
      'federal_cms',
      'credentialing_specialist',
      'prior_auth_specialist',
      'billing_manager',
      'compliance_officer',
      'fraud_investigator',
      'denial_appeals_specialist',
      'school_administrator',
      'hie_administrator',
      'emergency_responder',
      'qa_auditor',
      'platform_administrator',
    ],
    auditLog: jest.fn(async () => undefined),
    config: {},
    ConflictError,
    emitEvent: jest.fn(async () => undefined),
    issueTokens: jest.fn(),
    requireAuth,
    requireRole,
    UnauthorizedError,
    ValidationError,
    verifyRefreshToken: jest.fn(),
  };
});

const insertUser = repo.insertUser as jest.MockedFunction<typeof repo.insertUser>;

function createTestApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', router);
  const errorHandler: ErrorRequestHandler = (err: StatusError, _req, res, _next) => {
    res.status(err.status ?? 500).json({
      error: { code: err.code ?? 'INTERNAL_ERROR', message: err.message },
    });
  };
  app.use(errorHandler);
  return app;
}

describe('auth register route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    insertUser.mockResolvedValue({
      id: 'new-user-id',
      email: 'new-admin@example.com',
      password_hash: 'hashed-password',
      role: 'platform_administrator',
      status: 'active',
      state_code: 'NC',
      org_id: null,
      clerk_user_id: null,
      biometric_enrolled_at: null,
      last_login_at: null,
      failed_login_count: 0,
      locked_until: null,
    });
  });

  it('rejects anonymous role self-provisioning', async () => {
    const app = createTestApp();

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'attacker@example.com',
        password: 'VerySecurePassword!1',
        role: 'platform_administrator',
        stateCode: 'NC',
      });

    expect(response.status).toBe(401);
    expect(insertUser).not.toHaveBeenCalled();
  });

  it('rejects non-admin callers', async () => {
    const app = createTestApp();

    const response = await request(app)
      .post('/api/v1/auth/register')
      .set('authorization', 'Bearer billing')
      .send({
        email: 'attacker@example.com',
        password: 'VerySecurePassword!1',
        role: 'platform_administrator',
        stateCode: 'NC',
      });

    expect(response.status).toBe(403);
    expect(insertUser).not.toHaveBeenCalled();
  });

  it('allows platform administrators to create users', async () => {
    const app = createTestApp();

    const response = await request(app)
      .post('/api/v1/auth/register')
      .set('authorization', 'Bearer admin')
      .send({
        email: 'new-admin@example.com',
        password: 'VerySecurePassword!1',
        role: 'platform_administrator',
        stateCode: 'NC',
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 'new-user-id',
      email: 'new-admin@example.com',
      role: 'platform_administrator',
    });
    expect(insertUser).toHaveBeenCalledWith({
      email: 'new-admin@example.com',
      passwordHash: 'hashed-password',
      role: 'platform_administrator',
      stateCode: 'NC',
      orgId: undefined,
      createdBy: 'admin-user-id',
    });
  });
});
