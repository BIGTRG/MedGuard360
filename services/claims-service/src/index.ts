import { createLogger, createServer, startServer } from '@medguard360/shared';
import { router } from './routes';

const logger = createLogger('claims-service');

const app = createServer({
  serviceName: 'claims-service',
  routes: router,
  mountPath: '/api/v1',
});

startServer(app, 3008, 'claims-service').catch((err: unknown) => {
  logger.error('failed to start claims-service', { error: (err as Error).message });
  process.exit(1);
});
