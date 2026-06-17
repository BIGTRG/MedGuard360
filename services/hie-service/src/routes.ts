/**
 * hie-service route handlers.
 *
 * Implements FHIR R4 HIE integration per CMS Interoperability Final Rule:
 *
 *   GET  /api/v1/hie/patients/:patientId/fhir       — export patient as FHIR R4 Patient
 *   POST /api/v1/hie/patients/:patientId/import     — import external FHIR Bundle
 *   POST /api/v1/hie/referrals                      — create referral + FHIR ServiceRequest
 *   GET  /api/v1/hie/referrals                      — list referrals
 *   GET  /api/v1/hie/referrals/:id                  — get referral
 *   PUT  /api/v1/hie/referrals/:id/status           — update referral status
 */

import { randomUUID } from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  requireAuth,
  requireRole,
  auditLog,
  emitEvent,
  ValidationError,
  NotFoundError,
} from '@medguard360/shared';
import { buildFhirPatient, buildFhirServiceRequest, parseFhirBundle } from './fhir';
import * as repo from './repository';
import type { ReferralPriority, ReferralStatus } from './types';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const UuidParam = z.string().uuid();

const ReferralCreateSchema = z.object({
  fromProviderId: z.string().uuid(),
  toProviderId: z.string().uuid().optional(),
  patientId: z.string().uuid(),
  stateCode: z.string().length(2),
  reason: z.string().min(1).max(2000),
  priority: z.enum(['stat', 'urgent', 'routine', 'elective']).default('routine'),
  notes: z.string().max(5000).optional(),
  // Optional provider NPI for FHIR ServiceRequest requester identifier
  fromProviderNpi: z.string().optional(),
});

const ReferralStatusUpdateSchema = z.object({
  status: z.enum(['pending', 'accepted', 'completed', 'declined', 'cancelled']),
  notes: z.string().max(5000).optional(),
});

const ReferralListFiltersSchema = z.object({
  fromProviderId: z.string().uuid().optional(),
  toProviderId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  status: z.enum(['pending', 'accepted', 'completed', 'declined', 'cancelled']).optional(),
});

