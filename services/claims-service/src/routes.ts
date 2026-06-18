/**
 * claims-service routes
 *
 *   POST /api/v1/claims              — create draft claim + lines
 *   GET  /api/v1/claims              — list claims
 *   GET  /api/v1/claims/:id          — get claim
 *   POST /api/v1/claims/:id/submit   — generate EDI 837P, mark submitted (requireBiometric)
 *   PUT  /api/v1/claims/:id/status   — update status (for payer responses)
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
  createLogger,
  pool,
  withRlsContext,
} from '@medguard360/shared';
import * as repo from './repository';
import { generateEdi837P, Edi837PInput } from './edi837p';

const logger = createLogger('claims-service:routes');

// ── Zod schemas ───────────────────────────────────────────────────────────────

const ClaimLineSchema = z.object({
  line_number: z.number().int().positive(),
  procedure_code: z.string().min(1).max(20),
  modifier_codes: z.array(z.string().length(2)).max(4).optional(),
  diagnosis_pointers: z.array(z.number().int().min(1).max(12)).optional(),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  units: z.number().positive(),
  unit_type: z.string().optional(),
  charge_amount: z.number().nonnegative(),
  place_of_service: z.string().length(2).optional(),
});

const CreateClaimSchema = z.object({
  encounter_id: z.string().uuid().optional(),
  patient_id: z.string().uuid(),
  payer_id: z.string().min(1),
  claim_type: z.string().min(1),
  state_code: z.string().length(2),
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  total_amount: z.number().nonnegative(),
  lines: z.array(ClaimLineSchema).min(1).max(50),
});

const ListClaimsSchema = z.object({
  provider_id: z.string().uuid().optional(),
  patient_id: z.string().uuid().optional(),
  status: z.string().optional(),
  state_code: z.string().length(2).optional(),
});

const UpdateStatusSchema = z.object({
  status: z.string().min(1),
  fraud_score: z.number().min(0).max(100).optional(),
  paid_at: z.string().datetime().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError('Invalid input', result.error.flatten());
  return result.data;
}

const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };

async function billingProviderIdForUser(userId: string): Promise<string | undefined> {
  const result = await pool.query<{ id: string }>(
    'SELECT id FROM providers WHERE user_id = $1 LIMIT 1',
    [userId],
  );
  return result.rows[0]?.id;
}

// ── Router ────────────────────────────────────────────────────────────────────

export const router = Router();

/**
 * POST /api/v1/claims
 * Create a draft claim and its service lines.
 */
router.post(
  '/claims',
  requireAuth,
  requireRole('individual_provider', 'facility_provider', 'billing_manager'),
  ah(async (req, res) => {
    const auth = req.auth!;
    const body = parse(CreateClaimSchema, req.body);

    const claim = await repo.createClaim({
      encounter_id: body.encounter_id ?? null,
      provider_user_id: auth.sub,
      patient_id: body.patient_id,
      payer_id: body.payer_id,
      claim_type: body.claim_type,
      state_code: body.state_code,
      service_date: new Date(body.service_date),
      total_amount: body.total_amount,
      status: 'draft',
      created_by: auth.sub,
    });

    await repo.createClaimLines(claim.id, body.lines);

    await auditLog({
      resource: 'claim',
      resourceId: claim.id,
      action: 'create',
      actor: auth,
      outcome: 'success',
      context: {
        ccn: claim.ccn,
        claimType: body.claim_type,
        totalAmount: body.total_amount,
        lineCount: body.lines.length,
      },
    });

    res.status(201).json({ claim });
  }),
);

/**
 * GET /api/v1/claims
 * List claims with optional filters.
 */
