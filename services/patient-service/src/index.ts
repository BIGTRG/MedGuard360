import { initConfig, createLogger, createServer, startServer } from '@medguard360/shared';
import { router } from './routes';

initConfig('patient-service');
const logger = createLogger('patient-service');
const PORT = parseInt(process.env['PORT'] ?? '3004', 10);

const app = createServer({ routes: router });

startServer(app, PORT, 'patient-service').catch((err: Error) => {
  logger.error('Failed to start patient-service', { error: err.message });
  process.exit(1);
});
