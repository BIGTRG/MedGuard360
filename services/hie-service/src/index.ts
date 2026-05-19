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

import {
  createLogger,
  getConfig,
  getConfigOptional,
  createServer,
  startServer,
} from '@medguard360/shared';
import { router } from './routes';

const log = createLogger('hie-service');
const PORT = Number(getConfigOptional('PORT', '3020'));

const app = createServer({
  routes: router,
});

startServer(app, PORT, 'hie-service');

log.info('hie-service initialising', { port: PORT });
