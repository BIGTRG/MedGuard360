/**
 * audit-log-service entry point.
 *
 * Starts the Kafka consumer FIRST — missing audit events is a HIPAA violation,
 * so we treat consumer startup failure as fatal and refuse to serve HTTP at all.
 * PM2 will restart the whole process.
 */

import { createLogger, createServer, startServer } from '@medguard360/shared';
import { router } from './routes';
import { startConsumer } from './consumer';

const logger = createLogger('audit-log-service');
const PORT = parseInt(process.env['PORT'] ?? '3019', 10);

async function main(): Promise<void> {
  // Kafka consumer must start successfully before we open the HTTP port.
  try {
    await startConsumer();
  } catch (err) {
    logger.error('FATAL: Kafka consumer failed to start — refusing to boot', {
      error: (err as Error).message,
    });
    process.exit(1);
  }

  const app = createServer('audit-log-service');
  app.use('/api/v1', router);

  await startServer(app, PORT, 'audit-log-service');
}

main().catch((err: Error) => {
  logger.error('Unhandled startup error', { error: err.message, stack: err.stack });
  process.exit(1);
});
