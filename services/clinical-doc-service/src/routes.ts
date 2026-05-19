import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, auditLog, emitEvent } from '@medguard360/shared';
import { v4 as uuid } from 'uuid';
import * as repo from './repository';
import { processAudio } from './audioProcessor';

export const router = Router();

const CreateEncounterSchema = z.object({
  patientId: z.string().uuid(),
  stateCode: z.string().length(2),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
});

router.post('/', requireAuth, requireRole('individual_provider', 'facility_provider'), async (req, res, next) => {
  try {
    const body = CreateEncounterSchema.parse(req.body);
    const encounter = await repo.createEncounter({
      provider_user_id: req.auth!.sub,
      patient_id: body.patientId,
      state_code: body.stateCode,
      service_date: new Date(body.serviceDate),
      location_lat: body.locationLat ?? null,
      location_lng: body.locationLng ?? null,
      created_by: req.auth!.sub,
    });
    res.status(201).json({ encounter });
  } catch (err) { next(err); }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { patientId, status, stateCode } = req.query as Record<string, string>;
    const auth = req.auth!;
    const providerId = ['individual_provider', 'facility_provider'].includes(auth.role) ? auth.sub : undefined;
    const encounters = await repo.listEncounters({
      providerId: providerId ?? (req.query.providerId as string | undefined),
      patientId, status, stateCode,
    });
    res.json({ encounters });
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const encounter = await repo.findEncounter(req.params.id);
    if (!encounter) { res.status(404).json({ error: 'Not found' }); return; }
    const documents = await repo.getDocuments(req.params.id);
    await auditLog({ userId: req.auth!.sub, action: 'read', resourceType: 'clinical_encounter', resourceId: req.params.id, stateCode: encounter.state_code, phiAccessed: true });
    res.json({ encounter, documents });
  } catch (err) { next(err); }
});

router.post('/:id/upload-audio', requireAuth, requireRole('individual_provider', 'facility_provider'), async (req, res, next) => {
  try {
    const { audioFilePath } = z.object({ audioFilePath: z.string() }).parse(req.body);
    await repo.updateEncounter(req.params.id, { audio_file_path: audioFilePath });
    const result = await processAudio(req.params.id, audioFilePath);
    await emitEvent('clinical.encounter.transcribed', {
      eventId: uuid(),
      eventType: 'clinical.encounter.transcribed',
      aggregateId: req.params.id,
      aggregateType: 'clinical_encounter',
      payload: { encounterId: req.params.id, transcript: result.transcript },
      metadata: { userId: req.auth!.sub, timestamp: new Date().toISOString() },
    });
    res.json({ result });
  } catch (err) { next(err); }
});

router.put('/:id/note', requireAuth, async (req, res, next) => {
  try {
    const { noteText } = z.object({ noteText: z.string() }).parse(req.body);
    const encounter = await repo.updateEncounter(req.params.id, { note_text: noteText });
    res.json({ encounter });
  } catch (err) { next(err); }
});

router.post('/:id/sign', requireAuth, requireRole('individual_provider', 'facility_provider'), async (req, res, next) => {
  try {
    const encounter = await repo.updateEncounter(req.params.id, {
      status: 'signed',
      signed_by: req.auth!.sub,
      signed_at: new Date(),
    });
    await emitEvent('clinical.encounter.signed', {
      eventId: uuid(),
      eventType: 'clinical.encounter.signed',
      aggregateId: req.params.id,
      aggregateType: 'clinical_encounter',
      payload: { encounterId: req.params.id, signedBy: req.auth!.sub },
      metadata: { userId: req.auth!.sub, timestamp: new Date().toISOString() },
    });
    res.json({ encounter });
  } catch (err) { next(err); }
});
