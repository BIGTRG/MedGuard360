import { initConfig, createLogger, createServer, startServer } from '@medguard360/shared';
import { router } from './routes';
import { startNctracksAckPoller } from './nctracks';
import { startNctracksX12Archiver } from './nctracks-x12-archive';

const cfg = initConfig('claims-service');
createLogger('claims-service');

const app = createServer({ routes: router });

startNctracksAckPoller();
startNctracksX12Archiver();
startServer(app, cfg.port, cfg.serviceName);
