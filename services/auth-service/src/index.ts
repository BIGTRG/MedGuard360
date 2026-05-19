/**
 * auth-service entrypoint. Port 3001.
 *
 * Per CLAUDE.md service checklist:
 *   ✓ Express app with /health, /ready, /metrics    (createServer)
 *   ✓ Winston JSON logger                            (@medguard360/shared)
 *   ✓ JWT middleware                                  (requireAuth)
 *   ✓ Zod input validation                            (routes.ts)
 *   ✓ PG pool                                         (@medguard360/shared)
 *   ✓ Kafka producer                                  (emitEvent)
 *   ✓ Audit logging                                   (auditLog)
 *   ✓ PM2 entry                                       (infrastructure/pm2)
 *   ✓ Prometheus metrics                              (/metrics)
 *   ✓ Jest tests                                      (src/**/*.test.ts)
 *   ✓ README                                          (./README.md)
 */

import { initConfig, createServer, startServer, getPool, getProducer, logger } from '@medguard360/shared';
import { router } from './routes';

const cfg = initConfig('auth-service');

const app = createServer({
  routes: router,
  readinessCheck: async () => {
    // Verify DB + Kafka are reachable before reporting ready.
    try {
      await getPool().query('SELECT 1');
      await getProducer();   // connects lazily
      return true;
    } catch (err) {
      logger.error('readiness check failed', { error: (err as Error).message });
      return false;
    }
  },
});

startServer(app, cfg.port, cfg.serviceName);
