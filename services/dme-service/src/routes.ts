import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  requireAuth, requireRole, auditLog, emitEvent, ValidationError,
} from '@medguard360/shared';
import * as repo from './repository';
import { validate } from './hcpcs';

const CreateSchema = z.object({
  patientId: z.string().uuid(),
  prescribingProviderId: z.string().uuid(),
  supplierProviderId: z.string().uuid(),
  payerId: z.string().min(1),
  stateCode: z.string().length(2),
  hcpcsCode: z.string().min(5).max(5),
  description: z.string().min(1).max(200),
  modifier1: z.string().length(2).optional(),
  modifier2: z.string().length(2).optional(),
  quantity: z.number().int().positive().default(1),
  rentalOrPurchase: z.enum(['rental','purchase']),
  rentalMonths: z.number().int().positive().optional(),
  totalChargeCents: z.number().int().nonnegative(),
  priorAuthId: z.string().uuid().optional(),
  cmnComplete: z.boolean().default(false),
  dateOfService: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deliveryAddress: z.string().max(500).optional(),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new ValidationError('Invalid input', r.error.flatten());
  return r.data;
}
const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => { fn(req, res, next).catch(next); };

export const router = Router();

router.post('/dme/orders',
  requireAuth, requireRole('dmepos_supplier','individual_provider','facility_provider','platform_administrator'),
  ah(async (req, res) => {
    const input = parse(CreateSchema, req.body);

    // Validate HCPCS rules
    const v = validate({
      hcpcsCode: input.hcpcsCode, quantity: input.quantity,
      rentalOrPurchase: input.rentalOrPurchase,
      cmnComplete: input.cmnComplete, priorAuthId: input.priorAuthId,
    });
    if (!v.valid) {
      throw new ValidationError(`DMEPOS validation failed: ${v.errors.join(' ')}`, v.errors);
    }

    const order = await repo.createOrder(req.auth!, {
      patient_id: input.patientId,
      prescribing_provider_id: input.prescribingProviderId,
      supplier_provider_id: input.supplierProviderId,
      payer_id: input.payerId, state_code: input.stateCode,
      hcpcs_code: input.hcpcsCode, description: input.description,
      modifier_1: input.modifier1 ?? null, modifier_2: input.modifier2 ?? null,
      quantity: input.quantity, rental_or_purchase: input.rentalOrPurchase,
      rental_months: input.rentalMonths ?? null,
      total_charge_cents: String(input.totalChargeCents),
      prior_auth_id: input.priorAuthId ?? null, cmn_complete: input.cmnComplete,
      date_of_service: input.dateOfService,
      delivery_address: input.deliveryAddress ?? null,
    });

    await emitEvent('dme.order.created', {
      orderId: order.id, patientId: order.patient_id, supplierId: order.supplier_provider_id,
      hcpcs: order.hcpcs_code, stateCode: order.state_code, warnings: v.warnings,
    }, { actorUserId: req.auth!.sub, correlationId: req.correlationId });

    await auditLog({
      resource: 'dme_order', resourceId: order.id, action: 'create',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { hcpcs: order.hcpcs_code, rentalOrPurchase: order.rental_or_purchase },
    });

    res.status(201).json({ order, validation: v });
  }),
);

router.post('/dme/orders/:id/status',
  requireAuth, requireRole('dmepos_supplier','platform_administrator','billing_manager'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const status = z.enum(['approved','delivered','billed','denied','cancelled']).parse(req.body.status);
    const order = await repo.setStatus(req.auth!, id, status);
    await emitEvent('dme.order.status.changed', { orderId: id, status },
      { actorUserId: req.auth!.sub, correlationId: req.correlationId });
    await auditLog({
      resource: 'dme_order', resourceId: id, action: 'update',
      actor: req.auth!, outcome: 'success', correlationId: req.correlationId,
      context: { new_status: status },
    });
    res.json(order);
  }),
);

router.get('/dme/orders/:id', requireAuth, ah(async (req, res) => {
  const id = z.string().uuid().parse(req.params.id);
  const order = await repo.getOrder(req.auth!, id);
  res.json(order);
}));
