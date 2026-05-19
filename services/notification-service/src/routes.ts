/**
 * REST API routes for notification-service.
 *
 * POST /api/v1/notifications/send  — admin / compliance explicit send
 * GET  /api/v1/notifications/logs  — list notification delivery log
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  requireAuth, requireRole,
  ValidationError, emitEvent, auditLog,
} from '@medguard360/shared';
import { logNotification, listLogs } from './repository';
import { sendEmail, sendSms, sendPush } from './vendors';

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

const SendSchema = z.object({
  channel:         z.enum(['email', 'sms', 'push']),
  recipient:       z.string().min(1).max(500),
  recipientUserId: z.string().uuid().optional(),
  subject:         z.string().max(500).optional(),
  body:            z.string().min(1).max(10_000),
  templateKey:     z.string().max(200).optional(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const router = Router();

/**
 * POST /api/v1/notifications/send
 *
 * Synchronous admin send — dispatches immediately, writes to notification_logs,
 * and emits notification.sent on success.
 * Roles: platform_administrator, compliance_officer
 */
router.post(
  '/notifications/send',
  requireAuth,
  requireRole('platform_administrator', 'compliance_officer'),
  ah(async (req, res) => {
    const input = parse(SendSchema, req.body);

    let vendorMessageId: string;
    let status: 'sent' | 'failed' = 'sent';
    let errorMessage: string | undefined;

    try {
      switch (input.channel) {
        case 'email':
          vendorMessageId = await sendEmail({
            to:      input.recipient,
            subject: input.subject ?? '(no subject)',
            body:    input.body,
          });
          break;
        case 'sms':
          vendorMessageId = await sendSms({ to: input.recipient, body: input.body });
          break;
        case 'push':
          vendorMessageId = await sendPush({
            token: input.recipient,
            title: input.subject ?? 'MedGuard360',
            body:  input.body,
          });
          break;
      }
    } catch (err) {
      status = 'failed';
      errorMessage = (err as Error).message;
      vendorMessageId = '';
    }

    const log = await logNotification({
      recipient_user_id: input.recipientUserId ?? null,
      channel:           input.channel,
      template_key:      input.templateKey ?? null,
      subject:           input.subject ?? null,
      body:              input.body,
      status,
      vendor_message_id: vendorMessageId || null,
      error_message:     errorMessage ?? null,
    });

    if (status === 'sent') {
      await emitEvent('notification.sent', {
        channel:         input.channel,
        recipient:       input.recipient,
        recipientUserId: input.recipientUserId,
        templateKey:     input.templateKey,
        vendorMessageId,
      }, { actorUserId: req.auth!.sub, correlationId: req.correlationId });
    }

    await auditLog({
      resource:   'notification',
      resourceId: log.id,
      action:     'create',
      actor:      req.auth!,
      outcome:    status === 'sent' ? 'success' : 'error',
      correlationId: req.correlationId,
      context:    { channel: input.channel, templateKey: input.templateKey },
    });

    res.status(status === 'sent' ? 201 : 502).json({ log });
  }),
);

/**
 * GET /api/v1/notifications/logs
 *
 * List notification delivery log entries.
 * Supports optional query params: recipientUserId, channel, status, limit (max 500).
 * Roles: platform_administrator, compliance_officer
 */
router.get(
  '/notifications/logs',
  requireAuth,
  requireRole('platform_administrator', 'compliance_officer'),
  ah(async (req, res) => {
    const recipientUserId = z.string().uuid().optional().parse(req.query.recipientUserId);
    const channel         = z.enum(['email', 'sms', 'push']).optional().parse(req.query.channel);
    const status          = z.enum(['sent', 'failed', 'bounced']).optional().parse(req.query.status);
    const limit           = Math.min(Number(req.query.limit ?? 100), 500);

    const rows = await listLogs({ recipientUserId, channel, status, limit });

    await auditLog({
      resource:   'notification_logs',
      resourceId: 'multiple',
      action:     'read',
      actor:      req.auth!,
      outcome:    'success',
      correlationId: req.correlationId,
      context:    { recipientUserId, channel, status, limit },
    });

    res.json({ count: rows.length, logs: rows });
  }),
);
