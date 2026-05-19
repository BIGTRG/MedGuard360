import { createLogger, createServer, startServer } from '@medguard360/shared';
import { router } from './routes';

const logger = createLogger('prior-auth-service');

const app = createServer({
  serviceName: 'prior-auth-service',
  routes: router,
  mountPath: '/api/v1',
});

startServer(app, 3006, 'prior-auth-service').catch((err: unknown) => {
  logger.error('failed to start prior-auth-service', { error: (err as Error).message });
  process.exit(1);
});
