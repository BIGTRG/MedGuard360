/**
 * Templated messages.
 *
 * Production keeps these in a CMS or per-state config so they can be
 * tweaked without redeploying. For now, code is the source of truth.
 *
 * `{var}` placeholders are substituted from the event payload.
 */

export interface Template {
  channel: 'email' | 'sms' | 'push';
  subject?: string;
  body: string;
}

export const TEMPLATES: Record<string, Template> = {
  // Auth
  'user.welcome': {
    channel: 'email',
    subject: 'Welcome to MedGuard360',
    body: 'Hi {firstName},\n\nYour MedGuard360 account is ready. Sign in at https://portal.medguard360.com\n\n— MedGuard360',
  },

  // Provider credentialing
  'credentialing.application.received': {
    channel: 'email',
    subject: 'We received your credentialing application',
    body: 'Hi {providerName},\n\nYour application is in review. Target decision: {targetDecisionBy}.',
  },
  'credentialing.approved': {
    channel: 'email',
    subject: 'You are credentialed with MedGuard360',
    body: 'Hi {providerName},\n\nYour credentialing application has been approved for {stateCode}. You can now bill claims.',
  },
  'credentialing.denied': {
    channel: 'email',
    subject: 'Credentialing application — action required',
    body: 'Hi {providerName},\n\nYour application was not approved. Reason: {reason}.',
  },

  // PA
  'pa.approved': {
    channel: 'email',
    subject: 'Prior authorization approved',
    body: 'Prior authorization {paRequestId} for {patientName} ({serviceCode}) has been approved.',
  },
  'pa.denied': {
    channel: 'email',
    subject: 'Prior authorization denied',
    body: 'Prior authorization {paRequestId} for {patientName} ({serviceCode}) was denied. You may appeal.',
  },

  // Claim / fraud
  'claim.paid': {
    channel: 'email',
    subject: 'Claim paid',
    body: 'Claim {claimControlNumber} was paid: ${amountDollars}.',
  },
  'claim.fraud.review': {
    channel: 'email',
    subject: 'Claim held for fraud review',
    body: 'Claim {claimControlNumber} ({amountDollars}) is on hold for review. Score: {score}.',
  },

  // Crisis
  'crisis.alert': {
    channel: 'sms',
    body: 'CRISIS: Patient {patientName} has triggered an alert. Plan ID {crisisPlanId}. Call {hubPhone}.',
  },
};

export function render(templateKey: string, vars: Record<string, unknown>): { template: Template; subject?: string; body: string } | null {
  const tpl = TEMPLATES[templateKey];
  if (!tpl) return null;
  const apply = (s: string): string => s.replace(/\{(\w+)\}/g, (_m, k) => String(vars[k] ?? `{${k}}`));
  return {
    template: tpl,
    subject: tpl.subject ? apply(tpl.subject) : undefined,
    body: apply(tpl.body),
  };
}
