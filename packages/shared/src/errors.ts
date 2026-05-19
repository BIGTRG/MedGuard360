/**
 * Domain error classes. Every service throws these instead of generic Error
 * so the HTTP error middleware can map them to correct status codes without
 * leaking internals.
 */

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(429, 'RATE_LIMIT', message);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error', details?: unknown) {
    super(500, 'INTERNAL_ERROR', message, details);
  }
}

export class UpstreamError extends AppError {
  constructor(upstream: string, message: string) {
    super(502, 'UPSTREAM_ERROR', `${upstream}: ${message}`);
  }
}

/**
 * Convert any thrown value to a safe HTTP response shape.
 * Use in Express error handlers and tRPC adapters.
 */
export function toHttpResponse(err: unknown): {
  statusCode: number;
  body: { error: { code: string; message: string; details?: unknown } };
} {
  if (err instanceof AppError) {
    return {
      statusCode: err.status,
      body: { error: { code: err.code, message: err.message, details: err.details } },
    };
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  return {
    statusCode: 500,
    body: { error: { code: 'INTERNAL_ERROR', message } },
  };
}
