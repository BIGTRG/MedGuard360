import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, auditLog, emitEvent } from '@medguard360/shared';
import { v4 as uuid } from 'uuid';
import * as repo from './repository';
import { processAudio } from './audioProcessor';
import * as ehr from './ehr';
import * as cds from './cds';

export const router = Router();

const enc = '/clinical-doc/encounters';

const CreateEncounterSchema = z.object({
  patientId: z.string().uuid(),
  stateCode: z.string().length(2),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
});

router.post(enc, requireAuth, requireRole('individual_provider', 'facility_provider'), async (req, res, next) => {
  try {
    const body = CreateEncounterSchema.parse(req.body);
    const encounter = await repo.createEncounter({
      provider_id: req.auth!.sub,
      patient_id: body.patientId,
      state_code: body.stateCode,
      service_date: new Date(body.serviceDate),
      created_by: req.auth!.sub,
    });
    res.status(201).json({ encounter });
  } catch (err) { next(err); }
});

router.get(enc, requireAuth, async (req, res, next) => {
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

router.get(`${enc}/:id`, requireAuth, async (req, res, next) => {
  try {
    const encounter = await repo.findEncounter(req.params.id);
    if (!encounter) { res.status(404).json({ error: 'Not found' }); return; }
    const documents = await repo.getDocuments(req.params.id);
    await auditLog({
      resource: 'clinical_encounter', resourceId: req.params.id, action: 'read',
      actor: req.auth!, outcome: 'success', phiAccessed: true,
      correlationId: req.correlationId,
      context: { stateCode: encounter.state_code },
    });
    res.json({ encounter, documents });
  } catch (err) { next(err); }
});

router.post(`${enc}/:id/upload-audio`, requireAuth, requireRole('individual_provider', 'facility_provider'), async (req, res, next) => {
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

router.put(`${enc}/:id/note`, requireAuth, async (req, res, next) => {
  try {
    const encounterId = z.string().uuid().parse(req.params.id);
    const { noteText } = z.object({ noteText: z.string() }).parse(req.body);
    const document = await repo.addDocument(encounterId, 'note', undefined, noteText);
    const encounter = await repo.findEncounter(encounterId);
    if (!encounter) { res.status(404).json({ error: 'Not found' }); return; }
    await emitEvent('clinical.note.created', {
      encounterId,
      docId: document.id,
      charCount: noteText.length,
      patientId: encounter.patient_id,
      stateCode: encounter.state_code,
      extractedText: noteText,
    }, { actorUserId: req.auth!.sub, correlationId: req.correlationId });
    res.json({ encounter });
  } catch (err) { next(err); }
});

router.post(`${enc}/:id/sign`, requireAuth, requireRole('individual_provider', 'facility_provider'), async (req, res, next) => {
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

// ─── EHR Chart endpoints ──────────────────────────────────────────────────
// GET  /v1/clinical-doc/ehr/:patientId            — full chart snapshot
// POST /v1/clinical-doc/ehr/:patientId/problems   — add problem
// POST /v1/clinical-doc/ehr/:patientId/medications — add medication
// POST /v1/clinical-doc/ehr/:patientId/allergies  — add allergy
// POST /v1/clinical-doc/ehr/:patientId/vitals     — add vitals
// POST /v1/clinical-doc/ehr/:patientId/immunizations — add immunization
// POST /v1/clinical-doc/ehr/:patientId/cds-fire   — run CDS rules and return firings

router.get('/clinical-doc/ehr/:patientId', requireAuth, async (req, res, next) => {
  try {
    const patientId = z.string().uuid().parse(req.params.patientId);
    const chart = await ehr.getChart(patientId);
    await auditLog({
      resource: 'ehr_chart', resourceId: patientId, action: 'read',
      actor: req.auth!, outcome: 'success', phiAccessed: true,
      correlationId: req.correlationId,
    });
    res.json(chart);
  } catch (err) { next(err); }
});

router.post('/clinical-doc/ehr/:patientId/problems', requireAuth, requireRole('individual_provider','facility_provider','prior_auth_specialist'),
  async (req, res, next) => {
    try {
      const patientId = z.string().uuid().parse(req.params.patientId);
      const body = z.object({
        stateCode: z.string().length(2),
        icd10Code: z.string().regex(/^[A-Z]\d{2}(\.\w+)?$/),
        problemText: z.string().min(1).max(500),
        onsetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        severity: z.enum(['mild','moderate','severe','life_threatening']).optional(),
        notes: z.string().max(2000).optional(),
      }).parse(req.body);
      const row = await ehr.addProblem({ ...body, patientId, recordedBy: req.auth!.sub });
      res.status(201).json(row);
    } catch (err) { next(err); }
  });

router.post('/clinical-doc/ehr/:patientId/medications', requireAuth, requireRole('individual_provider','facility_provider','pharmacy'),
  async (req, res, next) => {
    try {
      const patientId = z.string().uuid().parse(req.params.patientId);
      const body = z.object({
        stateCode: z.string().length(2),
        ndcCode: z.string().regex(/^\d{4,5}-\d{3,4}-\d{1,2}$/).optional(),
        rxnormCode: z.string().optional(),
        drugName: z.string().min(1).max(200),
        dosage: z.string().optional(),
        frequency: z.string().optional(),
        route: z.string().optional(),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        reasonCode: z.string().optional(),
      }).parse(req.body);
      const row = await ehr.addMedication({ ...body, patientId, prescriberUserId: req.auth!.sub });
      res.status(201).json(row);
    } catch (err) { next(err); }
  });

router.post('/clinical-doc/ehr/:patientId/allergies', requireAuth, requireRole('individual_provider','facility_provider','pharmacy'),
  async (req, res, next) => {
    try {
      const patientId = z.string().uuid().parse(req.params.patientId);
      const body = z.object({
        stateCode: z.string().length(2),
        allergenText: z.string().min(1).max(200),
        allergenRxnorm: z.string().optional(),
        reactionText: z.string().max(500).optional(),
        reactionSeverity: z.enum(['mild','moderate','severe','life_threatening']).optional(),
        reactionType:     z.enum(['allergy','intolerance','side_effect','unknown']).optional(),
        onsetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }).parse(req.body);
      const row = await ehr.addAllergy({ ...body, patientId, recordedBy: req.auth!.sub });
      res.status(201).json(row);
    } catch (err) { next(err); }
  });

router.post('/clinical-doc/ehr/:patientId/vitals', requireAuth, requireRole('individual_provider','facility_provider'),
  async (req, res, next) => {
    try {
      const patientId = z.string().uuid().parse(req.params.patientId);
      const body = z.object({
        stateCode: z.string().length(2),
        encounterId: z.string().uuid().optional(),
        systolicBp: z.number().int().min(40).max(300).optional(),
        diastolicBp: z.number().int().min(20).max(200).optional(),
        heartRate: z.number().int().min(20).max(300).optional(),
        respiratoryRate: z.number().int().min(4).max(60).optional(),
        temperatureF: z.number().min(85).max(115).optional(),
        heightInches: z.number().min(10).max(96).optional(),
        weightLbs: z.number().min(1).max(1500).optional(),
        o2SaturationPct: z.number().int().min(0).max(100).optional(),
        painScale0_10: z.number().int().min(0).max(10).optional(),
      }).parse(req.body);
      const row = await ehr.addVitals({ ...body, patientId, recordedBy: req.auth!.sub });
      res.status(201).json(row);
    } catch (err) { next(err); }
  });

router.post('/clinical-doc/ehr/:patientId/immunizations', requireAuth, requireRole('individual_provider','facility_provider'),
  async (req, res, next) => {
    try {
      const patientId = z.string().uuid().parse(req.params.patientId);
      const body = z.object({
        stateCode: z.string().length(2),
        cvxCode: z.string().regex(/^\d{1,5}$/),
        vaccineName: z.string().min(1).max(200),
        administeredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        lotNumber: z.string().max(50).optional(),
        manufacturer: z.string().max(100).optional(),
        visVersion: z.string().max(20).optional(),
      }).parse(req.body);
      const row = await ehr.addImmunization({ ...body, patientId, administeredBy: req.auth!.sub });
      res.status(201).json(row);
    } catch (err) { next(err); }
  });

router.post('/clinical-doc/ehr/:patientId/cds-fire', requireAuth, async (req, res, next) => {
  try {
    const patientId = z.string().uuid().parse(req.params.patientId);
    const chart = await ehr.getChart(patientId);
    const rules = await cds.loadActiveRules();
    const firings = cds.evaluateRules(chart, rules);
    // Persist each firing so they appear in the audit / ack queue
    await Promise.all(firings.map(f =>
      cds.recordFiring({ ruleId: f.rule.id, patientId, context: { reason: f.reason } })));
    res.json({ firings: firings.map(f => ({
      ruleKey: f.rule.rule_key, category: f.rule.category, severity: f.rule.severity,
      ruleText: f.rule.rule_text, reason: f.reason, source: f.rule.source_citation,
    })) });
  } catch (err) { next(err); }
});
