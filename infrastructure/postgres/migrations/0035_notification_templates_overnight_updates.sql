-- Notification templates for overnight updates (U1-U6)
-- HETS, Community Engagement, Drug PA templates

BEGIN;

INSERT INTO notification_templates (template_key, channel, subject, body_template, is_active)
VALUES
  -- U1: HETS Enrollment templates
  ('hets.aaa41.email', 'email',
    'HETS Attestation Required — Medicare Eligibility Blocked',
    'Dear Provider,\n\nYour Medicare eligibility checks have been rejected with error code AAA-41.\n\nThis means your NPI ({{provider_npi}}) is not yet attested under the MedGuard360 HETS Submitter UID ({{hets_submitter_uid}}).\n\nState: {{state_code}}\nPayer: {{payer_id}}\n\nTo restore Medicare eligibility, you must complete HETS attestation at https://medguard360.com/compliance/hets.\n\nContact: compliance@medguard360.com\n\nMedGuard360 Compliance Team'),
  ('hets.status.email', 'email',
    'HETS Enrollment Status Updated',
    'Dear Provider,\n\nYour HETS enrollment status has been updated.\n\nNPI: {{provider_npi}}\nNew Status: {{status}}\n\nNotes: {{notes}}\n\nIf you have questions, contact compliance@medguard360.com.\n\nMedGuard360'),

  -- U2: Community Engagement templates
  ('community.engagement.email', 'email',
    'Community Engagement Hours Recorded',
    'Dear Patient,\n\nWe have recorded your community engagement hours for {{state_code}}.\n\nEngagement Type: {{engagement_type}}\nHours Documented: {{hours}}\n\nYour engagement helps us understand your work and self-sufficiency. This information is reported to the state Medicaid agency.\n\nView your engagement history at https://medguard360.com/patient/engagement.\n\nMedGuard360'),

  -- U2: Community Engagement pre-renewal reminders (60/30/7 day)
  ('community.engagement.renewal.60day.email', 'email',
    'Community Engagement Period Expires in 60 Days',
    'Dear {{patient_name}},\n\nYour current community engagement reporting period expires in 60 days.\n\nState: {{state_code}}\nExpires: {{expiry_date}}\n\nTo maintain your Medicaid coverage, please submit your engagement hours before the deadline.\n\nReport hours now: https://medguard360.com/patient/engagement\n\nMedGuard360'),
  ('community.engagement.renewal.30day.email', 'email',
    'Community Engagement Period Expires in 30 Days',
    'Dear {{patient_name}},\n\nREMINDER: Your community engagement reporting period expires in 30 days.\n\nExpires: {{expiry_date}}\n\nSubmit your hours immediately to avoid coverage loss: https://medguard360.com/patient/engagement\n\nMedGuard360'),
  ('community.engagement.renewal.7day.email', 'email',
    'URGENT: Community Engagement Period Expires in 7 Days',
    'URGENT REMINDER\n\nDear {{patient_name}},\n\nYour community engagement reporting period expires in just 7 days.\n\nExpires: {{expiry_date}}\n\nYour Medicaid coverage may be at risk if you do not submit your engagement hours immediately.\n\nSubmit now: https://medguard360.com/patient/engagement\n\nQuestions? Call 1-800-MEDGUARD\n\nMedGuard360'),

  -- U3: Drug Prior Authorization templates
  ('drug.pa.sms', 'sms', NULL,
    'MedGuard360 Drug PA: NDC {{ndc_code}} requires PA. PA ID {{pa_id}}. Review at medguard360.com/pharmacy'),
  ('drug.pa.pharmacy.email', 'email',
    'New Drug Prior Authorization Request — {{ndc_code}}',
    'A new drug prior authorization has been submitted.\n\nPA ID: {{pa_id}}\nDrug NDC: {{ndc_code}}\n\nReview and approve/deny at: https://medguard360.com/pharmacy/drug-pa\n\nMedGuard360');

COMMIT;
