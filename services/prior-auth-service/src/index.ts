import { initConfig, createLogger, createServer, startServer } from '@medguard360/shared';
import { router } from './routes';

const cfg = initConfig('prior-auth-service');
createLogger('prior-auth-service');

const app = createServer({ routes: router });

startServer(app, cfg.port, cfg.serviceName);
