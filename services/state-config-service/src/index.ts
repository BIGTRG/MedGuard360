import { createLogger, createServer, startServer } from '@medguard360/shared';
import { router } from './routes';

const logger = createLogger('state-config-service');
const PORT = parseInt(process.env['PORT'] ?? '3018', 10);

const app = createServer('state-config-service');
app.use('/api/v1', router);

startServer(app, PORT, 'state-config-service').catch((err: Error) => {
  logger.error('Failed to start state-config-service', { error: err.message });
  process.exit(1);
});
