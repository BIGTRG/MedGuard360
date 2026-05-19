/**
 * Express middleware: JWT auth + role gating + biometric gating.
 *
 * Per CLAUDE.md: JWT middleware on ALL routes (except /health, /metrics).
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { verifyAccessToken } from './jwt';
import { UnauthorizedError, ForbiddenError, AppError } from '../errors';
import { UserRole } from '../types';
import { logger } from '../logger';

/** Attaches `req.requestId` and `req.correlationId` to every request. */
export const requestContext: RequestHandler = (req, _res, next) => {
  req.requestId = (req.header('x-request-id') ?? uuidv4());
  req.correlationId = req.header('x-correlation-id') ?? req.requestId;
  next();
};

/** Verifies JWT, attaches `req.auth`. Throws 401 if missing/invalid. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing bearer token'));
  }
  try {
    const token = header.slice('Bearer '.length).trim();
    req.auth = verifyAccessToken(token);
    next();
  } catch (err) {
    next(err);
  }
};

/** Gate by user role. Pass any number of allowed roles. */
export function requireRole(...allowed: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(new UnauthorizedError());
    if (!allowed.includes(req.auth.role)) {
      return next(new ForbiddenError(`Role ${req.auth.role} not permitted for this resource`));
    }
    next();
  };
}

/** Require recent biometric verification (used on high-risk endpoints). */
export const requireBiometric: RequestHandler = (req, _res, next) => {
  if (!req.auth) return next(new UnauthorizedError());
  if (!req.auth.biometricVerified) {
    return next(new ForbiddenError('Biometric verification required for this action'));
  }
  next();
};

/** Centralized error handler — must be registered LAST. */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error('request failed', {
        requestId: req.requestId,
        code: err.code,
        message: err.message,
        details: err.details,
      });
    }
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
      requestId: req.requestId,
    });
    return;
  }
  logger.error('unhandled error', { requestId: req.requestId, error: err.message, stack: err.stack });
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    requestId: req.requestId,
  });
};
