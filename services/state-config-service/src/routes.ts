/**
 * state-config-service routes — /api/v1
 *
 * Most-read service: every claim and PA hits GET endpoints.
 * All GET responses served from Redis (TTL 300 s).
 * PUT invalidates the affected cache keys and returns the fresh row.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, ValidationError, query } from '@medguard360/shared';
import * as cache from './cache';
import * as repo from './repository';

// ── Zod schemas ──────────────────────────────────────────────────────────────

const StateCodeParam = z.object({
  stateCode: z.string().length(2).toUpperCase(),
});

export const PaRuleQuery = z.object({
  state: z.string().length(2),
  payer: z.string().min(1).max(50),
  code:  z.string().min(1).max(20),
});

export const FraudThresholds = z.object({
  auto_pay_below:   z.number().nonnegative(),
  auto_block_above: z.number().nonnegative(),
});

export const StateConfigBody = z.object({
  state_name:                   z.string().min(1).max(100).optional(),
  mmis_endpoint:                z.string().url().nullable().optional(),
  mmis_credentials_vault_key:   z.string().max(200).nullable().optional(),
  telehealth_rules:             z.record(z.unknown()).optional(),
  pa_rules:                     z.record(z.unknown()).optional(),
  timely_filing_days:           z.number().int().positive().optional(),
  fraud_thresholds:             FraudThresholds.optional(),
  is_active:                    z.boolean().optional(),
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

// Cache key helpers
const KEY_STATE  = (sc: string): string => `state-config:state:${sc}`;
const KEY_LIST   = 'state-config:list';
const KEY_PARULE = (sc: string, payer: string, code: string): string =>
  `state-config:parule:${sc}:${payer}:${code}`;

// ── Router ────────────────────────────────────────────────────────────────────

export const router = Router();

/**
 * GET /api/v1/state-config
 * List all active states. No auth required — callers are internal services.
 */
router.get(
  '/state-config',
  requireAuth,
  ah(async (_req, res) => {
    const cached = await cache.get(KEY_LIST);
    if (cached) { res.json(cached); return; }

    const rows = await repo.listActiveStates();
    await cache.set(KEY_LIST, rows, cache.STATE_CONFIG_TTL);
    res.json(rows);
  }),
);

/**
 * GET /api/v1/state-config/plans
 * Return state_configs + their MCO/CMO plans, joined. Used by /admin/pilot-states.
 */
router.get(
  '/state-config/plans',
  requireAuth,
  ah(async (_req, res) => {
    const states = await query<{ state_code: string; state_name: string; mac_part_a_b: string | null; mac_dmepos: string | null; hie_name: string | null; hie_vendor: string | null; expansion_status: string | null; hub_phone_number: string | null }>(
      'stateConfig.listPlans.states',
      `SELECT state_code, state_name, mac_part_a_b, mac_dmepos, hie_name, hie_vendor, expansion_status, hub_phone_number
         FROM state_configs WHERE active = TRUE ORDER BY state_code`,
    );
    const plans = await query<{ state_code: string; mco_name: string; plan_type: string | null; payer_id: string; launch_date: string | null; sunset_date: string | null; notes: string | null; active: boolean }>(
      'stateConfig.listPlans.mcos',
      `SELECT state_code, mco_name, plan_type, payer_id, launch_date, sunset_date, notes, active
         FROM mco_registry ORDER BY state_code, plan_type, mco_name`,
    );
    const byState = states.rows.map(s => ({
      ...s,
      plans: plans.rows.filter(p => p.state_code === s.state_code),
    }));
    res.json({ states: byState });
  }),
);

/**
 * GET /api/v1/state-config/pa-rule?state=&payer=&code=
 * Lookup PA requirement for a procedure. Cached per state+payer+code tuple.
 * Must come before /:stateCode to avoid route shadowing.
 */
router.get(
  '/state-config/pa-rule',
  requireAuth,
  ah(async (req, res) => {
    const q = parse(PaRuleQuery, req.query);
    const key = KEY_PARULE(q.state.toUpperCase(), q.payer, q.code);

    const cached = await cache.get(key);
    if (cached) { res.json(cached); return; }

    const row = await repo.getPaRule(q.state, q.payer, q.code);
    // Cache even null (negative cache) — reduces DB hits for unknown codes.
    await cache.set(key, row, cache.STATE_CONFIG_TTL);
    res.json(row);
  }),
);

/**
 * GET /api/v1/state-config/:stateCode
 * Fetch one state's full configuration. Redis cache first.
 */
router.get(
  '/state-config/:stateCode',
  requireAuth,
  ah(async (req, res) => {
    const { stateCode } = parse(StateCodeParam, req.params);
    const key = KEY_STATE(stateCode);

    const cached = await cache.get(key);
    if (cached) { res.json(cached); return; }

    const row = await repo.getStateConfig(stateCode);
    if (!row) { res.status(404).json({ error: `State ${stateCode} not found` }); return; }

    await cache.set(key, row, cache.STATE_CONFIG_TTL);
    res.json(row);
  }),
);

/**
 * PUT /api/v1/state-config/:stateCode
 * Create or update a state configuration.
 * Restricted to platform_administrator and state_medicaid_agency.
 * Invalidates Redis cache for the affected state and the list key.
 */
router.put(
  '/state-config/:stateCode',
  requireAuth,
  requireRole('platform_administrator', 'state_medicaid_agency'),
  ah(async (req, res) => {
    const { stateCode } = parse(StateCodeParam, req.params);
    const body = parse(StateConfigBody, req.body);

    const updated = await repo.upsertStateConfig({ ...body, state_code: stateCode });

    // Invalidate affected cache keys.
    await Promise.all([
      cache.del(KEY_STATE(stateCode)),
      cache.del(KEY_LIST),
    ]);

    res.json(updated);
  }),
);
