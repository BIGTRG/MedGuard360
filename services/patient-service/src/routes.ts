/**
 * patient-service routes — /api/v1
 *
 * Every PHI access is audit-logged. Crisis plan export requires biometric auth.
 * Kafka events emitted for all mutations (patient.created, patient.updated).
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  requireAuth,
  requireRole,
  requireBiometric,
  auditLog,
  emitEvent,
  ValidationError,
  NotFoundError,
} from '@medguard360/shared';
import * as repo from './repository';

// ── Zod schemas ───────────────────────────────────────────────────────────────

const CreatePatientSchema = z.object({
  medicaid_id:    z.string().min(1).max(50),
  medicare_id:    z.string().max(50).nullable().optional(),
  first_name:     z.string().min(1).max(100),
  last_name:      z.string().min(1).max(100),
  dob:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dob must be YYYY-MM-DD'),
  state_code:     z.string().length(2),
  payer_id:       z.string().max(50).nullable().optional(),
  mco_id:         z.string().uuid().nullable().optional(),
  biometric_hash: z.string().max(256).nullable().optional(),
  is_active:      z.boolean().optional().default(true),
});

const UpdatePatientSchema = z.object({
  first_name:     z.string().min(1).max(100).optional(),
  last_name:      z.string().min(1).max(100).optional(),
  dob:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  state_code:     z.string().length(2).optional(),
  payer_id:       z.string().max(50).nullable().optional(),
  mco_id:         z.string().uuid().nullable().optional(),
  biometric_hash: z.string().max(256).nullable().optional(),
  is_active:      z.boolean().optional(),
});

const SearchSchema = z.object({
  stateCode:  z.string().length(2).optional(),
  payerId:    z.string().max(50).optional(),
  medicaidId: z.string().max(50).optional(),
});

const CrisisPlanSchema = z.object({
  triggers:                z.array(z.string()).optional(),
  deescalation_strategies: z.array(z.string()).optional(),
  emergency_contacts:      z.array(z.unknown()).optional(),
  preferred_hospital:      z.string().max(200).nullable().optional(),
  medications:             z.array(z.unknown()).optional(),
  allergies:               z.array(z.string()).optional(),
  dnr_status:              z.boolean().optional(),
});

const AssignProviderSchema = z.object({
  providerUserId: z.string().uuid(),
  stateCode:      z.string().length(2),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError('Invalid input', result.error.flatten());
  return result.data;
}

const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };

// ── Router ────────────────────────────────────────────────────────────────────

export const router = Router();

// ── GET /patients/:id ─────────────────────────────────────────────────────────
router.get(
  '/patients/:id',
  requireAuth,
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params['id']);
    const patient = await repo.findPatient(id, req.auth!);
    if (!patient) throw new NotFoundError('Patient');

    await auditLog({
      resource:      'patient',
      resourceId:    id,
      action:        'read',
      actor:         req.auth!,
      outcome:       'success',
      phiAccessed:   true,
      correlationId: req.correlationId,
    });

    res.json(patient);
  }),
);

// ── GET /patients ─────────────────────────────────────────────────────────────
router.get(
  '/patients',
  requireAuth,
  requireRole(
    'individual_provider', 'facility_provider', 'billing_manager',
    'state_medicaid_agency', 'compliance_officer', 'fraud_investigator',
    'platform_administrator',
  ),
  ah(async (req, res) => {
    const filters = parse(SearchSchema, req.query);
    const patients = await repo.searchPatients(filters, req.auth!);

    await auditLog({
      resource:      'patient',
      resourceId:    'search',
      action:        'search',
      actor:         req.auth!,
      outcome:       'success',
      phiAccessed:   true,
      correlationId: req.correlationId,
      context:       { filters, count: patients.length },
    });

    res.json({ count: patients.length, patients });
  }),
);

// ── POST /patients ────────────────────────────────────────────────────────────
router.post(
  '/patients',
  requireAuth,
  requireRole('individual_provider', 'facility_provider', 'billing_manager', 'state_medicaid_agency'),
  ah(async (req, res) => {
    const body = parse(CreatePatientSchema, req.body);

    const patient = await repo.createPatient({
      medicaid_id:    body.medicaid_id,
      medicare_id:    body.medicare_id ?? null,
      first_name:     body.first_name,
      last_name:      body.last_name,
      dob:            new Date(body.dob),
      state_code:     body.state_code.toUpperCase(),
      payer_id:       body.payer_id ?? null,
      mco_id:         body.mco_id ?? null,
      biometric_hash: body.biometric_hash ?? null,
      is_active:      body.is_active,
      created_by:     req.auth!.sub,
    });

    await Promise.all([
      emitEvent('patient.created', {
        patientId:  patient.id,
        stateCode:  patient.state_code,
        medicaidId: patient.medicaid_id,
        createdBy:  req.auth!.sub,
      }, { actorUserId: req.auth!.sub, correlationId: req.correlationId }),

      auditLog({
        resource:      'patient',
        resourceId:    patient.id,
        action:        'create',
        actor:         req.auth!,
        outcome:       'success',
        phiAccessed:   true,
        correlationId: req.correlationId,
      }),
    ]);

    res.status(201).json(patient);
  }),
);

// ── PUT /patients/:id ─────────────────────────────────────────────────────────
router.put(
  '/patients/:id',
  requireAuth,
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params['id']);
    const body = parse(UpdatePatientSchema, req.body);

    // Convert dob string to Date if provided.
    const updateData = {
      ...body,
      ...(body.dob ? { dob: new Date(body.dob) } : {}),
    };

    const patient = await repo.updatePatient(id, updateData, req.auth!);

    await Promise.all([
      emitEvent('patient.updated', {
        patientId: id,
        fields:    Object.keys(body),
        updatedBy: req.auth!.sub,
      }, { actorUserId: req.auth!.sub, correlationId: req.correlationId }),

      auditLog({
        resource:      'patient',
        resourceId:    id,
        action:        'update',
        actor:         req.auth!,
        outcome:       'success',
        phiAccessed:   true,
        correlationId: req.correlationId,
        context:       { fields: Object.keys(body) },
      }),
    ]);

    res.json(patient);
  }),
);

// ── GET /patients/:id/crisis-plan ─────────────────────────────────────────────
router.get(
  '/patients/:id/crisis-plan',
  requireAuth,
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params['id']);

    // emergency_responder role requires biometric verification before accessing crisis plan.
    if (req.auth!.role === 'emergency_responder') {
      await requireBiometric(req, res, async () => {
        /* biometric middleware calls next() if passed */
      });
    }

    const plan = await repo.getCrisisPlan(id, req.auth!);
    if (!plan) throw new NotFoundError('Crisis plan');

    await auditLog({
      resource:      'crisis_plan',
      resourceId:    id,
      action:        'read',
      actor:         req.auth!,
      outcome:       'success',
      phiAccessed:   true,
      correlationId: req.correlationId,
    });

    res.json(plan);
  }),
);

