import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  requireAuth, requireRole, requireBiometric,
  auditLog, emitEvent, ValidationError,
} from '@medguard360/shared';
import * as repo from './repository';

export const CreatePlanSchema = z.object({
  patientId: z.string().uuid(),
  stateCode: z.string().length(2),
  createdByProviderId: z.string().uuid(),
  warningSigns: z.array(z.string()).optional(),
  internalCopingStrategies: z.array(z.string()).optional(),
  socialSupports: z.array(z.unknown()).optional(),
  professionalSupports: z.array(z.unknown()).optional(),
  emergencyContacts: z.array(z.unknown()).optional(),
  safeEnvironmentSteps: z.array(z.string()).optional(),
  reasonsForLiving: z.string().max(5000).optional(),
});

export const ResolveSchema = z.object({
  status: z.enum(['resolved','false_alarm']),
  notes: z.string().max(5000).optional(),
});

const DispatchSchema = z.object({
  responderUserId: z.string().uuid(),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new ValidationError('Invalid input', r.error.flatten());
  return r.data;
}
const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => { fn(req, res, next).catch(next); };

export const router = Router();

// Crisis plan CRUD
router.post('/crisis/plans',
  requireAuth, requireRole('individual_provider','facility_provider','platform_administrator'),
  ah(async (req, res) => {
    const input = parse(CreatePlanSchema, req.body);
    const plan = await repo.createPlan(req.auth!, input);
    await emitEvent('crisis.plan.created',
      { planId: plan.id, patientId: plan.patient_id, stateCode: plan.state_code },
      { actorUserId: req.auth!.sub, correlationId: req.correlationId });
    await auditLog({
      resource: 'crisis_plan', resourceId: plan.id, action: 'create',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
    });
    res.status(201).json(plan);
  }),
);

router.get('/crisis/plans/patient/:patientId', requireAuth, ah(async (req, res) => {
  const patientId = z.string().uuid().parse(req.params.patientId);
  const plan = await repo.getActivePlanForPatient(req.auth!, patientId);
  await auditLog({
    resource: 'crisis_plan', resourceId: plan?.id ?? patientId, action: 'read',
    actor: req.auth!, outcome: plan ? 'success' : 'denied', correlationId: req.correlationId,
  });
  if (!plan) { res.status(404).json({ error: 'no active plan' }); return; }
  res.json(plan);
}));

// Emergency responder biometric-gated access — the 3-second flow per CLAUDE.md
router.get('/crisis/responder/patient/:patientId',
  requireAuth,
  requireRole('emergency_responder'),
  requireBiometric,
  ah(async (req, res) => {
    const patientId = z.string().uuid().parse(req.params.patientId);
    const plan = await repo.getActivePlanForPatient(req.auth!, patientId);
    await auditLog({
      resource: 'crisis_plan', resourceId: plan?.id ?? patientId, action: 'read',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { responder_access: true },
    });
    if (!plan) { res.status(404).json({ error: 'no active plan' }); return; }
    res.json(plan);
  }),
);

// Active alerts queue
router.get('/crisis/alerts',
  requireAuth,
  requireRole('state_medicaid_agency','mco_admin','compliance_officer','emergency_responder','platform_administrator','individual_provider','facility_provider'),
  ah(async (req, res) => {
    const rows = await repo.listActiveAlerts(req.auth!);
    res.json({ count: rows.length, alerts: rows });
  }),
);

router.post('/crisis/alerts/:id/dispatch',
  requireAuth, requireRole('platform_administrator','emergency_responder','state_medicaid_agency'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = parse(DispatchSchema, req.body);
    await repo.recordDispatch(req.auth!, id, input.responderUserId, req.auth!.biometricVerified);
    await emitEvent('crisis.responder.dispatched',
      { alertId: id, responderUserId: input.responderUserId },
      { actorUserId: req.auth!.sub, correlationId: req.correlationId });
    await auditLog({
      resource: 'crisis_alert', resourceId: id, action: 'update',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { action: 'dispatch_responder' },
    });
    res.status(204).send();
  }),
);

router.post('/crisis/alerts/:id/resolve',
  requireAuth, requireRole('platform_administrator','emergency_responder','state_medicaid_agency','compliance_officer'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = parse(ResolveSchema, req.body);
    const a = await repo.setAlertStatus(req.auth!, id, input.status, input.notes);
    await auditLog({
      resource: 'crisis_alert', resourceId: id, action: 'update',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { resolution: input.status },
    });
    res.json(a);
  }),
);
