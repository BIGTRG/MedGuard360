import { initConfig, createLogger, createServer, startServer } from '@medguard360/shared';
import { router } from './routes';

const cfg = initConfig('state-config-service');
createLogger('state-config-service');

const app = createServer({ routes: router });

startServer(app, cfg.port, cfg.serviceName);
