/**
 * Consumes clinical.note.created → calls crisis-detector → raises alert if critical.
 * Consumes crisis.alert.raised from hub-service → ensures alert row exists.
 */

import axios from 'axios';
import { consumeEvents, logger, DomainEvent, config, UpstreamError } from '@medguard360/shared';
import { createAlert } from './repository';

const detector = axios.create({ baseURL: 'http://localhost:8009', timeout: 5000,
  headers: { 'x-service-caller': config.serviceName } });
detector.interceptors.response.use(r => r, err => Promise.reject(new UpstreamError('crisis-detector', err.message)));

const clinicalDoc = axios.create({ baseURL: 'http://localhost:3007/api/v1', timeout: 5000,
  headers: { 'x-service-caller': config.serviceName } });

interface NoteCreatedPayload {
  encounterId: string; docId: string; charCount: number;
  patientId?: string; stateCode?: string;
}

export async function startConsumer(): Promise<void> {
  await consumeEvents('crisis-service',
    ['clinical.note.created', 'crisis.alert.raised'],
    async (event: DomainEvent) => {
      if (event.eventType === 'clinical.note.created') {
        const p = event.payload as NoteCreatedPayload;
        try {
          // Note: clinical-doc-service requires auth; in production this is a
          // service-account JWT issued at startup. For the demo we skip and rely
          // on the note text being included in a future event-payload upgrade.
          let text = '';
          try {
            const resp = await clinicalDoc.get<{ extractedText: string }>(`/clinical-doc/${p.docId}`, {
              headers: { authorization: process.env.SERVICE_JWT ? `Bearer ${process.env.SERVICE_JWT}` : '' },
            });
            text = resp.data.extractedText ?? '';
          } catch (err) {
            logger.debug('cannot fetch clinical doc text for crisis scan', { docId: p.docId });
            return;
          }
          if (!text) return;

          const detection = await detector.post<{
            is_crisis: boolean; severity: string; signals: unknown[]; engine_version: string;
          }>('/v1/detect', { text, context: 'clinical_note', patient_id: p.patientId });

          if (detection.data.is_crisis && ['high','critical'].includes(detection.data.severity)) {
            await createAlert({
              patientId: p.patientId, stateCode: p.stateCode ?? 'NC',
              source: 'clinical_note',
              severity: detection.data.severity as 'high' | 'critical',
              signals: detection.data.signals,
              detectorEngineVersion: detection.data.engine_version,
              correlationId: event.correlationId,
            });
            logger.info('crisis alert raised from clinical note', {
              docId: p.docId, severity: detection.data.severity,
            });
          }
        } catch (err) {
          logger.error('crisis detection on note failed', { error: (err as Error).message });
        }
      } else if (event.eventType === 'crisis.alert.raised') {
        // hub-service raises this directly; ensure we have a row
        const p = event.payload as { stateCode: string; fromNumber?: string; ticketId?: string };
        await createAlert({
          stateCode: p.stateCode, source: 'hub_chat', severity: 'high',
          signals: { hub_ticket_id: p.ticketId, from_number: p.fromNumber },
          correlationId: event.correlationId,
        });
      }
    },
  );
  logger.info('crisis-service consumer started');
}
