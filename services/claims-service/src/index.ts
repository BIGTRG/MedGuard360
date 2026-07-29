import { initConfig, createLogger, createServer, startServer } from '@medguard360/shared';
import { router } from './routes';
import { startNctracksAckPoller } from './nctracks';

const cfg = initConfig('claims-service');
createLogger('claims-service');

const app = createServer({ routes: router });

startNctracksAckPoller();
startServer(app, cfg.port, cfg.serviceName);
