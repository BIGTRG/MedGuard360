import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  requireAuth, requireRole, auditLog, emitEvent, ValidationError,
} from '@medguard360/shared';
import * as repo from './repository';

export const CreateSchema = z.object({
  userId: z.string().uuid().optional(),
  npi: z.string().regex(/^\d{10}$/),
  ein: z.string().max(20).optional(),
  type: z.enum(['individual','facility','group','pharmacy','dmepos','nemt']),
  legalName: z.string().min(1).max(200),
  doingBusinessAs: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  primaryTaxonomyCode: z.string().max(10).optional(),
  stateCode: z.string().length(2).optional(),
  orgId: z.string().uuid().optional(),
});

const SearchSchema = z.object({
  type: z.enum(['individual','facility','group','pharmacy','dmepos','nemt']).optional(),
  stateCode: z.string().length(2).optional(),
  enrolledIn: z.string().length(2).optional(),
  taxonomy: z.string().optional(),
  legalName: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const SpecialtySchema = z.object({
  taxonomyCode: z.string().min(1).max(10),
  description: z.string().min(1).max(200),
  isPrimary: z.boolean().optional(),
});

const LocationSchema = z.object({
  label: z.string().min(1).max(100),
  addressLine1: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  stateCode: z.string().length(2),
  postalCode: z.string().min(5).max(10),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isPrimary: z.boolean().optional(),
});

const StatusSchema = z.object({ status: z.enum(['active','suspended','terminated']) });

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new ValidationError('Invalid input', r.error.flatten());
  return r.data;
}
const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => { fn(req, res, next).catch(next); };

export const router = Router();

router.post('/providers',
  requireAuth, requireRole('credentialing_specialist','platform_administrator'),
  ah(async (req, res) => {
    const input = parse(CreateSchema, req.body);
    const provider = await repo.createProvider(req.auth!, input);
    await emitEvent('provider.created', { providerId: provider.id, npi: provider.npi, type: provider.type, stateCode: provider.state_code },
      { actorUserId: req.auth!.sub, correlationId: req.correlationId });
    await auditLog({
      resource: 'provider', resourceId: provider.id, action: 'create',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
    });
    res.status(201).json(provider);
  }),
);

router.get('/providers', requireAuth, ah(async (req, res) => {
  const input = parse(SearchSchema, req.query);
  const rows = await repo.searchProviders(req.auth!, input);
  res.json({ count: rows.length, providers: rows });
}));

router.get('/providers/:id', requireAuth, ah(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const provider = await repo.getProvider(req.auth!, id);
  await auditLog({
    resource: 'provider', resourceId: id, action: 'read',
    actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
  });
  res.json(provider);
}));

router.get('/providers/by-npi/:npi', requireAuth, ah(async (req, res) => {
  const npi = z.string().regex(/^\d{10}$/).parse(req.params.npi);
  const provider = await repo.getProviderByNpi(req.auth!, npi);
  res.json(provider);
}));

router.post('/providers/:id/specialties',
  requireAuth, requireRole('credentialing_specialist','platform_administrator','individual_provider','facility_provider'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = parse(SpecialtySchema, req.body);
    const sp = await repo.addSpecialty(req.auth!, id, input.taxonomyCode, input.description, input.isPrimary ?? false);
    await auditLog({
      resource: 'provider', resourceId: id, action: 'update',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { added_specialty: input.taxonomyCode },
    });
    res.status(201).json(sp);
  }),
);

router.post('/providers/:id/locations',
  requireAuth, requireRole('credentialing_specialist','platform_administrator','individual_provider','facility_provider'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const input = parse(LocationSchema, req.body);
    const loc = await repo.addLocation(req.auth!, id, {
      label: input.label, address_line1: input.addressLine1, city: input.city,
      state_code: input.stateCode, postal_code: input.postalCode,
      latitude: input.latitude, longitude: input.longitude,
      is_primary: input.isPrimary ?? false, active: true,
    });
    res.status(201).json(loc);
  }),
);

router.post('/providers/:id/status',
  requireAuth, requireRole('credentialing_specialist','platform_administrator','compliance_officer'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const { status } = parse(StatusSchema, req.body);
    const updated = await repo.setStatus(req.auth!, id, status);
    await emitEvent('provider.status.changed', { providerId: id, status, changedBy: req.auth!.sub },
      { actorUserId: req.auth!.sub, correlationId: req.correlationId });
    await auditLog({
      resource: 'provider', resourceId: id, action: 'update',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { status_change: status },
    });
    res.json(updated);
  }),
);

// ─── MA Provider Directory compliance (CMS CY2026 final rule) ─────────────
import * as maDir from './maDirectory';

// GET /providers/directory/export?stateCode=NC[&format=json|cms-json]
router.get('/providers/directory/export',
  requireAuth, requireRole('mco_admin','state_medicaid_agency','federal_cms','platform_administrator','compliance_officer'),
  ah(async (req, res) => {
    const q = z.object({
      stateCode: z.string().length(2).toUpperCase(),
      format: z.enum(['json','cms-json']).default('json'),
    }).parse(req.query);
    const entries = await maDir.exportCmsDirectory(q.stateCode);
    if (q.format === 'cms-json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="ma-directory-${q.stateCode}-${new Date().toISOString().slice(0,10)}.json"`);
    }
    res.json({ generatedAt: new Date().toISOString(), stateCode: q.stateCode, count: entries.length, entries });
  }),
);

// POST /providers/directory/attest
router.post('/providers/directory/attest',
  requireAuth, requireRole('mco_admin','compliance_officer','platform_administrator'),
  ah(async (req, res) => {
    const body = z.object({
      mcoPayerId: z.string().min(1).max(50),
      stateCode: z.string().length(2).toUpperCase(),
      attestationYear: z.number().int().min(2026).max(2099),
      accuracyPct: z.number().min(0).max(100),
      totalProviders: z.number().int().min(0),
      providersVerified: z.number().int().min(0),
      providersUnableToVerify: z.number().int().min(0),
      notes: z.string().max(2000).optional(),
    }).parse(req.body);
    await maDir.recordAttestation({ ...body, attestedByUserId: req.auth!.sub });
    res.status(201).json({ message: 'Attestation recorded.' });
  }),
);

