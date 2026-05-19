import { initConfig, createServer, startServer, getPool, getProducer, logger } from '@medguard360/shared';
import { router } from './routes';

const cfg = initConfig('eligibility-service');

const app = createServer({
  routes: router,
  readinessCheck: async () => {
    try { await getPool().query('SELECT 1'); await getProducer(); return true; }
    catch (err) { logger.error('ready check failed', { error: (err as Error).message }); return false; }
  },
});

startServer(app, cfg.port, cfg.serviceName);
