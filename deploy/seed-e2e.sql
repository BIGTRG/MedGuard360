-- End-to-end demo seed. Idempotent (ON CONFLICT DO NOTHING).
-- Run with: docker exec -i medguard360-postgres-1 psql -U medguard -d medguard360 < deploy/seed-e2e.sql

-- Provider IDs (using existing users)
INSERT INTO providers (id, user_id, npi, ein, type, legal_name, doing_business_as, email, phone,
                       primary_taxonomy_code, enrolled_medicaid_states, enrolled_medicare, status,
                       state_code, created_by)
VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003',
   '1234567893', '12-3456789', 'individual', 'Dr. Alice Johnson MD', NULL,
   'alice@demo.medguard360.com', '919-555-0201',
   '207Q00000X', ARRAY['NC','SC','GA'], true, 'active', 'NC',
   '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', NULL,
   '1234567902', '12-3456790', 'facility', 'Raleigh Family Medicine', 'RFM Clinic',
   'admin@rfm.example', '919-555-0202',
   '261QF0400X', ARRAY['NC'], true, 'active', 'NC',
   '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', NULL,
   '1234567911', '12-3456791', 'pharmacy', 'Maple Street Pharmacy', NULL,
   'maple@example.com', '919-555-0203',
   '333600000X', ARRAY['NC'], true, 'active', 'NC',
   '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Patients (10)
INSERT INTO patients (id, medicaid_id, first_name, last_name, date_of_birth, sex_at_birth,
                      email, phone, address_line1, city, state_code, postal_code,
                      primary_care_provider_id, status, created_by)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'NCMD00100001', 'John',    'Doe',     '1985-03-12', 'M',
   'jdoe@example.com',  '919-555-0101', '123 Main St',  'Raleigh',   'NC', '27601',
   '20000000-0000-0000-0000-000000000001', 'active', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000002', 'NCMD00100002', 'Jane',    'Smith',   '1978-11-04', 'F',
   'jsmith@example.com','919-555-0102', '456 Oak Ave',  'Durham',    'NC', '27701',
   '20000000-0000-0000-0000-000000000001', 'active', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000003', 'NCMD00100003', 'Maria',   'Garcia',  '1992-07-21', 'F',
   'mgarcia@example.com','919-555-0103','789 Pine Rd',  'Charlotte', 'NC', '28202',
   '20000000-0000-0000-0000-000000000001', 'active', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000004', 'NCMD00100004', 'Carlos',  'Hernandez', '1955-01-30', 'M',
   NULL,'919-555-0104','12 Cedar Ln',  'Greenville','NC', '27834',
   '20000000-0000-0000-0000-000000000001', 'active', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000005', 'NCMD00100005', 'Sarah',   'Lee',     '2002-09-15', 'F',
   NULL,'919-555-0105','34 Spruce Ct', 'Asheville', 'NC', '28801',
   '20000000-0000-0000-0000-000000000001', 'active', '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- Eligibility (a few)
INSERT INTO eligibility_checks (id, patient_id, state_code, payer_id, coverage_type, source, active,
                                effective_from, plan_name, details, checked_at, ttl_until, requested_by)
VALUES
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', 'NC', 'NC_MEDICAID', 'medicaid', 'mmis', true,
   '2026-01-01', 'NC Medicaid Standard', '{}'::jsonb, now(), now() + interval '24 hours',
   '00000000-0000-0000-0000-000000000003'),
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', 'NC', 'NC_MEDICAID', 'medicaid', 'cache', true,
   '2026-01-01', 'NC Medicaid Standard', '{}'::jsonb, now(), now() + interval '24 hours',
   '00000000-0000-0000-0000-000000000003');

-- Clinical encounters
INSERT INTO clinical_encounters (id, patient_id, provider_id, state_code, encounter_type, status,
                                 started_at, completed_at, pa_request_ids, claim_ids, created_by)
VALUES
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', 'NC', 'office_visit', 'completed',
   now() - interval '7 days', now() - interval '7 days' + interval '30 minutes',
   ARRAY[]::uuid[], ARRAY[]::uuid[], '00000000-0000-0000-0000-000000000003'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000001', 'NC', 'telehealth', 'completed',
   now() - interval '3 days', now() - interval '3 days' + interval '20 minutes',
   ARRAY[]::uuid[], ARRAY[]::uuid[], '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- Claims
INSERT INTO claims (id, claim_control_number, patient_id, billing_provider_id, rendering_provider_id,
                    payer_id, state_code, claim_type, service_from, service_to, diagnosis_codes,
                    total_charge_cents, status, fraud_score, fraud_recommendation, created_by)