router.get(
  '/claims',
  requireAuth,
  ah(async (req, res) => {
    const filters = parse(ListClaimsSchema, req.query);

    // Non-admin users can only see their own claims
    const auth = req.auth!;
    const effectiveFilters = {
      ...filters,
      state_code: filters.state_code,
    };

    // If not a specialist/admin, scope to own provider
    const privilegedRoles = ['prior_auth_specialist', 'billing_manager', 'compliance_officer',
      'fraud_investigator', 'platform_administrator', 'state_medicaid_agency', 'federal_cms'];
    const hasPrivilege = privilegedRoles.includes(auth.role);

    let providerId = filters.provider_id;
    if (!hasPrivilege) {
      providerId = await billingProviderIdForUser(auth.sub);
    }

    const rows = await withRlsContext(auth, (client) =>
      repo.listClaims(
        {
          providerId,
          patientId: filters.patient_id,
          status: effectiveFilters.status,
          stateCode: effectiveFilters.state_code,
        },
        client,
      ),
    );

    res.json({ count: rows.length, claims: rows });
  }),
);

/**
 * GET /api/v1/claims/:id
 * Get a single claim.
 */
router.get(
  '/claims/:id',
  requireAuth,
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const auth = req.auth!;

    const claim = await repo.findClaim(id);
    if (!claim) throw new NotFoundError('Claim');

    const lines = await repo.findClaimLines(id);

    await auditLog({
      resource: 'claim',
      resourceId: id,
      action: 'read',
      actor: auth,
      outcome: 'success',
    });

    res.json({ claim, lines });
  }),
);

/**
 * POST /api/v1/claims/:id/submit
 * Generate EDI 837P, mark as submitted, emit claim.submitted Kafka event.
 * Requires biometric verification per HIPAA PHI access rules.
 */
