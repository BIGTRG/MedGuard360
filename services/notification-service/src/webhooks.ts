/**
 * Inbound webhooks from vendors for delivery receipts and bounces.
 *
 *   - AWS SES → SNS topic → POST /notifications/webhooks/ses
 *   - Twilio  → POST /notifications/webhooks/twilio (status callback)
 *   - FCM     → no webhooks; we poll for delivery receipts via the topic API
 *               (not surfaced here — usually not needed for transactional msgs)
 */

import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { logger, query } from '@medguard360/shared';

interface SnsMessage {
  Type: string;
  MessageId: string;
  Token?: string;
  TopicArn?: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SubscribeURL?: string;
  Signature?: string;
  SigningCertURL?: string;
}

interface SesEvent {
  eventType: 'Bounce' | 'Complaint' | 'Delivery' | 'Send' | 'Reject';
  mail: { messageId: string; destination: string[] };
  bounce?: { bounceType: string; bouncedRecipients: Array<{ emailAddress: string }> };
  complaint?: { complainedRecipients: Array<{ emailAddress: string }> };
}

export async function sesWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sns = req.body as SnsMessage;
    // Subscription confirmation: tell SES we received the topic registration
    if (sns.Type === 'SubscriptionConfirmation' && sns.SubscribeURL) {
      logger.info('confirming SES SNS subscription', { topic: sns.TopicArn });
      await fetch(sns.SubscribeURL).catch(err => logger.warn('SNS confirm failed', { error: err.message }));
      res.status(200).json({ confirmed: true });
      return;
    }

    // Notification: the SES event lives inside sns.Message as a JSON string
    if (sns.Type === 'Notification' && sns.Message) {
      const event = JSON.parse(sns.Message) as SesEvent;
      const messageId = event.mail.messageId;
      const recipient = event.mail.destination[0];

      if (event.eventType === 'Bounce') {
        logger.warn('SES bounce', { messageId, recipient, type: event.bounce?.bounceType });
        await query('notification.markBounce',
          `UPDATE notifications SET status = 'failed', last_error = $2 WHERE vendor_message_id = $1`,
          [messageId, `Bounced: ${event.bounce?.bounceType ?? 'unknown'}`]);
      } else if (event.eventType === 'Complaint') {
        logger.warn('SES complaint', { messageId, recipient });
        await query('notification.markComplaint',
          `UPDATE notifications SET status = 'suppressed', last_error = $2 WHERE vendor_message_id = $1`,
          [messageId, 'Recipient reported as spam']);
      } else if (event.eventType === 'Delivery') {
        await query('notification.markDelivered',
          `UPDATE notifications SET status = 'sent' WHERE vendor_message_id = $1 AND status IN ('pending')`,
          [messageId]);
      }
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** Twilio status callback. Twilio signs the request via the X-Twilio-Signature header. */
export function verifyTwilioSignature(req: Request): boolean {
  const sig = req.header('x-twilio-signature');
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!sig || !authToken) return false;
  const url = `${req.protocol}://${req.host}${req.originalUrl}`;
  const params = req.body as Record<string, string>;
  const sortedKeys = Object.keys(params).sort();
  const data = sortedKeys.reduce((acc, k) => acc + k + params[k], url);
  const expected = crypto.createHmac('sha1', authToken).update(data).digest('base64');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export async function twilioWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!verifyTwilioSignature(req)) {
      res.status(403).json({ error: 'invalid Twilio signature' });
      return;
    }
    const messageSid = (req.body as Record<string, string>).MessageSid;
    const status     = (req.body as Record<string, string>).MessageStatus;
    if (!messageSid) { res.status(204).send(); return; }

    const dbStatus =
      status === 'delivered'    ? 'sent' :
      status === 'failed' || status === 'undelivered' ? 'failed' :
      'pending';

    await query('notification.twilioStatus',
      `UPDATE notifications SET status = $2 WHERE vendor_message_id = $1`,
      [messageSid, dbStatus]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
