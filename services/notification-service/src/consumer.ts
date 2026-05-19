/**
 * Kafka consumer for notification-service.
 *
 * Group ID: notification-service
 *
 * Subscribed topics:
 *   Business events  — pa.decided, credentialing.approved, credentialing.denied,
 *                      crisis.alert.raised, fraud.alert.raised, claim.submitted,
 *                      denial.appeal.submitted
 *   Explicit requests — notification.email.requested, notification.sms.requested,
 *                       notification.push.requested
 *
 * For business events: look up the template by "<event-type>.<channel>",
 *   render, dispatch, log.
 * For explicit requests: use the payload's recipient/subject/body directly,
 *   dispatch, log.
 * On success: emit notification.sent.
 */

import { consumeEvents, emitEvent, logger, DomainEvent } from '@medguard360/shared';
import { renderTemplate } from './templateEngine';
import { sendEmail, sendSms, sendPush } from './vendors';
import { getTemplate, logNotification } from './repository';
import {
  PaDecidedPayload,
  CredentialingApprovedPayload,
  CredentialingDeniedPayload,
  CrisisAlertPayload,
  FraudAlertPayload,
  ClaimSubmittedPayload,
  DenialAppealSubmittedPayload,
  NotificationRequestedPayload,
} from './types';

// ---------------------------------------------------------------------------
// Topic lists
// ---------------------------------------------------------------------------

const EXPLICIT_TOPICS = [
  'notification.email.requested',
  'notification.sms.requested',
  'notification.push.requested',
] as const;

const BUSINESS_TOPICS = [
  'pa.decided',
  'credentialing.approved',
  'credentialing.denied',
  'crisis.alert.raised',
  'fraud.alert.raised',
  'claim.submitted',
  'denial.appeal.submitted',
] as const;

const ALL_TOPICS = [...EXPLICIT_TOPICS, ...BUSINESS_TOPICS];

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

export async function startConsumer(): Promise<void> {
  await consumeEvents(
    'notification-service',
    ALL_TOPICS,
    async (event: DomainEvent) => {
      try {
        const isExplicit = (EXPLICIT_TOPICS as readonly string[]).includes(event.eventType);
        if (isExplicit) {
          await handleExplicit(event);
        } else {
          await handleBusinessEvent(event);
        }
      } catch (err) {
        logger.error('notification consumer error', {
          eventType: event.eventType,
          eventId: event.eventId,
          error: (err as Error).message,
        });
        // Re-throw so kafkajs retries with backoff
        throw err;
      }
    },
  );
  logger.info('notification-service consumer started', { topics: ALL_TOPICS });
}

// ---------------------------------------------------------------------------
// Explicit requests (notification.email/sms/push.requested)
// ---------------------------------------------------------------------------

async function handleExplicit(event: DomainEvent): Promise<void> {
  const p = event.payload as NotificationRequestedPayload;

  if (!p.recipient || !p.body) {
    logger.warn('explicit notification missing required fields', { eventId: event.eventId });
    return;
  }

  const channel = p.channel;
  let vendorMessageId: string;
  let errorMessage: string | undefined;
  let status: 'sent' | 'failed' = 'sent';

  try {
    vendorMessageId = await dispatchChannel(channel, p.recipient, p.subject, p.body);
  } catch (err) {
    status = 'failed';
    errorMessage = (err as Error).message;
    vendorMessageId = '';
    logger.error('explicit notification dispatch failed', { channel, error: errorMessage });
  }

  await logNotification({
    recipient_user_id: p.recipientUserId ?? null,
    channel,
    template_key: p.templateKey ?? null,
    subject: p.subject ?? null,
    body: p.body,
    status,
    vendor_message_id: vendorMessageId || null,
    error_message: errorMessage ?? null,
  });

  if (status === 'sent') {
    await emitEvent('notification.sent', {
      channel,
      recipient: p.recipient,
      recipientUserId: p.recipientUserId,
      vendorMessageId,
    }, { correlationId: event.correlationId, actorUserId: event.actorUserId });
  }
}

// ---------------------------------------------------------------------------
// Business event fan-out
// ---------------------------------------------------------------------------

/**
 * Maps a business event type to a list of (template_key, recipient, recipientUserId?) tuples.
 * Multiple templates = multiple channels (e.g. email + sms).
 */
