/**
 * TypeScript interfaces for notification_templates and notification_logs tables.
 */

export interface NotificationTemplateRow {
  id: string;
  template_key: string;
  channel: 'email' | 'sms' | 'push';
  subject: string | null;
  body_template: string;
  is_active: boolean;
  created_at: Date;
}

export interface NotificationLogRow {
  id: string;
  recipient_user_id: string | null;
  channel: 'email' | 'sms' | 'push';
  template_key: string | null;
  subject: string | null;
  body: string;
  status: 'sent' | 'failed' | 'bounced';
  vendor_message_id: string | null;
  error_message: string | null;
  sent_at: Date;
}

/** Payload for explicit notification requests via Kafka or REST */
export interface ExplicitSendRequest {
  channel: 'email' | 'sms' | 'push';
  recipient: string; // email address, phone number, or FCM token
  recipientUserId?: string;
  subject?: string;
  body: string;
  templateKey?: string;
}

/** Kafka event payload shapes for typed domain events */
export interface PaDecidedPayload {
  paId: string;
  decision: 'approved' | 'denied';
  procedureCode: string;
  patientId: string;
  providerName: string;
  providerId: string;
  providerEmail?: string;
  providerPhone?: string;
  specialistName?: string;
  denialReason?: string;
}

export interface CredentialingApprovedPayload {
  applicationId: string;
  providerId: string;
  providerName: string;
  providerEmail?: string;
  stateCode: string;
  expiryDate?: string;
}

export interface CredentialingDeniedPayload {
  applicationId: string;
  providerId: string;
  providerName: string;
  providerEmail?: string;
  stateCode: string;
  denialReason?: string;
}

export interface CrisisAlertPayload {
  patientId: string;
  alertType: string;
  stateCode: string;
  providerName?: string;
  providerPhone?: string;
  providerEmail?: string;
  timestamp?: string;
}

export interface FraudAlertPayload {
  claimId: string;
  riskScore: number;
  investigatorPhone?: string;
  investigatorEmail?: string;
}

export interface ClaimSubmittedPayload {
  ccn: string;
  providerId: string;
  providerName: string;
  providerEmail?: string;
  totalAmount: string;
}

export interface DenialAppealSubmittedPayload {
  denialId: string;
  appealId: string;
  providerId: string;
  providerName: string;
  providerEmail?: string;
}

/** Explicit channel-specific notification request from Kafka */
export interface NotificationRequestedPayload {
  channel: 'email' | 'sms' | 'push';
  recipient: string;
  recipientUserId?: string;
  subject?: string;
  body: string;
  templateKey?: string;
}
