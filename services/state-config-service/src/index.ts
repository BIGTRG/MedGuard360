import { initConfig, createLogger, createServer, startServer } from '@medguard360/shared';
import { router } from './routes';

initConfig('state-config-service');
const logger = createLogger('state-config-service');
const PORT = parseInt(process.env['PORT'] ?? '3018', 10);

const app = createServer({ routes: router });

startServer(app, PORT, 'state-config-service').catch((err: Error) => {
  logger.error('Failed to start state-config-service', { error: err.message });
  process.exit(1);
});
