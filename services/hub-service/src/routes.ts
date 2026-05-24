/**
 * REST API routes for hub-service (port 3015).
 *
 * POST /api/v1/hub/calls              — start a new call record
 * POST /api/v1/hub/calls/:id/message  — process a caller message (AI classify + respond)
 * PUT  /api/v1/hub/calls/:id/end      — end a call
 * GET  /api/v1/hub/calls              — list calls (state/compliance roles)
 * GET  /api/v1/hub/calls/:id          — get single call
 * GET  /api/v1/hub/stats              — daily stats by state
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  requireAuth, requireRole,
  ValidationError, emitEvent, auditLog,
} from '@medguard360/shared';
import * as repo from './repository';
import { classifyIntent } from './classifier';
import { generateResponse, ChatMessage } from './chatbot';
import { tryAutoAnswer } from './liveLookup';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new ValidationError('Invalid input', r.error.flatten());
  return r.data;
}

const ah = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const CreateCallSchema = z.object({
  stateCode:  z.string().length(2),
  callerType: z.enum(['patient', 'provider', 'emergency_responder', 'unknown']).default('unknown'),
  callerId:   z.string().max(100).optional(),
  channel:    z.enum(['phone', 'web_chat', 'sms']).default('phone'),
});

const MessageSchema = z.object({
  message: z.string().min(1).max(5_000),
  history: z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string(),
  })).default([]),
});

const EndCallSchema = z.object({
  resolution:      z.enum(['resolved', 'transferred', 'escalated', 'callback', 'abandoned']),
  durationSeconds: z.number().int().nonnegative().optional(),
  transcript:      z.string().max(100_000).optional(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const router = Router();

// ---------------------------------------------------------------------------
// POST /api/v1/hub/calls
// Start a new call record
// ---------------------------------------------------------------------------

router.post(
  '/hub/calls',
  requireAuth,
  ah(async (req, res) => {
    const input = parse(CreateCallSchema, req.body);

    const call = await repo.createCall({
      stateCode:  input.stateCode,
      callerType: input.callerType,
      callerId:   input.callerId,
      channel:    input.channel,
    });

    await auditLog({
      resource:   'hub_call',
      resourceId: call.id,
      action:     'create',
      actor:      req.auth!,
      outcome:    'success',
      correlationId: req.correlationId,
      context:    { stateCode: input.stateCode, channel: input.channel },
    });

    res.status(201).json(call);
  }),
);

// ---------------------------------------------------------------------------
// POST /api/v1/hub/calls/:id/message
// Process caller message: classify, respond, check crisis, update call
// ---------------------------------------------------------------------------

router.post(
  '/hub/calls/:id/message',
  requireAuth,
  ah(async (req, res) => {
    const id    = z.string().uuid().parse(req.params.id);
    const input = parse(MessageSchema, req.body);

    const call = await repo.findCall(id);
    const { intent, confidence, crisisFlag } = classifyIntent(input.message);

    // AI tier — if the caller's question is answerable from the DB and we have
    // identity (medicaidId + DOB in the body), answer directly. Otherwise fall
    // back to scripted templates and human escalation.
    let response: string | null = null;
    const identity = (req.body as { medicaidId?: string; dateOfBirth?: string });
    if (identity.medicaidId && identity.dateOfBirth) {
      response = await tryAutoAnswer(intent, { medicaidId: identity.medicaidId, dateOfBirth: identity.dateOfBirth });
    }
    if (!response) {
      response = generateResponse({
        intent,
        stateCode: call.state_code,
        message:   input.message,
        history:   input.history as ChatMessage[],
      });
    }

    // Update call with AI classification and crisis flag
    const updateData: Parameters<typeof repo.updateCall>[1] = {
      intent,
      aiClassification: intent,
      aiConfidence:     confidence,
    };
    if (crisisFlag) updateData.crisisFlag = true;

    await repo.updateCall(id, updateData);

    // If crisis detected, emit event for crisis-service + notification-service
    if (crisisFlag && !call.crisis_flag) {
      await emitEvent(
        'crisis.alert.raised',
        {
          patientId:  call.caller_id ?? 'unknown',
          alertType:  'hub_chat_crisis',
          stateCode:  call.state_code,
          callId:     id,
          callerType: call.caller_type,
          timestamp:  new Date().toISOString(),
        },
        { actorUserId: req.auth!.sub, correlationId: req.correlationId },
      );
    }

    res.json({ response, intent, crisisFlag });
  }),
);

// ---------------------------------------------------------------------------
// PUT /api/v1/hub/calls/:id/end
// End a call: save resolution, duration, transcript, emit hub.call.completed
// ---------------------------------------------------------------------------

router.put(
  '/hub/calls/:id/end',
  requireAuth,
  ah(async (req, res) => {
    const id    = z.string().uuid().parse(req.params.id);
    const input = parse(EndCallSchema, req.body);

    const call = await repo.endCall(id, {
      resolution:      input.resolution,
      durationSeconds: input.durationSeconds,
      transcript:      input.transcript,
    });

    await emitEvent(
      'hub.call.completed',
      {
        callId:          id,
        stateCode:       call.state_code,
        intent:          call.intent,
        resolution:      input.resolution,
        durationSeconds: input.durationSeconds,
        crisisFlag:      call.crisis_flag,
        fraudFlag:       call.fraud_flag,
      },
      { actorUserId: req.auth!.sub, correlationId: req.correlationId },
    );

    await auditLog({
      resource:   'hub_call',
      resourceId: id,
      action:     'update',
      actor:      req.auth!,
      outcome:    'success',
      correlationId: req.correlationId,
      context:    { resolution: input.resolution },
    });

    res.json(call);
  }),
);

// ---------------------------------------------------------------------------
// GET /api/v1/hub/calls
// List calls (state agency, compliance, MCO, platform admin)
// ---------------------------------------------------------------------------

router.get(
  '/hub/calls',
  requireAuth,
  requireRole(
    'state_medicaid_agency',
    'compliance_officer',
    'platform_administrator',
    'mco_admin',
  ),
  ah(async (req, res) => {
    const stateCode  = z.string().length(2).optional().parse(req.query.stateCode);
    const intent     = z.string().optional().parse(req.query.intent);
    const crisisFlag = req.query.crisisFlag !== undefined
      ? req.query.crisisFlag === 'true'
      : undefined;
    const limit = Math.min(Number(req.query.limit ?? 100), 500);

    const calls = await repo.listCalls({ stateCode, intent, crisisFlag, limit });

    await auditLog({
      resource:   'hub_calls',
      resourceId: 'multiple',
      action:     'read',
      actor:      req.auth!,
      outcome:    'success',
      correlationId: req.correlationId,
      context:    { stateCode, intent, crisisFlag, limit },
    });

    res.json({ count: calls.length, calls });
  }),
);

// ---------------------------------------------------------------------------
// GET /api/v1/hub/calls/:id
// Get a single call
// ---------------------------------------------------------------------------

router.get(
  '/hub/calls/:id',
  requireAuth,
  ah(async (req, res) => {
    const id   = z.string().uuid().parse(req.params.id);
    const call = await repo.findCall(id);

    await auditLog({
      resource:   'hub_call',
      resourceId: id,
      action:     'read',
      actor:      req.auth!,
      outcome:    'success',
      correlationId: req.correlationId,
    });

    res.json(call);
  }),
);

// ---------------------------------------------------------------------------
// GET /api/v1/hub/stats
// Daily stats by state — for dashboard
// ---------------------------------------------------------------------------

router.get(
  '/hub/stats',
  requireAuth,
  requireRole(
    'state_medicaid_agency',
    'compliance_officer',
    'reporting_service' as never, // reporting-service uses service JWT with this pseudo-role
    'platform_administrator',
  ),
  ah(async (req, res) => {
    const stateCode = z.string().length(2).parse(req.query.stateCode);
    const dateStr   = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().parse(req.query.date);
    const date      = dateStr ? new Date(dateStr) : new Date();

    const stats = await repo.getDailyStats(stateCode, date);

    res.json({
      stateCode,
      date: date.toISOString().slice(0, 10),
      stats,
    });
  }),
);
