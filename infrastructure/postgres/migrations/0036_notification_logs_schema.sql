-- notification-service tables expected by notification-service repository.
-- Idempotent patch for volumes that only have legacy notifications (0012_notification_schema).

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL,
  subject TEXT,
  body_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID,
  channel TEXT NOT NULL,
  template_key TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  vendor_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notif_logs_user_idx ON notification_logs(recipient_user_id);
CREATE INDEX IF NOT EXISTS notif_logs_status_idx ON notification_logs(status);

INSERT INTO notification_templates (template_key, channel, subject, body_template) VALUES
  ('pa.approved.email', 'email', 'Prior Authorization Approved - {{procedure_code}}', 'Dear {{provider_name}},\n\nYour prior authorization request for {{procedure_code}} has been approved.\n\nPA Reference: {{pa_id}}\nPatient: {{patient_id}}\nApproved by: {{specialist_name}}\n\nThe MedGuard360 Team'),
  ('pa.denied.email', 'email', 'Prior Authorization Denied - {{procedure_code}}', 'Dear {{provider_name}},\n\nYour prior authorization request for {{procedure_code}} has been denied.\n\nDenial Reason: {{denial_reason}}\nPA Reference: {{pa_id}}\n\nYou may appeal this decision within 30 days.\n\nThe MedGuard360 Team'),
  ('pa.approved.sms', 'sms', NULL, 'MedGuard360: PA {{pa_id}} APPROVED for {{procedure_code}}. Patient {{patient_id}}.'),
  ('credentialing.approved.email', 'email', 'Credentialing Application Approved', 'Dear {{provider_name}},\n\nYour Medicaid credentialing application has been approved for {{state_code}}.\n\nYour credential is valid until {{expiry_date}}.\n\nThe MedGuard360 Team'),
  ('credentialing.denied.email', 'email', 'Credentialing Application Requires Attention', 'Dear {{provider_name}},\n\nYour credentialing application could not be approved at this time.\n\nReason: {{denial_reason}}\n\nPlease contact credentialing@medguard360.com to discuss next steps.\n\nThe MedGuard360 Team'),
  ('crisis.alert.email', 'email', 'URGENT: Crisis Alert - Patient {{patient_id}}', 'URGENT CRISIS ALERT\n\nPatient ID: {{patient_id}}\nAlert Type: {{alert_type}}\nTimestamp: {{timestamp}}\nProvider: {{provider_name}}\n\nImmediate action required. Crisis plan has been activated.\n\nMedGuard360 Crisis Response'),
  ('crisis.alert.sms', 'sms', NULL, 'URGENT MedGuard360 CRISIS ALERT: Patient {{patient_id}} - {{alert_type}}. Crisis plan activated. Call 911 if needed.'),
  ('fraud.alert.sms', 'sms', NULL, 'MedGuard360 FRAUD ALERT: Claim {{claim_id}} scored {{risk_score}}/100. Assigned to investigator for review.'),
  ('claim.submitted.email', 'email', 'Claim Submitted - {{ccn}}', 'Dear {{provider_name}},\n\nYour claim has been submitted successfully.\n\nClaim Control Number: {{ccn}}\nTotal Amount: {{total_amount}}\nStatus: Submitted\n\nThe MedGuard360 Team'),
  ('denial.appeal.submitted.email', 'email', 'Appeal Submitted - Denial {{denial_id}}', 'Dear {{provider_name}},\n\nYour appeal for denial {{denial_id}} has been submitted.\n\nExpected response within 30-60 days.\n\nThe MedGuard360 Team')
ON CONFLICT (template_key) DO NOTHING;