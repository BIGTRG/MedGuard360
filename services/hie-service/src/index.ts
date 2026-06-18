/**
 * hie-service — FHIR R4 HIE Integration Gateway
 *
 * Port:    3020
 * Purpose: Provides FHIR R4 endpoints for Health Information Exchange,
 *          patient data export, inbound HIE bundle import, and referral management.
 *
 * Standards:
 *   - HL7 FHIR R4
 *   - CMS Interoperability and Prior Authorization Final Rule (CMS-0057-F)
 *   - 42 CFR Part 2 (SUD data sharing consent)
 */

import { initConfig, createServer, startServer, getPool, getProducer, logger } from '@medguard360/shared';
import { router } from './routes';

const cfg = initConfig('hie-service');

const app = createServer({
  routes: router,
  readinessCheck: async () => {
    try {
      await getPool().query('SELECT 1');
      await getProducer();
      return true;
    } catch (err) {
      logger.error('ready check failed', { error: (err as Error).message });
      return false;
    }
  },
});

startServer(app, cfg.port, cfg.serviceName);

logger.info('hie-service initialising', { port: cfg.port });
