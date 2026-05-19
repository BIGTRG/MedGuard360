import { createServer, startServer } from '@medguard360/shared';
import { router } from './routes';

const SERVICE_NAME = 'clinical-doc-service';
const PORT = parseInt(process.env.PORT ?? '3007', 10);

async function main() {
  const app = createServer(SERVICE_NAME);
  app.use('/api/v1/encounters', router);
  await startServer(app, PORT, SERVICE_NAME);
}

main().catch((err) => {
  console.error('Fatal startup error', err);
  process.exit(1);
});
