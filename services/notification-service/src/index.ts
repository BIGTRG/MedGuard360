/**
 * notification-service entry point — port 3017
 *
 * Starts:
 *   1. Kafka consumer (pa.decided, credentialing.*, crisis.*, fraud.*, etc.)
 *   2. Express HTTP server (POST /send, GET /logs)
 */

import { initConfig, createServer, startServer, getPool, getProducer, logger } from '@medguard360/shared';
import { router } from './routes';
import { startConsumer } from './consumer';

const cfg = initConfig('notification-service');

const app = createServer({
  routes: router,
  readinessCheck: async () => {
    try {
      await getPool().query('SELECT 1');
      await getProducer();
      return true;
    } catch (err) {
      logger.error('readiness check failed', { error: (err as Error).message });
      return false;
    }
  },
});

// Start HTTP server on port 3017 (overridden by PORT env / vault key)
startServer(app, cfg.port || 3017, cfg.serviceName);

// Start Kafka consumer — crash the process if it fails to connect
startConsumer().catch((err: Error) => {
  logger.error('notification-service consumer crashed', { error: err.message, stack: err.stack });
  process.exit(1);
});
