/**
 * Express bootstrap helper. Every service calls `createServer()` to get
 * a properly-wired Express app with the standard middleware stack.
 */

import express, { Express, Router } from 'express';
import { requestContext, errorHandler } from '../auth/middleware';
import { metricsRegistry, httpRequestDurationSeconds, httpRequestsTotal } from '../metrics';
import { logger } from '../logger';

export interface ServerOptions {
  /** Mounted under /api/v1 by default. */
  routes: Router;
  /** Optional readiness check — return true when service can serve traffic. */
  readinessCheck?: () => Promise<boolean>;
}

export function createServer(opts: ServerOptions): Express {
  const app = express();

  // Trust proxy so X-Forwarded-* headers from nginx are respected.
  app.set('trust proxy', true);
  app.disable('x-powered-by');

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestContext);

  // HTTP request metrics
  app.use((req, res, next) => {
    const stop = httpRequestDurationSeconds.startTimer();
    res.on('finish', () => {
      const labels = {
        method: req.method,
        route: req.route?.path ?? req.path,
        status: String(res.statusCode),
      };
      httpRequestsTotal.inc(labels);
      stop(labels);
    });
    next();
  });

  // Liveness — am I running?
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Readiness — can I serve traffic? (DB up, Kafka up, etc.)
  app.get('/ready', async (_req, res) => {
    try {
      const ready = opts.readinessCheck ? await opts.readinessCheck() : true;
      res.status(ready ? 200 : 503).json({ ready });
    } catch (err) {
      res.status(503).json({ ready: false, error: (err as Error).message });
    }
  });

  // Prometheus scrape endpoint
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  });

  // Mount business routes under /api/v1
  app.use('/api/v1', opts.routes);

  // Centralized error handler — must be last.
  app.use(errorHandler);

  return app;
}

export function startServer(app: Express, port: number, serviceName: string): void {
  const server = app.listen(port, () => {
    logger.info('service started', { service: serviceName, port });
  });

  const shutdown = (signal: string): void => {
    logger.info('shutdown signal received', { signal });
    server.close((err) => {
      if (err) {
        logger.error('shutdown error', { error: err.message });
        process.exit(1);
      }
      process.exit(0);
    });
    // Force exit if graceful shutdown takes longer than 15s
    setTimeout(() => process.exit(1), 15_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