// ── PUT /patients/:id/crisis-plan ─────────────────────────────────────────────
router.put(
  '/patients/:id/crisis-plan',
  requireAuth,
  requireRole('individual_provider', 'facility_provider', 'prior_auth_specialist'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params['id']);
    const body = parse(CrisisPlanSchema, req.body);

    const plan = await repo.upsertCrisisPlan(id, body, req.auth!);

    await auditLog({
      resource:      'crisis_plan',
      resourceId:    id,
      action:        'upsert',
      actor:         req.auth!,
      outcome:       'success',
      phiAccessed:   true,
      correlationId: req.correlationId,
    });

    res.json(plan);
  }),
);

// ── POST /patients/:id/assign-provider ────────────────────────────────────────
router.post(
  '/patients/:id/assign-provider',
  requireAuth,
  requireRole('billing_manager', 'state_medicaid_agency', 'platform_administrator'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params['id']);
    const body = parse(AssignProviderSchema, req.body);

    await repo.assignProvider(id, body.providerUserId, body.stateCode.toUpperCase());

    await auditLog({
      resource:      'patient',
      resourceId:    id,
      action:        'assign_provider',
      actor:         req.auth!,
      outcome:       'success',
      phiAccessed:   false,
      correlationId: req.correlationId,
      context:       { providerUserId: body.providerUserId, stateCode: body.stateCode },
    });

    res.json({ success: true });
  }),
);

// ── GET /patients/:id/export ──────────────────────────────────────────────────
router.get(
  '/patients/:id/export',
  requireAuth,
  requireBiometric,
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params['id']);

    const [patient, crisisPlan] = await Promise.all([
      repo.findPatient(id, req.auth!),
      repo.getCrisisPlan(id, req.auth!),
    ]);

    if (!patient) throw new NotFoundError('Patient');

    await auditLog({
      resource:      'patient',
      resourceId:    id,
      action:        'export',
      actor:         req.auth!,
      outcome:       'success',
      phiAccessed:   true,
      correlationId: req.correlationId,
      context:       { format: 'json', includesCrisisPlan: crisisPlan !== null },
    });

    res.setHeader('Content-Disposition', `attachment; filename="patient-export-${id}.json"`);
    res.json({ patient, crisisPlan });
  }),
);
