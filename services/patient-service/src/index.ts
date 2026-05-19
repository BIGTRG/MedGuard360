import { createLogger, createServer, startServer } from '@medguard360/shared';
import { router } from './routes';

const logger = createLogger('patient-service');
const PORT = parseInt(process.env['PORT'] ?? '3004', 10);

const app = createServer('patient-service');
app.use('/api/v1', router);

startServer(app, PORT, 'patient-service').catch((err: Error) => {
  logger.error('Failed to start patient-service', { error: err.message });
  process.exit(1);
});