const ConsentCreateSchema = z.object({
  patientId: z.string().uuid(),
  scope: z.string().min(1).max(100),
  grantedToOrg: z.string().min(1).max(500),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  fhirResourceId: z.string().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError('Invalid input', result.error.flatten());
  return result.data;
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;
const ah =
  (fn: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const router = Router();

// ---------------------------------------------------------------------------
// GET /api/v1/hie/patients/:patientId/fhir
// Export local patient record as a FHIR R4 Patient resource.
// ---------------------------------------------------------------------------

router.get(
  '/hie/patients/:patientId/fhir',
  requireAuth,
  ah(async (req, res) => {
    const patientId = parse(UuidParam, req.params.patientId);

    // Build FHIR Patient from query params / JWT claims (real impl queries patient-service)
    // Here we build from path param + auth context as the gateway layer
    const fhirPatient = buildFhirPatient({
      id: patientId,
      firstName: (req.query['firstName'] as string) ?? '',
      lastName: (req.query['lastName'] as string) ?? '',
      dob: (req.query['dob'] as string) ?? '',
      medicaidId: (req.query['medicaidId'] as string) ?? '',
      stateCode: req.auth!.stateCode ?? 'NC',
    });

    await auditLog({
      resource: 'patient',
      resourceId: patientId,
      action: 'read',
      actor: req.auth!,
      outcome: 'success',
      correlationId: req.correlationId,
    });

    res.json({
      resourceType: 'Bundle',
      type: 'searchset',
      total: 1,
      entry: [{ resource: fhirPatient }],
    });
  }),
);

// ---------------------------------------------------------------------------
// POST /api/v1/hie/patients/:patientId/import
// Import a FHIR R4 Bundle from an external HIE and save resources to DB.
// ---------------------------------------------------------------------------

router.post(
  '/hie/patients/:patientId/import',
  requireAuth,
  requireRole('hie_administrator', 'state_medicaid_agency'),
  ah(async (req, res) => {
    const patientId = parse(UuidParam, req.params.patientId);

    const bundle = req.body as Record<string, unknown>;
    const parsed = parseFhirBundle(bundle);

    const saved = await Promise.all(
      parsed.map((entry) =>
        repo.saveFhirResource(req.auth!, {
          resource_type: entry.resourceType as any,
          fhir_id: `${entry.resourceType}/${entry.id}`,
          patient_id: patientId,
          state_code: req.auth!.stateCode ?? 'NC',
          resource_data: entry.data,
          source_system: (req.body?.meta as any)?.sourceSystem ?? null,
        }),
      ),
    );

    await auditLog({
      resource: 'fhir_resource',
      resourceId: patientId,
      action: 'create',
      actor: req.auth!,
      outcome: 'success',
      correlationId: req.correlationId,
      context: { importedCount: saved.length },
    });

    res.status(201).json({
      imported: saved.length,
      resources: saved.map((r) => ({ id: r.id, fhir_id: r.fhir_id, resource_type: r.resource_type })),
    });
  }),
);

// ---------------------------------------------------------------------------
// POST /api/v1/hie/referrals
// Create a referral and its backing FHIR ServiceRequest.
// ---------------------------------------------------------------------------

router.post(
  '/hie/referrals',
  requireAuth,
  requireRole('individual_provider', 'facility_provider', 'prior_auth_specialist'),
  ah(async (req, res) => {
    const input = parse(ReferralCreateSchema, req.body);

    // Pre-generate a referral UUID so the FHIR ServiceRequest can reference it
    const referralId = randomUUID();
    const fhirId = `ServiceRequest/${referralId}`;

    // Build FHIR ServiceRequest
    const fhirServiceRequest = buildFhirServiceRequest({
      referralId,
      patientId: input.patientId,
      reason: input.reason,
      priority: input.priority as ReferralPriority,
      requesterId: input.fromProviderId,
      requesterNpi: input.fromProviderNpi,
      toProviderId: input.toProviderId,
      notes: input.notes,
    });

    // Create referral in DB using the pre-generated UUID
    const referral = await repo.createReferral(req.auth!, {
      id: referralId,
      from_provider_id: input.fromProviderId,
      to_provider_id: input.toProviderId ?? null,
      patient_id: input.patientId,
      state_code: input.stateCode,
      reason: input.reason,
      priority: input.priority as ReferralPriority,
      fhir_service_request_id: fhirId,
      notes: input.notes ?? null,
      created_by: req.auth!.sub,
    });

    // Persist FHIR ServiceRequest to fhir_resources table
    await repo.saveFhirResource(req.auth!, {
      resource_type: 'ServiceRequest',
      fhir_id: fhirId,
      patient_id: input.patientId,
      state_code: input.stateCode,
      resource_data: fhirServiceRequest,
    });

    // Emit Kafka event
    await emitEvent(
      'hie.referral.created',
      {
        referralId: referral.id,
        fromProviderId: referral.from_provider_id,
        toProviderId: referral.to_provider_id,
        patientId: referral.patient_id,
        stateCode: referral.state_code,
        priority: referral.priority,
        fhirServiceRequestId: fhirId,
      },
      { actorUserId: req.auth!.sub, correlationId: req.correlationId },
    );

    await auditLog({
      resource: 'referral',
      resourceId: referral.id,
      action: 'create',
      actor: req.auth!,
      outcome: 'success',
      correlationId: req.correlationId,
    });

    res.status(201).json({ referral, fhirServiceRequest });
  }),
);

// ---------------------------------------------------------------------------
// GET /api/v1/hie/referrals
// List referrals with optional query filters.
// ---------------------------------------------------------------------------

router.get(
  '/hie/referrals',
  requireAuth,
  ah(async (req, res) => {
    const filters = parse(ReferralListFiltersSchema, req.query);
    const result = await repo.listReferrals(req.auth!, {
      fromProviderId: filters.fromProviderId,
      toProviderId: filters.toProviderId,
      patientId: filters.patientId,
      status: filters.status as ReferralStatus | undefined,
    });

    res.json({ count: result.count, referrals: result.items });
  }),
);

// ---------------------------------------------------------------------------
// GET /api/v1/hie/referrals/:id
// Get a single referral by UUID.
// ---------------------------------------------------------------------------

router.get(
  '/hie/referrals/:id',
  requireAuth,
  ah(async (req, res) => {
    const id = parse(UuidParam, req.params.id);
    const referral = await repo.findReferral(req.auth!, id);

    await auditLog({
      resource: 'referral',
      resourceId: id,
      action: 'read',
      actor: req.auth!,
      outcome: 'success',
      correlationId: req.correlationId,
    });

    res.json(referral);
  }),
);

// ---------------------------------------------------------------------------
// PUT /api/v1/hie/referrals/:id/status
// Update referral status and optionally notes.
// ---------------------------------------------------------------------------

router.put(
  '/hie/referrals/:id/status',
  requireAuth,
  ah(async (req, res) => {
    const id = parse(UuidParam, req.params.id);
    const input = parse(ReferralStatusUpdateSchema, req.body);

    const updated = await repo.updateReferral(req.auth!, id, {
      status: input.status as ReferralStatus,
      notes: input.notes,
    });

    await emitEvent(
      'hie.referral.updated',
      {
        referralId: updated.id,
        status: updated.status,
        patientId: updated.patient_id,
        stateCode: updated.state_code,
      },
      { actorUserId: req.auth!.sub, correlationId: req.correlationId },
    );

    await auditLog({
      resource: 'referral',
      resourceId: id,
      action: 'update',
      actor: req.auth!,
      outcome: 'success',
      correlationId: req.correlationId,
      context: { newStatus: input.status },
    });

    res.json(updated);
  }),
);

// ---------------------------------------------------------------------------
// GET /api/v1/hie/patients/:patientId/consents
// List active consents for a patient (42 CFR Part 2 scopes).
// ---------------------------------------------------------------------------

router.get(
  '/hie/patients/:patientId/consents',
  requireAuth,
  requireRole('hie_administrator', 'compliance_officer', 'platform_administrator', 'individual_provider', 'facility_provider'),
  ah(async (req, res) => {
    const patientId = parse(UuidParam, req.params.patientId);
    const activeOnly = req.query['includeRevoked'] !== 'true';
    const consents = await repo.listConsents(req.auth!, patientId, activeOnly);

    await auditLog({
      resource: 'consent',
      resourceId: patientId,
      action: 'read',
      actor: req.auth!,
      outcome: 'success',
      correlationId: req.correlationId,
      context: { count: consents.length },
    });

    res.json({ count: consents.length, consents });
  }),
);

// ---------------------------------------------------------------------------
// POST /api/v1/hie/consents
// Record a FHIR Consent grant for outbound HIE sharing.
// ---------------------------------------------------------------------------

router.post(
  '/hie/consents',
  requireAuth,
  requireRole('hie_administrator', 'individual_provider', 'facility_provider', 'platform_administrator'),
  ah(async (req, res) => {
    const input = parse(ConsentCreateSchema, req.body);
    const consent = await repo.createConsent(req.auth!, {
      patient_id: input.patientId,
      scope: input.scope,
      granted_to_org: input.grantedToOrg,
      effective_from: input.effectiveFrom,
      effective_to: input.effectiveTo ?? null,
      fhir_resource_id: input.fhirResourceId ?? null,
    });

    await emitEvent(
      'hie.consent.granted',
      {
        consentId: consent.id,
        patientId: consent.patient_id,
        scope: consent.scope,
        grantedToOrg: consent.granted_to_org,
      },
      { actorUserId: req.auth!.sub, correlationId: req.correlationId },
    );

    await auditLog({
      resource: 'consent',
      resourceId: consent.id,
      action: 'create',
      actor: req.auth!,
      outcome: 'success',
      correlationId: req.correlationId,
    });

    res.status(201).json(consent);
  }),
);

// ---------------------------------------------------------------------------
// POST /api/v1/hie/consents/:id/revoke
// Patient or HIE admin revokes an active consent.
// ---------------------------------------------------------------------------

router.post(
  '/hie/consents/:id/revoke',
  requireAuth,
  requireRole('hie_administrator', 'patient', 'platform_administrator'),
  ah(async (req, res) => {
    const id = parse(UuidParam, req.params.id);
    const revoked = await repo.revokeConsent(req.auth!, id);

    await emitEvent(
      'hie.consent.revoked',
      {
        consentId: revoked.id,
        patientId: revoked.patient_id,
        scope: revoked.scope,
      },
      { actorUserId: req.auth!.sub, correlationId: req.correlationId },
    );

    await auditLog({
      resource: 'consent',
      resourceId: id,
      action: 'update',
      actor: req.auth!,
      outcome: 'success',
      correlationId: req.correlationId,
      context: { status: 'revoked' },
    });

    res.json(revoked);
  }),
);
