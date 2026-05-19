/**
 * hub-service entry point — port 3015
 *
 * Statewide 1-800 call hub with AI chatbot routing and crisis detection.
 * Mounts all routes under /api/v1/hub/* and starts on port 3015.
 */

import { initConfig, createServer, startServer, getPool, getProducer, logger } from '@medguard360/shared';
import { router } from './routes';

const cfg = initConfig('hub-service');

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

startServer(app, cfg.port || 3015, cfg.serviceName);