router.post(
  '/claims/:id/submit',
  requireAuth,
  requireBiometric,
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const auth = req.auth!;

    const claim = await repo.findClaim(id);
    if (!claim) throw new NotFoundError('Claim');

    if (claim.status !== 'draft' && claim.status !== 'validated') {
      throw new ValidationError(`Claim cannot be submitted from status: ${claim.status}`);
    }

    // Fetch service lines
    const linesResult = await pool.query(
      'SELECT * FROM claim_lines WHERE claim_id = $1 ORDER BY line_number',
      [id],
    );
    const lines = linesResult.rows;

    // Fetch patient demographics for EDI
    let patientFirst = 'Patient';
    let patientLast = 'Unknown';
    let patientDob = '19000101';
    let patientGender: 'M' | 'F' | 'U' = 'U';
    let patientMedicaidId = claim.patient_id;

    try {
      const patientResp = await fetch(
        `${process.env.PATIENT_SERVICE_URL ?? 'http://patient-service:3004'}/api/v1/patients/${claim.patient_id}`,
        {
          headers: { 'x-service-caller': 'claims-service', authorization: `Bearer ${auth.token ?? ''}` },
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (patientResp.ok) {
        const pd = (await patientResp.json()) as {
          first_name?: string; last_name?: string;
          date_of_birth?: string; gender?: string; medicaid_id?: string;
        };
        patientFirst = pd.first_name ?? patientFirst;
        patientLast = pd.last_name ?? patientLast;
        patientDob = (pd.date_of_birth ?? patientDob).replace(/-/g, '');
        patientGender = (pd.gender ?? 'U') as 'M' | 'F' | 'U';
        patientMedicaidId = pd.medicaid_id ?? patientMedicaidId;
      }
    } catch (err) {
      logger.warn('patient-service lookup failed; using defaults for EDI', { error: (err as Error).message });
    }

    // Fetch provider / billing info
    let billingNpi = '0000000000';
    let billingName = 'Unknown Provider';
    let billingAddress = { street: '1 Main St', city: 'Raleigh', state: claim.state_code, zip: '00000' };

    try {
      const provResp = await fetch(
        `${process.env.PROVIDER_SERVICE_URL ?? 'http://provider-service:3002'}/api/v1/providers/${claim.provider_user_id}`,
        {
          headers: { 'x-service-caller': 'claims-service', authorization: `Bearer ${auth.token ?? ''}` },
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (provResp.ok) {
        const pv = (await provResp.json()) as {
          npi?: string; name?: string;
          address?: { street?: string; city?: string; state?: string; zip?: string };
        };
        billingNpi = pv.npi ?? billingNpi;
        billingName = pv.name ?? billingName;
        billingAddress = {
          street: pv.address?.street ?? billingAddress.street,
          city: pv.address?.city ?? billingAddress.city,
          state: pv.address?.state ?? billingAddress.state,
          zip: pv.address?.zip ?? billingAddress.zip,
        };
      }
    } catch (err) {
      logger.warn('provider-service lookup failed; using defaults for EDI', { error: (err as Error).message });
    }

    // Build diagnosis codes from lines if not on claim
    const diagnosisCodes: string[] = [];
    for (const line of lines) {
      if (line.diagnosis_codes) {
        for (const code of line.diagnosis_codes) {
          if (!diagnosisCodes.includes(code)) diagnosisCodes.push(code);
        }
      }
    }

    const ediInput: Edi837PInput = {
      ccn: claim.ccn,
      submitterId: 'MEDGUARD360',
      billingNpi,
      billingName,
      billingAddress,
      payerId: claim.payer_id,
      payerName: `Payer ${claim.payer_id}`,
      providerNpi: billingNpi,
      providerName: billingName,
      patientMedicaidId,
      patientName: { first: patientFirst, last: patientLast },
      patientDob,
      patientGender,
      serviceDate: claim.service_date instanceof Date
        ? claim.service_date.toISOString().slice(0, 10).replace(/-/g, '')
        : String(claim.service_date).replace(/-/g, ''),
      diagnosisCodes: diagnosisCodes.length ? diagnosisCodes : ['Z00.00'],
      claimLines: lines.map((l: Record<string, unknown>) => ({
        line_number: l.line_number as number,
        procedure_code: l.procedure_code as string,
        modifier_codes: (l.modifier_codes as string[] | null) ?? [],
        diagnosis_pointers: (l.diagnosis_pointers as number[] | null) ?? [1],
        service_date: l.service_date as string,
        units: Number(l.units ?? 1),
        unit_type: (l.unit_type as string | undefined) ?? 'UN',
        charge_amount: Number(l.charge_amount ?? 0),
        place_of_service: (l.place_of_service as string | undefined) ?? '11',
      })),
      totalCharge: claim.total_amount,
    };

    const ediPayload = generateEdi837P(ediInput);

    // Update EDI payload
    await repo.updateClaimEdi(id, ediPayload);

    // Mark submitted
    const updated = await repo.updateClaimStatus(id, 'submitted', {
      submitted_at: new Date(),
      edi_payload: ediPayload,
    });

    // Emit claim.submitted for fraud-engine and other consumers
    const procedureCodes = lines.map((l: Record<string, unknown>) => l.procedure_code as string);
    await emitEvent('claim.submitted', {
      claimId: id,
      providerId: claim.provider_user_id,
      patientId: claim.patient_id,
      stateCode: claim.state_code,
      serviceDate: claim.service_date,
      totalAmount: claim.total_amount,
      procedureCodes,
      diagnosisCodes,
      payerId: claim.payer_id,
      ccn: claim.ccn,
    });

    await auditLog({
      resource: 'claim',
      resourceId: id,
      action: 'submit',
      actor: auth,
      outcome: 'success',
      phiAccessed: true,
      context: {
        ccn: claim.ccn,
        payerId: claim.payer_id,
        totalAmount: claim.total_amount,
        lineCount: lines.length,
      },
    });

    res.json({
      claim: updated,
      ediPayload,
      ccn: claim.ccn,
    });
  }),
);

/**
 * PUT /api/v1/claims/:id/status
 * Update claim status — used by payer response handlers (835 remit, 277CA).
 */
router.put(
  '/claims/:id/status',
  requireAuth,
  requireRole('billing_manager', 'platform_administrator'),
  ah(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    const auth = req.auth!;
    const body = parse(UpdateStatusSchema, req.body);

    const extra: Partial<import('./types').ClaimRow> = {};
    if (body.fraud_score !== undefined) extra.fraud_score = body.fraud_score;
    if (body.paid_at !== undefined) extra.paid_at = new Date(body.paid_at);

    const updated = await repo.updateClaimStatus(id, body.status, extra);

    await auditLog({
      resource: 'claim',
      resourceId: id,
      action: 'update',
      actor: auth,
      outcome: 'success',
      context: { newStatus: body.status },
    });

    res.json({ claim: updated });
  }),
);
