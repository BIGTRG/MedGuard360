import type { DomainEvent } from '@medguard360/shared';
import { handleCrisisEvent, type CrisisConsumerDependencies } from './consumer';
import type { AlertRow } from './types';

interface NoteCreatedPayload {
  encounterId: string;
  docId: string;
  charCount: number;
  patientId?: string;
  stateCode?: string;
}

type ClinicalDocGet = CrisisConsumerDependencies['clinicalDoc']['get'];
type DetectorPost = CrisisConsumerDependencies['detector']['post'];
type CreateAlert = CrisisConsumerDependencies['createAlert'];

const alertRow: AlertRow = {
  id: 'alert-1',
  patient_id: 'patient-1',
  state_code: 'NC',
  source: 'clinical_note',
  severity: 'critical',
  signals: [],
  detected_at: new Date('2026-06-21T10:00:00Z'),
  notified_911: false,
  status: 'active',
};

function noteEvent(payload: Partial<NoteCreatedPayload> = {}): DomainEvent<NoteCreatedPayload> {
  return {
    eventId: 'event-1',
    eventType: 'clinical.note.created',
    eventVersion: 1,
    occurredAt: '2026-06-21T10:00:00Z',
    producer: 'clinical-doc-service',
    correlationId: 'corr-1',
    payload: {
      encounterId: 'encounter-1',
      docId: 'doc-1',
      charCount: 128,
      patientId: 'patient-1',
      stateCode: 'SC',
      ...payload,
    },
  };
}

function makeDeps() {
  const clinicalDocGet = jest.fn<ReturnType<ClinicalDocGet>, Parameters<ClinicalDocGet>>();
  const detectorPost = jest.fn<ReturnType<DetectorPost>, Parameters<DetectorPost>>();
  const createAlert = jest.fn<ReturnType<CreateAlert>, Parameters<CreateAlert>>();
  const logger = {
    debug: jest.fn<void, [string, unknown?]>(),
    error: jest.fn<void, [string, unknown?]>(),
    info: jest.fn<void, [string, unknown?]>(),
  };

  clinicalDocGet.mockResolvedValue({
    data: { extractedText: 'Patient reports an immediate self-harm plan.' },
  });
  detectorPost.mockResolvedValue({
    data: {
      is_crisis: true,
      severity: 'critical',
      signals: [{ type: 'self_harm_intent' }],
      engine_version: 'crisis-detector-2026.06',
    },
  });
  createAlert.mockResolvedValue(alertRow);

  const deps: CrisisConsumerDependencies = {
    clinicalDoc: { get: clinicalDocGet },
    detector: { post: detectorPost },
    createAlert,
    logger,
    serviceJwt: 'service-token',
  };

  return { deps, clinicalDocGet, detectorPost, createAlert, logger };
}

describe('handleCrisisEvent', () => {
  it('creates a clinical-note alert for high-risk crisis detector output', async () => {
    const { deps, clinicalDocGet, detectorPost, createAlert, logger } = makeDeps();

    await handleCrisisEvent(noteEvent(), deps);

    expect(clinicalDocGet).toHaveBeenCalledWith('/clinical-doc/doc-1', {
      headers: { authorization: 'Bearer service-token' },
    });
    expect(detectorPost).toHaveBeenCalledWith('/v1/detect', {
      text: 'Patient reports an immediate self-harm plan.',
      context: 'clinical_note',
      patient_id: 'patient-1',
    });
    expect(createAlert).toHaveBeenCalledWith({
      patientId: 'patient-1',
      stateCode: 'SC',
      source: 'clinical_note',
      severity: 'critical',
      signals: [{ type: 'self_harm_intent' }],
      detectorEngineVersion: 'crisis-detector-2026.06',
      correlationId: 'corr-1',
    });
    expect(logger.info).toHaveBeenCalledWith('crisis alert raised from clinical note', {
      docId: 'doc-1',
      severity: 'critical',
    });
  });

  it('does not create an alert for lower-severity detector output', async () => {
    const { deps, detectorPost, createAlert, logger } = makeDeps();
    detectorPost.mockResolvedValue({
      data: {
        is_crisis: true,
        severity: 'moderate',
        signals: [{ type: 'stress_language' }],
        engine_version: 'crisis-detector-2026.06',
      },
    });

    await handleCrisisEvent(noteEvent(), deps);

    expect(createAlert).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('skips crisis detection when clinical note text cannot be fetched', async () => {
    const { deps, clinicalDocGet, detectorPost, createAlert, logger } = makeDeps();
    clinicalDocGet.mockRejectedValue(new Error('unauthorized'));

    await handleCrisisEvent(noteEvent(), deps);

    expect(detectorPost).not.toHaveBeenCalled();
    expect(createAlert).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith('cannot fetch clinical doc text for crisis scan', {
      docId: 'doc-1',
    });
  });

  it('records hub-raised crisis alerts without calling the detector', async () => {
    const { deps, clinicalDocGet, detectorPost, createAlert } = makeDeps();
    const event: DomainEvent<{ stateCode: string; fromNumber: string; ticketId: string }> = {
      eventId: 'event-2',
      eventType: 'crisis.alert.raised',
      eventVersion: 1,
      occurredAt: '2026-06-21T10:01:00Z',
      producer: 'hub-service',
      correlationId: 'corr-hub',
      payload: {
        stateCode: 'NC',
        fromNumber: '+15555550100',
        ticketId: 'ticket-1',
      },
    };

    await handleCrisisEvent(event, deps);

    expect(clinicalDocGet).not.toHaveBeenCalled();
    expect(detectorPost).not.toHaveBeenCalled();
    expect(createAlert).toHaveBeenCalledWith({
      stateCode: 'NC',
      source: 'hub_chat',
      severity: 'high',
      signals: { hub_ticket_id: 'ticket-1', from_number: '+15555550100' },
      correlationId: 'corr-hub',
    });
  });
});
