import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  requireAuth, requireRole, requireBiometric,
  auditLog, emitEvent, ValidationError, logger,
} from '@medguard360/shared';
import * as repo from './repository';
import { buildNcpdpClaim, validateClaim } from './ncpdp';

const SubmitSchema = z.object({
  patientId: z.string().uuid(),
  prescribingProviderId: z.string().uuid(),
  pharmacyProviderId: z.string().uuid(),
  payerId: z.string().min(1),
  stateCode: z.string().length(2),
  ndc: z.string().regex(/^\d{11}$/),
  drugName: z.string().min(1).max(200),
  quantityDispensed: z.string().regex(/^\d+(\.\d{1,3})?$/),
  daysSupply: z.number().int().positive(),
  refillNumber: z.number().int().nonnegative().default(0),
  totalChargeCents: z.number().int().nonnegative(),
  priorAuthId: z.string().uuid().optional(),
  dateOfService: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  patientFirstName: z.string(),
  patientLastName: z.string(),
  patientDateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cardholderId: z.string(),
  bin: z.string().min(6).max(6),
  pcn: z.string(),
  prescriberNpi: z.string().regex(/^\d{10}$/),
  pharmacyNpi: z.string().regex(/^\d{10}$/),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new ValidationError('Invalid input', r.error.flatten());
  return r.data;
}
const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => { fn(req, res, next).catch(next); };

export const router = Router();

router.post('/pharmacy/claims',
  requireAuth, requireBiometric,
  requireRole('pharmacy','billing_manager','platform_administrator'),
  ah(async (req, res) => {
    const input = parse(SubmitSchema, req.body);

    // 1. Formulary + PA check
    const f = await repo.lookupFormulary(input.stateCode, input.payerId, input.ndc);
    if (f?.pa_required && !input.priorAuthId) {
      throw new ValidationError(`NDC ${input.ndc} requires prior authorization in ${input.stateCode}/${input.payerId}`);
    }

    // 2. NCPDP validation
    const ncpdpInput = {
      bin: input.bin, pcn: input.pcn,
      cardholderId: input.cardholderId,
      patientFirstName: input.patientFirstName,
      patientLastName: input.patientLastName,
      patientDateOfBirth: input.patientDateOfBirth.replace(/-/g, ''),
      prescriberNpi: input.prescriberNpi, pharmacyNpi: input.pharmacyNpi,
      ndc: input.ndc,
      quantityDispensed: input.quantityDispensed, daysSupply: input.daysSupply,
      refillNumber: input.refillNumber,
      dateOfService: input.dateOfService.replace(/-/g, ''),
      grossAmountDueCents: input.totalChargeCents,
    };
    const reject = validateClaim(ncpdpInput);
    if (reject) {
      throw new ValidationError(`NCPDP validation failed: ${reject.message}`, reject);
    }

    const payload = buildNcpdpClaim(ncpdpInput);
    const ccn = await repo.nextCcn();

    const row = await repo.createClaim(req.auth!, {
      ccn,
      patientId: input.patientId,
      prescribingProviderId: input.prescribingProviderId,
      pharmacyProviderId: input.pharmacyProviderId,
      payerId: input.payerId, stateCode: input.stateCode,
      ndc: input.ndc, drugName: input.drugName,
      quantityDispensed: input.quantityDispensed,
      daysSupply: input.daysSupply, refillNumber: input.refillNumber,
      totalChargeCents: input.totalChargeCents,
      priorAuthId: input.priorAuthId,
      dateOfService: input.dateOfService,
      ncpdpPayload: payload,
    });

    await emitEvent('claim.submitted', {
      claimId: row.id, claimControlNumber: row.claim_control_number,
      patientId: row.patient_id, billingProviderId: row.pharmacy_provider_id,
      payerId: row.payer_id, stateCode: row.state_code,
      totalChargeCents: row.total_charge_cents, lineCount: 1,
      serviceCodes: [row.ndc], diagnosisCodes: [],
      paRequestId: row.prior_auth_id, submittedAt: new Date().toISOString(),
      claimKind: 'pharmacy',
    }, { actorUserId: req.auth!.sub, correlationId: req.correlationId });

    await auditLog({
      resource: 'pharmacy_claim', resourceId: row.id, action: 'create',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { ndc: row.ndc, formulary_tier: f?.tier, pa_required: f?.pa_required },
    });

    res.status(201).json({ claim: row, ncpdpPayload: payload, formulary: f });
  }),
);

router.get('/pharmacy/claims/:id', requireAuth, ah(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const row = await repo.getClaim(req.auth!, id);
  await auditLog({
    resource: 'pharmacy_claim', resourceId: id, action: 'read',
    actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
  });
  res.json(row);
}));

// Formulary read endpoint — used by prescriber UIs
router.get('/pharmacy/formulary/:state/:payer/:ndc', requireAuth, ah(async (req, res) => {
  const stateCode = z.string().length(2).parse(req.params.state);
  const payer = z.string().min(1).parse(req.params.payer);
  const ndc = z.string().regex(/^\d{11}$/).parse(req.params.ndc);
  const entry = await repo.lookupFormulary(stateCode, payer, ndc);
  if (!entry) { res.status(404).json({ error: 'not on formulary' }); return; }
  res.json(entry);
}));

void logger;
