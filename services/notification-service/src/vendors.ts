/**
 * Vendor abstraction layer for email (SES), SMS (Twilio), and push (FCM).
 *
 * Real adapters activate when the corresponding env/vault keys are set.
 * Otherwise falls back to a stub that logs + returns a synthetic message ID.
 *
 * Email:  SES_FROM_ADDRESS + AWS credentials  → AWS SES via @aws-sdk/client-ses
 * SMS:    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER → Twilio Messages API
 * Push:   FCM_PROJECT_ID + FCM_SERVICE_ACCOUNT_PATH               → Firebase Admin SDK
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger, getConfigOptional } from '@medguard360/shared';

const logger = createLogger('notification-service');

// ---------------------------------------------------------------------------
// Email — AWS SES
// ---------------------------------------------------------------------------

/**
 * Send an email via AWS SES (nodemailer transport).
 * Falls back to a stub log when SES_FROM_ADDRESS is not set.
 * Returns the vendor message ID.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<string> {
  const fromAddress = getConfigOptional('SES_FROM_ADDRESS');

  if (!fromAddress) {
    const stubId = `stub-${uuidv4()}`;
    logger.info('[STUB] sendEmail', { to: params.to, subject: params.subject, stubId });
    return stubId;
  }

  const region = getConfigOptional('AWS_REGION', 'us-east-1');

  // Dynamic requires so the AWS SDK is not loaded in stub/test mode
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const nodemailer = require('nodemailer') as typeof import('nodemailer');
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const sesModule = require('@aws-sdk/client-ses') as typeof import('@aws-sdk/client-ses');

  const sesClient = new sesModule.SESClient({ region });
  const transporter = nodemailer.createTransport({
    SES: { ses: sesClient, aws: { SendRawEmailCommand: sesModule.SendRawEmailCommand } },
  });

  const info = await transporter.sendMail({
    from: fromAddress,
    to: params.to,
    subject: params.subject,
    text: params.body,
  });

  const messageId = (info.messageId as string) ?? `ses-${uuidv4()}`;
  logger.info('SES email sent', { to: params.to, messageId });
  return messageId;
}

// ---------------------------------------------------------------------------
// SMS — Twilio REST API
// ---------------------------------------------------------------------------

/**
 * Send an SMS via the Twilio Messages API (plain node-fetch, no Twilio SDK required).
 * Falls back to a stub log when TWILIO_ACCOUNT_SID is not set.
 * Returns the vendor message SID.
 */
export async function sendSms(params: {
  to: string;
  body: string;
}): Promise<string> {
  const accountSid = getConfigOptional('TWILIO_ACCOUNT_SID');
  const authToken  = getConfigOptional('TWILIO_AUTH_TOKEN');
  const fromNumber = getConfigOptional('TWILIO_FROM_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    const stubId = `stub-${uuidv4()}`;
    logger.info('[STUB] sendSms', { to: params.to, bodyLength: params.body.length, stubId });
    return stubId;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const fetchModule = require('node-fetch') as typeof import('node-fetch');
  const fetch = fetchModule.default ?? fetchModule;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const formBody = new URLSearchParams({
    To:   params.to,
    From: fromNumber,
    Body: params.body,
  });

  const response = await (fetch as (url: string, opts: Record<string, unknown>) => Promise<{
    ok: boolean; status: number; text: () => Promise<string>; json: () => Promise<{ sid: string }>;
  }>)(url, {
    method:  'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio SMS failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  logger.info('Twilio SMS sent', { to: params.to, sid: data.sid });
  return data.sid;
}

// ---------------------------------------------------------------------------
// Push — Firebase Cloud Messaging (FCM)
// ---------------------------------------------------------------------------

let _firebaseInitialized = false;

/**
 * Send a push notification via FCM (Firebase Admin SDK).
 * Falls back to a stub log when FCM_PROJECT_ID is not set.
 * Returns the FCM message ID string.
 */
export async function sendPush(params: {
  token: string;
  title: string;
  body: string;
}): Promise<string> {
  const projectId          = getConfigOptional('FCM_PROJECT_ID');
  const serviceAccountPath = getConfigOptional('FCM_SERVICE_ACCOUNT_PATH');

  if (!projectId || !serviceAccountPath) {
    const stubId = `stub-${uuidv4()}`;
    logger.info('[STUB] sendPush', {
      tokenPrefix: params.token.slice(0, 8) + '...',
      title: params.title,
      stubId,
    });
    return stubId;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const admin = require('firebase-admin') as typeof import('firebase-admin');

  if (!_firebaseInitialized) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const serviceAccount = require(serviceAccountPath) as import('firebase-admin').ServiceAccount;
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId });
    _firebaseInitialized = true;
  }

  const result = await admin.messaging().send({
    token: params.token,
    notification: { title: params.title, body: params.body },
  });

  logger.info('FCM push sent', { messageId: result });
  return result;
}