async function resolveDeliveries(event: DomainEvent): Promise<Array<{
  templateKey: string;
  recipient: string;
  recipientUserId?: string;
  ctx: Record<string, string>;
}>> {
  const t = event.eventType;

  if (t === 'pa.decided') {
    const p = event.payload as PaDecidedPayload;
    const ctx: Record<string, string> = {
      pa_id: p.paId,
      procedure_code: p.procedureCode,
      patient_id: p.patientId,
      provider_name: p.providerName,
      specialist_name: p.specialistName ?? '',
      denial_reason: p.denialReason ?? '',
    };
    const decision = p.decision; // 'approved' | 'denied'
    const deliveries: Array<{ templateKey: string; recipient: string; recipientUserId?: string; ctx: Record<string, string> }> = [];
    if (p.providerEmail) {
      deliveries.push({ templateKey: `pa.${decision}.email`, recipient: p.providerEmail, recipientUserId: p.providerId, ctx });
    }
    if (decision === 'approved' && p.providerPhone) {
      deliveries.push({ templateKey: 'pa.approved.sms', recipient: p.providerPhone, recipientUserId: p.providerId, ctx });
    }
    return deliveries;
  }

  if (t === 'credentialing.approved') {
    const p = event.payload as CredentialingApprovedPayload;
    if (!p.providerEmail) return [];
    return [{
      templateKey: 'credentialing.approved.email',
      recipient: p.providerEmail,
      recipientUserId: p.providerId,
      ctx: {
        provider_name: p.providerName,
        state_code: p.stateCode,
        expiry_date: p.expiryDate ?? '',
      },
    }];
  }

  if (t === 'credentialing.denied') {
    const p = event.payload as CredentialingDeniedPayload;
    if (!p.providerEmail) return [];
    return [{
      templateKey: 'credentialing.denied.email',
      recipient: p.providerEmail,
      recipientUserId: p.providerId,
      ctx: {
        provider_name: p.providerName,
        denial_reason: p.denialReason ?? '',
      },
    }];
  }

  if (t === 'crisis.alert.raised') {
    const p = event.payload as CrisisAlertPayload;
    const ctx: Record<string, string> = {
      patient_id: p.patientId,
      alert_type: p.alertType,
      provider_name: p.providerName ?? '',
      timestamp: p.timestamp ?? new Date().toISOString(),
    };
    const deliveries: Array<{ templateKey: string; recipient: string; ctx: Record<string, string> }> = [];
    if (p.providerEmail) deliveries.push({ templateKey: 'crisis.alert.email', recipient: p.providerEmail, ctx });
    if (p.providerPhone) deliveries.push({ templateKey: 'crisis.alert.sms',   recipient: p.providerPhone, ctx });
    return deliveries;
  }

  if (t === 'fraud.alert.raised') {
    const p = event.payload as FraudAlertPayload;
    const ctx: Record<string, string> = {
      claim_id: p.claimId,
      risk_score: String(p.riskScore),
    };
    const deliveries: Array<{ templateKey: string; recipient: string; ctx: Record<string, string> }> = [];
    if (p.investigatorPhone) deliveries.push({ templateKey: 'fraud.alert.sms', recipient: p.investigatorPhone, ctx });
    return deliveries;
  }

  if (t === 'claim.submitted') {
    const p = event.payload as ClaimSubmittedPayload;
    if (!p.providerEmail) return [];
    return [{
      templateKey: 'claim.submitted.email',
      recipient: p.providerEmail,
      recipientUserId: p.providerId,
      ctx: {
        provider_name: p.providerName,
        ccn: p.ccn,
        total_amount: p.totalAmount,
      },
    }];
  }

  if (t === 'denial.appeal.submitted') {
    const p = event.payload as DenialAppealSubmittedPayload;
    if (!p.providerEmail) return [];
    return [{
      templateKey: 'denial.appeal.submitted.email',
      recipient: p.providerEmail,
      recipientUserId: p.providerId,
      ctx: {
        provider_name: p.providerName,
        denial_id: p.denialId,
      },
    }];
  }

  return [];
}

async function handleBusinessEvent(event: DomainEvent): Promise<void> {
  const deliveries = await resolveDeliveries(event);

  if (deliveries.length === 0) {
    logger.debug('no deliveries resolved for business event', { eventType: event.eventType });
    return;
  }

  for (const delivery of deliveries) {
    const template = await getTemplate(delivery.templateKey);
    if (!template) {
      logger.warn('template not found', { templateKey: delivery.templateKey });
      continue;
    }

    const subject = template.subject ? renderTemplate(template.subject, delivery.ctx) : undefined;
    const body    = renderTemplate(template.body_template, delivery.ctx);
    const channel = template.channel;

    let vendorMessageId: string;
    let errorMessage: string | undefined;
    let status: 'sent' | 'failed' = 'sent';

    try {
      vendorMessageId = await dispatchChannel(channel, delivery.recipient, subject, body);
    } catch (err) {
      status = 'failed';
      errorMessage = (err as Error).message;
      vendorMessageId = '';
      logger.error('business event dispatch failed', {
        templateKey: delivery.templateKey,
        channel,
        error: errorMessage,
      });
    }

    await logNotification({
      recipient_user_id: delivery.recipientUserId ?? null,
      channel,
      template_key: delivery.templateKey,
      subject: subject ?? null,
      body,
      status,
      vendor_message_id: vendorMessageId || null,
      error_message: errorMessage ?? null,
    });

    if (status === 'sent') {
      await emitEvent('notification.sent', {
        channel,
        recipient: delivery.recipient,
        recipientUserId: delivery.recipientUserId,
        templateKey: delivery.templateKey,
        vendorMessageId,
      }, { correlationId: event.correlationId, actorUserId: event.actorUserId });
    }
  }
}

// ---------------------------------------------------------------------------
// Channel dispatch helper
// ---------------------------------------------------------------------------

async function dispatchChannel(
  channel: 'email' | 'sms' | 'push',
  recipient: string,
  subject: string | undefined,
  body: string,
): Promise<string> {
  switch (channel) {
    case 'email':
      return sendEmail({ to: recipient, subject: subject ?? '(no subject)', body });
    case 'sms':
      return sendSms({ to: recipient, body });
    case 'push':
      return sendPush({ token: recipient, title: subject ?? 'MedGuard360', body });
    default: {
      const _exhaustive: never = channel;
      throw new Error(`Unknown channel: ${String(_exhaustive)}`);
    }
  }
}