VALUES
  ('40000000-0000-0000-0000-000000000001', '260515-000001',
   '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', 'NC_MEDICAID', 'NC', 'professional',
   CURRENT_DATE - 7, CURRENT_DATE - 7, ARRAY['E11.9'], 12500, 'submitted', 15, 'approve',
   '00000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000002', '260515-000002',
   '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', 'NC_MEDICAID', 'NC', 'professional',
   CURRENT_DATE - 3, CURRENT_DATE - 3, ARRAY['J45.909'], 9500, 'paid', 8, 'approve',
   '00000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000003', '260515-000003',
   '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', 'NC_MEDICAID', 'NC', 'professional',
   CURRENT_DATE - 1, CURRENT_DATE - 1, ARRAY['I10'], 18000, 'flagged', 82, 'review',
   '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO claim_lines (id, claim_id, line_number, service_code, service_code_type, units,
                         charge_cents, diagnosis_pointers, service_date, place_of_service)
VALUES
  (gen_random_uuid(), '40000000-0000-0000-0000-000000000001', 1, '99213', 'CPT', 1, 12500,
   ARRAY[1], CURRENT_DATE - 7, '11'),
  (gen_random_uuid(), '40000000-0000-0000-0000-000000000002', 1, '99214', 'CPT', 1, 9500,
   ARRAY[1], CURRENT_DATE - 3, '02'),
  (gen_random_uuid(), '40000000-0000-0000-0000-000000000003', 1, '99215', 'CPT', 1, 18000,
   ARRAY[1], CURRENT_DATE - 1, '11');

-- Fraud scores + case
INSERT INTO fraud_scores (id, claim_id, state_code, score, recommendation, flags, explanation, engine_version)
VALUES
  (gen_random_uuid(), '40000000-0000-0000-0000-000000000003', 'NC', 82, 'review',
   '{"unusual_volume":true,"distance_anomaly":true}'::jsonb,
   'Provider billing 3x normal CPT 99215 volume this week, with patient pickup 90 miles from service location.',
   'fraud-v1.0');

INSERT INTO fraud_cases (id, claim_id, state_code, status, opened_at)
VALUES
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000003', 'NC', 'open', now())
ON CONFLICT (id) DO NOTHING;

-- PA requests
INSERT INTO pa_requests (id, patient_id, ordering_provider_id, payer_id, state_code, service_code,
                         service_code_type, service_description, diagnosis_codes, urgency, status,
                         decision_explanation, ai_engine_version, ai_match_score, due_at, created_by)
VALUES
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', 'NC_MEDICAID', 'NC', '70553', 'CPT',
   'MRI brain w/o contrast', ARRAY['G44.1'], 'standard', 'pending',
   '2 of 3 criteria met; documentation of failed conservative treatment required.',
   'pa-nlp-v1.0', 0.67, now() + interval '7 days',
   '00000000-0000-0000-0000-000000000003'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000001', 'NC_MEDICAID', 'NC', 'J0897', 'HCPCS',
   'Denosumab 1 mg injection', ARRAY['M81.0'], 'drug', 'approved',
   'All 3 criteria met; bone density T-score < -2.5.',
   'pa-nlp-v1.0', 0.92, now() + interval '24 hours',
   '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- Credentialing applications
INSERT INTO credentialing_applications (id, provider_id, state_code, application_type, status,
                                        submitted_at, target_decision_by, created_by)
VALUES
  ('80000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'NC',
   'initial', 'in_review', now() - interval '2 days', now() + interval '3 days',
   '00000000-0000-0000-0000-000000000001'),
  ('80000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'NC',
   'recredential', 'submitted', now(), now() + interval '5 days',
   '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Denials + appeals
INSERT INTO denials (id, claim_id, state_code, carc_code, carc_description, rarc_codes,
                     denied_amount_cents, remit_received_at, payer_message, status, appeal_deadline)
VALUES
  ('90000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000002', 'NC',
   '50', 'These are non-covered services because this is not deemed medical necessity', ARRAY[]::text[],
   9500, now() - interval '1 day', 'Service requires prior authorization', 'pending_appeal',
   now() + interval '60 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO appeals (id, denial_id, attempt_number, status, drafted_by_ai, ai_engine_version,
                     ai_confidence, subject, body, attachments)
VALUES
  (gen_random_uuid(), '90000000-0000-0000-0000-000000000001', 1, 'draft', true,
   'denial-predictor-v1.0', 0.81,
   'Appeal: claim 260515-000002 - medical necessity established',
   'We respectfully appeal the denial. The patient presented with documented severe asthma exacerbation requiring level-4 evaluation per CPT 99214 criteria. Attached chart notes support medical necessity per state coverage policy.',
   ARRAY[]::text[]);

-- Crisis plan + alert
INSERT INTO crisis_plans (id, patient_id, state_code, created_by_provider_id, warning_signs,
                          internal_coping_strategies, social_supports, professional_supports,
                          emergency_contacts, safe_environment_steps, effective_from, status)
VALUES
  ('A0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'NC',
   '20000000-0000-0000-0000-000000000001',
   ARRAY['isolation','sleep changes','hopelessness'],
   ARRAY['deep breathing','walk outside','call sister'],
   '[{"name":"Sister Jane","phone":"919-555-9001"}]'::jsonb,
   '[{"name":"Dr. Johnson","phone":"919-555-0201"}]'::jsonb,
   '[{"name":"988 Lifeline","phone":"988"}]'::jsonb,
   ARRAY['remove firearms','secure medications'],
   CURRENT_DATE, 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO crisis_alerts (id, patient_id, state_code, source, severity, signals, detected_at, status)
VALUES
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000001', 'NC', 'clinical_note', 'high',
   '{"keywords":["hopeless","want to disappear"],"confidence":0.84}'::jsonb,
   now() - interval '4 hours', 'active');

-- Hub calls
INSERT INTO hub_calls (id, state_code, caller_type, intent, channel, duration_seconds, fraud_flag, crisis_flag)
VALUES
  (gen_random_uuid(), 'NC', 'provider', 'eligibility', 'voice', 245, false, false),
  (gen_random_uuid(), 'NC', 'patient', 'crisis', 'voice', 1820, false, true),
  (gen_random_uuid(), 'NC', 'patient', 'prior_auth', 'chat', 320, false, false);

-- DME order
INSERT INTO dme_orders (id, patient_id, prescribing_provider_id, supplier_provider_id, payer_id,
                       state_code, hcpcs_code, description, quantity, rental_or_purchase, total_charge_cents,
                       cmn_complete, date_of_service, status, created_by)
VALUES
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000002', 'NC_MEDICAID', 'NC', 'E0260', 'Hospital bed semi-electric',
   1, 'rental', 27500, true, CURRENT_DATE - 1, 'authorized', '00000000-0000-0000-0000-000000000003');

-- NEMT trip
INSERT INTO nemt_trips (id, patient_id, broker_id, payer_id, state_code, hcpcs_code, trip_type,
                       pickup_address, destination_address, scheduled_pickup_at, miles_billed, status, created_by)
VALUES
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002',
   'NC_MEDICAID', 'NC', 'A0130', 'ambulatory', '34 Spruce Ct, Asheville NC', '789 Hospital Dr, Asheville NC',
   now() + interval '2 days', 14.2, 'scheduled', '00000000-0000-0000-0000-000000000003');

-- Pharmacy claim
INSERT INTO pharmacy_claims (id, patient_id, pharmacy_user_id, ndc_code, drug_name, quantity,
                              days_supply, fill_date, payer_id, state_code, total_amount, status, created_by)
VALUES
  (gen_random_uuid(), '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   '00378-1810-93', 'Lisinopril 20 mg tab', 30, 30, CURRENT_DATE - 2, 'NC_MEDICAID', 'N',
   12.40, 'paid', '00000000-0000-0000-0000-000000000003');

-- HIE referral
INSERT INTO hie_referrals (id, fhir_resource_id, patient_id, referring_provider_id, receiving_org_name,
                          state_code, service_requested, priority, status, fhir_payload, created_by)
VALUES
  (gen_random_uuid(), 'ServiceRequest/demo-001', '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', 'Duke Cardiology Clinic', 'NC',
   'Cardiology consult — chest pain workup', 'routine', 'pending',
   '{"resourceType":"ServiceRequest","status":"active","intent":"order"}'::jsonb,
   '00000000-0000-0000-0000-000000000003');

-- Audit log
INSERT INTO audit_log_events (id, occurred_at, actor_user_id, resource, resource_id, action, outcome,
                              context, producer)
VALUES
  (gen_random_uuid(), now() - interval '1 hour', '00000000-0000-0000-0000-000000000003',
   'patient', '10000000-0000-0000-0000-000000000001', 'read', 'success',
   '{"ip":"10.0.0.5"}'::jsonb, 'patient-service'),
  (gen_random_uuid(), now() - interval '30 minutes', '00000000-0000-0000-0000-000000000003',
   'claim', '40000000-0000-0000-0000-000000000001', 'submit', 'success',
   '{"ip":"10.0.0.5"}'::jsonb, 'claims-service');

SELECT 'e2e seed done' AS status;
