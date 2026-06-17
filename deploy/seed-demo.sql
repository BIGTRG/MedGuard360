-- MedGuard360 — demo seed data
-- Idempotent — safe to re-run. NEVER use these creds in production.
--
-- All demo accounts use the same bcrypt hash for `demo-Password!1`.
-- The hash was generated with:
--   node -e "console.log(require('bcrypt').hashSync('demo-Password!1', 12))"

BEGIN;

-- ============================================================
-- Demo users (one per key role)
-- ============================================================
INSERT INTO users (id, email, password_hash, role, status, state_code, created_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@demo.medguard360.com',
   '$2b$12$8S0dPI6y67sbRcH2qQ07YuAjWJf1PLCHo3qroKqt4zxGjs6Tq6.gm',
   'platform_administrator', 'active', NULL,
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002', 'state@demo.medguard360.com',
   '$2b$12$8S0dPI6y67sbRcH2qQ07YuAjWJf1PLCHo3qroKqt4zxGjs6Tq6.gm',
   'state_medicaid_agency', 'active', 'NC',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', 'provider@demo.medguard360.com',
   '$2b$12$8S0dPI6y67sbRcH2qQ07YuAjWJf1PLCHo3qroKqt4zxGjs6Tq6.gm',
   'individual_provider', 'active', 'NC',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000004', 'patient@demo.medguard360.com',
   '$2b$12$8S0dPI6y67sbRcH2qQ07YuAjWJf1PLCHo3qroKqt4zxGjs6Tq6.gm',
   'patient', 'active', 'NC',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000005', 'pa@demo.medguard360.com',
   '$2b$12$8S0dPI6y67sbRcH2qQ07YuAjWJf1PLCHo3qroKqt4zxGjs6Tq6.gm',
   'prior_auth_specialist', 'active', 'NC',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000006', 'fraud@demo.medguard360.com',
   '$2b$12$8S0dPI6y67sbRcH2qQ07YuAjWJf1PLCHo3qroKqt4zxGjs6Tq6.gm',
   'fraud_investigator', 'active', 'NC',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000007', 'denial@demo.medguard360.com',
   '$2b$12$8S0dPI6y67sbRcH2qQ07YuAjWJf1PLCHo3qroKqt4zxGjs6Tq6.gm',
   'denial_appeals_specialist', 'active', 'NC',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000008', 'responder@demo.medguard360.com',
   '$2b$12$8S0dPI6y67sbRcH2qQ07YuAjWJf1PLCHo3qroKqt4zxGjs6Tq6.gm',
   'emergency_responder', 'active', 'NC',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000009', 'compliance@demo.medguard360.com',
   '$2b$12$8S0dPI6y67sbRcH2qQ07YuAjWJf1PLCHo3qroKqt4zxGjs6Tq6.gm',
   'compliance_officer', 'active', 'NC',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000010', 'credentialing@demo.medguard360.com',
   '$2b$12$8S0dPI6y67sbRcH2qQ07YuAjWJf1PLCHo3qroKqt4zxGjs6Tq6.gm',
   'credentialing_specialist', 'active', 'NC',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000011', 'dme@demo.medguard360.com',
   '$2b$12$8S0dPI6y67sbRcH2qQ07YuAjWJf1PLCHo3qroKqt4zxGjs6Tq6.gm',
   'dmepos_supplier', 'active', 'NC',
   '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000012', 'nemt@demo.medguard360.com',
   '$2b$12$8S0dPI6y67sbRcH2qQ07YuAjWJf1PLCHo3qroKqt4zxGjs6Tq6.gm',
   'nemt_broker', 'active', 'NC',
   '00000000-0000-0000-0000-000000000001')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- Patients (10 demos in NC)
-- ============================================================
INSERT INTO patients (id, medicaid_id, first_name, last_name, date_of_birth, sex_at_birth,
                      email, phone, address_line1, city, state_code, postal_code,
                      primary_care_provider_id, status, created_by) VALUES
  -- Demo member portal user (patients.id must equal users.id for RLS)
  ('00000000-0000-0000-0000-000000000004', 'NCMD-DEMO-MEMBER', 'Alex', 'Member', '1990-06-15', 'F',
   'patient@demo.medguard360.com', '919-555-0142', '100 Demo Lane', 'Raleigh', 'NC', '27601',
   '00000000-0000-0000-0000-000000000003', 'active',
   '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'NCMD00100001', 'John',    'Doe',     '1985-03-12', 'M',
   'jdoe@example.com',  '919-555-0101', '123 Main St',  'Raleigh',   'NC', '27601',
   '00000000-0000-0000-0000-000000000003', 'active',
   '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000002', 'NCMD00100002', 'Jane',    'Smith',   '1978-11-04', 'F',
   'jsmith@example.com','919-555-0102', '456 Oak Ave',  'Durham',    'NC', '27701',
   '00000000-0000-0000-0000-000000000003', 'active',
   '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000003', 'NCMD00100003', 'Maria',   'Garcia',  '1992-07-21', 'F',
   'mgarcia@example.com','919-555-0103','789 Pine Rd',  'Cary',      'NC', '27513',
   '00000000-0000-0000-0000-000000000003', 'active',
   '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000004', 'NCMD00100004', 'Robert',  'Johnson', '1965-02-19', 'M',
   'rjohnson@example.com','919-555-0104','321 Elm St',  'Apex',      'NC', '27502',
   '00000000-0000-0000-0000-000000000003', 'active',
   '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000005', 'NCMD00100005', 'Sarah',   'Williams','2001-09-30', 'F',
   'swilliams@example.com','919-555-0105','654 Birch Ln','Chapel Hill','NC','27514',
   '00000000-0000-0000-0000-000000000003', 'active',
   '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000006', 'NCMD00100006', 'David',   'Brown',   '1957-12-15', 'M',
   NULL,'919-555-0106','987 Cedar Dr','Wake Forest','NC','27587',
   '00000000-0000-0000-0000-000000000003', 'active',
   '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000007', 'NCMD00100007', 'Lisa',    'Davis',   '1989-05-08', 'F',
   NULL,'919-555-0107','159 Maple Way','Morrisville','NC','27560',
   '00000000-0000-0000-0000-000000000003', 'active',
   '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000008', 'NCMD00100008', 'Michael', 'Wilson',  '1994-08-22', 'M',
   NULL,'919-555-0108','753 Willow Pl','Holly Springs','NC','27540',
   '00000000-0000-0000-0000-000000000003', 'active',
   '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000009', 'NCMD00100009', 'Emily',   'Taylor',  '1972-01-17', 'F',
   NULL,'919-555-0109','852 Spruce Ct','Garner',     'NC','27529',
   '00000000-0000-0000-0000-000000000003', 'active',
   '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000010', 'NCMD00100010', 'James',   'Anderson','1988-04-26', 'M',
   NULL,'919-555-0110','741 Aspen Trl','Knightdale', 'NC','27545',
   '00000000-0000-0000-0000-000000000003', 'active',
   '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Provider profile for the demo doctor
-- ============================================================
INSERT INTO providers (id, user_id, npi, ein, type, legal_name, state_code,
                       primary_taxonomy_code, status, enrolled_medicaid_states, created_by)
VALUES
  ('20000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000003',
   '1234567893', '12-3456789',
   'individual', 'Dr. Demo Provider, MD',
   'NC', '208000000X', 'active',
   ARRAY['NC'],
   '00000000-0000-0000-0000-000000000001')
ON CONFLICT (npi) DO NOTHING;

-- ============================================================
-- PA coverage criteria (a real document the BERT engine will match against)
-- ============================================================
INSERT INTO pa_criteria_documents (id, state_code, payer_id, service_code, title, source,
                                    criteria_text, effective_from)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'NC', 'NCMEDPAY', '90837',
   '90837 — Individual psychotherapy (60 min)', 'mco_policy',
   E'Coverage criteria for CPT 90837 (Psychotherapy, 60 minutes):\n' ||
   E'1. Patient must have a documented mental health diagnosis on the DSM-5 axis.\n' ||
   E'2. Patient must have failed first-line therapy for at least 30 days OR documented severity warranting intensive treatment.\n' ||
   E'3. The treating clinician must be a licensed psychologist, LCSW, or psychiatrist.\n' ||
   E'4. The session must address evidence-based treatment goals documented in the treatment plan.\n' ||
   E'5. Reauthorization requires documented progress notes from the prior approved period.',
   '2026-01-01')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pa_rules (state_code, payer_id, service_code, service_code_type,
                       pa_required, criteria_document_id, effective_from)
VALUES
  ('NC', 'NCMEDPAY', '90837', 'CPT', TRUE,
   '30000000-0000-0000-0000-000000000001', '2026-01-01')
ON CONFLICT (state_code, payer_id, service_code, service_code_type, effective_from) DO NOTHING;

-- ============================================================
-- A pending PA request the specialist can review (the flagship screen)
-- ============================================================
INSERT INTO pa_requests (id, patient_id, ordering_provider_id, payer_id, state_code,
                          service_code, service_code_type, service_description,
                          diagnosis_codes, urgency, status, ai_engine_version,
                          ai_match_score, decision_explanation, due_at, created_by)
VALUES
  ('40000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000003',
   'NCMEDPAY', 'NC', '90837', 'CPT',
   'Individual psychotherapy, 60 minutes',
   ARRAY['F32.9'], 'standard', 'evaluating',
   'pa-nlp-matcher/0.1.0+sentence-transformers/all-MiniLM-L6-v2',
   0.823,
   E'BERT semantic similarity evaluated 5 criterion lines against the clinical context.\n' ||
   E'Met: 4.  Not met: 0.  Indeterminate: 1.\n' ||
   E'Overall match score: 0.82.\n' ||
   E'Final decision must be made by a prior authorization specialist (AI governance).',
   now() + interval '5 days',
   '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  ai_engine_version = EXCLUDED.ai_engine_version,
  ai_match_score = EXCLUDED.ai_match_score,
  decision_explanation = EXCLUDED.decision_explanation,
  due_at = EXCLUDED.due_at,
  human_reviewer_id = NULL,
  decision_at = NULL;

-- Automation target for demo-flow decide check (flagship PA stays pending for live demo)
INSERT INTO pa_requests (id, patient_id, ordering_provider_id, payer_id, state_code,
                          service_code, service_code_type, service_description,
                          diagnosis_codes, urgency, status, ai_engine_version,
                          ai_match_score, decision_explanation, due_at, created_by)
VALUES
  ('40000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000003',
   'NCMEDPAY', 'NC', '99214', 'CPT',
   'Office visit, established patient, moderate complexity',
   ARRAY['I10'], 'standard', 'evaluating',
   'pa-nlp-matcher/0.1.0+sentence-transformers/all-MiniLM-L6-v2',
   0.781,
   'Demo-flow automation PA — safe to approve during verification.',
   now() + interval '4 days',
   '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  ai_match_score = EXCLUDED.ai_match_score,
  decision_explanation = EXCLUDED.decision_explanation,
  due_at = EXCLUDED.due_at,
  human_reviewer_id = NULL,
  decision_at = NULL;

-- Historical PAs for the specialist "Decided" tab and provider PA list
INSERT INTO pa_requests (id, patient_id, ordering_provider_id, payer_id, state_code,
                          service_code, service_code_type, service_description,
                          diagnosis_codes, urgency, status, ai_engine_version,
                          ai_match_score, decision_explanation, decision_at, due_at, created_by)
VALUES
  ('40000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000003',
   'NCMEDPAY', 'NC', '99213', 'CPT',
   'Office visit, established patient, low complexity',
   ARRAY['J06.9'], 'standard', 'approved',
   'pa-nlp-matcher/0.1.0+sentence-transformers/all-MiniLM-L6-v2',
   0.912,
   'All policy criteria met. Approved for 12 visits per calendar year.',
   now() - interval '12 days',
   now() - interval '14 days',
   '00000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003',
   'NCMEDPAY', 'NC', '97110', 'CPT',
   'Therapeutic exercises, each 15 minutes',
   ARRAY['M54.5'], 'standard', 'denied',
   'pa-nlp-matcher/0.1.0+sentence-transformers/all-MiniLM-L6-v2',
   0.441,
   'Documentation does not show failed conservative therapy per NC Medicaid policy.',
   now() - interval '5 days',
   now() - interval '7 days',
   '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO pa_criterion_evaluations (pa_request_id, criterion_text, outcome, explanation, similarity_score)
VALUES
  ('40000000-0000-0000-0000-000000000001',
   'Patient must have a documented mental health diagnosis on the DSM-5 axis.',
   'met', 'Patient diagnosed with major depressive disorder (F32.9) per DSM-5 criteria.', 0.95),
  ('40000000-0000-0000-0000-000000000001',
   'Patient must have failed first-line therapy for at least 30 days OR documented severity warranting intensive treatment.',
   'met', 'Patient failed sertraline 100mg over 8 weeks and escitalopram 20mg over 6 weeks; PHQ-9 score 18 indicates moderately severe symptoms.', 0.91),
  ('40000000-0000-0000-0000-000000000001',
   'The treating clinician must be a licensed psychologist, LCSW, or psychiatrist.',
   'met', 'Dr. Demo Provider, MD — board-certified psychiatrist (license active in NC).', 0.99),
  ('40000000-0000-0000-0000-000000000001',
   'The session must address evidence-based treatment goals documented in the treatment plan.',
   'met', 'Treatment plan documents CBT-focused intervention targeting cognitive distortions and behavioral activation.', 0.88),
  ('40000000-0000-0000-0000-000000000001',
   'Reauthorization requires documented progress notes from the prior approved period.',
   'indeterminate', 'No prior PA period on file — this appears to be an initial request, so reauthorization criteria do not apply.', 0.42)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 12 demo claims with various fraud profiles
-- ============================================================
SELECT setval('claim_ccn_seq', 99, true);  -- start ccn at 260517-000100

INSERT INTO claims (id, claim_control_number, patient_id, billing_provider_id, payer_id,
                     state_code, claim_type, service_from, service_to, diagnosis_codes,
                     total_charge_cents, status, submitted_at,
                     fraud_score, fraud_recommendation, created_by)
VALUES
  -- Clean, paid claims
  ('50000000-0000-0000-0000-000000000001', '260517-000101',
   '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
   'NCMEDPAY', 'NC', '837P', '2026-05-10', '2026-05-10', ARRAY['F32.9'],
   15000, 'paid', now() - interval '3 days', 12, 'auto_pay',
   '00000000-0000-0000-0000-000000000003'),
  ('50000000-0000-0000-0000-000000000002', '260517-000102',
   '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
   'NCMEDPAY', 'NC', '837P', '2026-05-11', '2026-05-11', ARRAY['I10'],
   12500, 'paid', now() - interval '2 days', 8, 'auto_pay',
   '00000000-0000-0000-0000-000000000003'),
  -- Fraud-review queue
  ('50000000-0000-0000-0000-000000000003', '260517-000103',
   '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001',
   'NCMEDPAY', 'NC', '837P', '2026-05-12', '2026-05-12', ARRAY['Z00.00'],
   285000, 'fraud_review', now() - interval '1 day', 67, 'route_to_review',
   '00000000-0000-0000-0000-000000000003'),
  -- High-fraud auto-blocked
  ('50000000-0000-0000-0000-000000000004', '260517-000104',
   '10000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001',
   'NCMEDPAY', 'NC', '837P', '2026-05-13', '2026-05-13', ARRAY['Z00.00'],
   895000, 'fraud_review', now() - interval '12 hours', 89, 'auto_block',
   '00000000-0000-0000-0000-000000000003'),
  -- Submitted, awaiting payer
  ('50000000-0000-0000-0000-000000000005', '260517-000105',
   '10000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001',
   'NCMEDPAY', 'NC', '837P', '2026-05-14', '2026-05-14', ARRAY['F41.1'],
   18000, 'submitted', now() - interval '8 hours', 18, 'auto_pay',
   '00000000-0000-0000-0000-000000000003'),
  -- Denied
  ('50000000-0000-0000-0000-000000000006', '260517-000106',
   '10000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001',
   'NCMEDPAY', 'NC', '837P', '2026-05-09', '2026-05-09', ARRAY['M54.5'],
   22000, 'denied', now() - interval '4 days', 24, 'auto_pay',
   '00000000-0000-0000-0000-000000000003'),
  -- Demo member portal (patient user id = patients.id)
  ('50000000-0000-0000-0000-000000000007', '260517-000107',
   '00000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001',
   'NCMEDPAY', 'NC', '837P', '2026-05-14', '2026-05-14', ARRAY['F41.1'],
   18000, 'paid', now() - interval '5 days', 10, 'auto_pay',
   '00000000-0000-0000-0000-000000000003'),
  ('50000000-0000-0000-0000-000000000008', '260517-000108',
   '00000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001',
   'NCMEDPAY', 'NC', '837P', '2026-05-09', '2026-05-09', ARRAY['M54.5'],
   22000, 'submitted', now() - interval '2 days', 14, 'auto_pay',
   '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO claim_lines (claim_id, line_number, service_code, service_code_type,
                          units, charge_cents, diagnosis_pointers,
                          service_date, place_of_service)
VALUES
  ('50000000-0000-0000-0000-000000000001', 1, '99213', 'CPT', 1, 15000, ARRAY[1], '2026-05-10', '11'),
  ('50000000-0000-0000-0000-000000000002', 1, '99213', 'CPT', 1, 12500, ARRAY[1], '2026-05-11', '11'),
  ('50000000-0000-0000-0000-000000000003', 1, '99215', 'CPT', 1, 285000, ARRAY[1], '2026-05-12', '11'),
  ('50000000-0000-0000-0000-000000000004', 1, '99215', 'CPT', 1, 895000, ARRAY[1], '2026-05-13', '11'),
  ('50000000-0000-0000-0000-000000000005', 1, '90834', 'CPT', 1, 18000, ARRAY[1], '2026-05-14', '11'),
  ('50000000-0000-0000-0000-000000000006', 1, '97140', 'CPT', 1, 22000, ARRAY[1], '2026-05-09', '11'),
  ('50000000-0000-0000-0000-000000000007', 1, '90834', 'CPT', 1, 18000, ARRAY[1], '2026-05-14', '11'),
  ('50000000-0000-0000-0000-000000000008', 1, '97140', 'CPT', 1, 22000, ARRAY[1], '2026-05-09', '11')
ON CONFLICT DO NOTHING;

-- Member portal: patients read own claims (patients.id = users.id for demo member)
DROP POLICY IF EXISTS claims_read ON claims;
CREATE POLICY claims_read ON claims FOR SELECT USING (
  app_role_is_cross_state()
  OR (app_current_role() IN ('state_medicaid_agency','mco_admin','billing_manager',
                              'compliance_officer','fraud_investigator','denial_appeals_specialist')
      AND state_code = app_current_state_code())
  OR billing_provider_id = app_current_user_id()
  OR rendering_provider_id = app_current_user_id()
  OR (app_current_role() = 'patient' AND patient_id = app_current_user_id())
);

-- ============================================================
-- Fraud scores + cases (queue for the investigator)
-- ============================================================
INSERT INTO fraud_scores (claim_id, state_code, score, recommendation, flags, explanation, engine_version)
VALUES
  ('50000000-0000-0000-0000-000000000003', 'NC', 67, 'route_to_review',
   '[{"code":"CHARGE_OUTLIER","label":"Claim charge is 12.5× provider 30-day average","severity":0.85}]'::jsonb,
   'Risk score: 67/100 (auto-block threshold: 80). Recommendation: route to review.' || chr(10) ||
   'Flags raised:' || chr(10) || '  • Claim charge is 12.5× provider 30-day average',
   'fraud-detection/1.0.0-iforest-xgb'),
  ('50000000-0000-0000-0000-000000000004', 'NC', 89, 'auto_block',
   '[{"code":"UNUSUAL_VOLUME_24H","label":"Provider submitted 250 claims in 24h","severity":0.85},{"code":"CHARGE_OUTLIER","label":"Claim charge is 45× provider 30-day average","severity":0.9}]'::jsonb,
   'Risk score: 89/100 (auto-block threshold: 80). Recommendation: auto block.' || chr(10) ||
   'Flags raised:' || chr(10) ||
   '  • Provider submitted 250 claims in 24h' || chr(10) ||
   '  • Claim charge is 45× provider 30-day average',
   'fraud-detection/1.0.0-iforest-xgb')
ON CONFLICT (claim_id) DO NOTHING;

INSERT INTO fraud_cases (id, claim_id, state_code, status)
VALUES
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000003', 'NC', 'open'),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000004', 'NC', 'open')
ON CONFLICT (id) DO NOTHING;

-- Demo timeline for the flagship high-score case (NC script stop 3)
INSERT INTO fraud_case_events (id, case_id, actor_user_id, event_type, text, occurred_at)
VALUES
  ('61000000-0000-0000-0000-000000000001',
   '60000000-0000-0000-0000-000000000002',
   NULL, 'system',
   'AI scored claim at 89/100 — auto_block recommendation.',
   now() - interval '3 hours'),
  ('61000000-0000-0000-0000-000000000002',
   '60000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000006', 'review',
   'Investigator pulled 30-day provider billing history — 250 claims in 24h vs baseline 12/day.',
   now() - interval '2 hours'),
  ('61000000-0000-0000-0000-000000000003',
   '60000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000006', 'note',
   'GPS encounter log confirms patient at home; service location mismatch flagged for follow-up.',
   now() - interval '90 minutes')
ON CONFLICT (id) DO NOTHING;

-- Crisis plan for demo member (Stop 6 — 3-second offline access talking point)
INSERT INTO crisis_plans (id, patient_id, state_code, created_by_provider_id, warning_signs,
                          internal_coping_strategies, social_supports, professional_supports,
                          emergency_contacts, safe_environment_steps, effective_from, status)
VALUES
  ('A0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'NC',
   '00000000-0000-0000-0000-000000000003',
   ARRAY['isolation', 'sleep changes', 'hopelessness'],
   ARRAY['deep breathing', 'walk outside', 'call support person'],
   '[{"name":"Jordan Member","phone":"919-555-9002","relationship":"sibling"}]'::jsonb,
   '[{"name":"Dr. Demo Provider","phone":"919-555-0201","role":"PCP"}]'::jsonb,
   '[{"name":"988 Suicide & Crisis Lifeline","phone":"988"}]'::jsonb,
   ARRAY['remove firearms', 'secure medications'],
   CURRENT_DATE, 'active')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- A denial + AI-drafted appeal (denial-appeals queue)
-- ============================================================
INSERT INTO denials (id, claim_id, state_code, carc_code, carc_description,
                      denied_amount_cents, status, appeal_deadline)
VALUES
  ('70000000-0000-0000-0000-000000000001',
   '50000000-0000-0000-0000-000000000006', 'NC',
   '197', 'Precertification/authorization absent',
   22000, 'reviewing', now() + interval '85 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO appeals (id, denial_id, attempt_number, status, drafted_by_ai, ai_engine_version,
                     ai_confidence, subject, body, attachments)
VALUES
  ('71000000-0000-0000-0000-000000000001',
   '70000000-0000-0000-0000-000000000001', 1, 'draft', true,
   'denial-predictor/1.0.0', 0.84,
   'Appeal: prior authorization was obtained — claim 50000000-000006',
   E'We respectfully appeal this denial. Prior authorization PA-40000001 was approved for CPT 97140 on 2026-05-08. ' ||
   E'The attached authorization letter and clinical notes establish medical necessity per NC Medicaid policy.',
   ARRAY['pa_approval_letter.pdf', 'clinical_notes.pdf'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- A few daily rollups so the state dashboard has trend data
-- ============================================================
INSERT INTO daily_rollups (state_code, metric, day, value)
SELECT 'NC', 'claims_submitted',     CURRENT_DATE - i, (random() * 80 + 60)::int FROM generate_series(0, 29) AS i
ON CONFLICT (state_code, metric, day) DO NOTHING;
INSERT INTO daily_rollups (state_code, metric, day, value)
SELECT 'NC', 'claims_paid',          CURRENT_DATE - i, (random() * 70 + 50)::int FROM generate_series(0, 29) AS i
ON CONFLICT (state_code, metric, day) DO NOTHING;
INSERT INTO daily_rollups (state_code, metric, day, value)
SELECT 'NC', 'claims_denied',        CURRENT_DATE - i, (random() * 8 + 2)::int FROM generate_series(0, 29) AS i
ON CONFLICT (state_code, metric, day) DO NOTHING;
INSERT INTO daily_rollups (state_code, metric, day, value)
SELECT 'NC', 'fraud_flagged',        CURRENT_DATE - i, (random() * 4 + 1)::int FROM generate_series(0, 29) AS i
ON CONFLICT (state_code, metric, day) DO NOTHING;
INSERT INTO daily_rollups (state_code, metric, day, value)
SELECT 'NC', 'pa_approved',          CURRENT_DATE - i, (random() * 25 + 15)::int FROM generate_series(0, 29) AS i
ON CONFLICT (state_code, metric, day) DO NOTHING;
INSERT INTO daily_rollups (state_code, metric, day, value)
SELECT 'NC', 'pa_denied',            CURRENT_DATE - i, (random() * 4)::int FROM generate_series(0, 29) AS i
ON CONFLICT (state_code, metric, day) DO NOTHING;
INSERT INTO daily_rollups (state_code, metric, day, value)
SELECT 'NC', 'credentialing_approved', CURRENT_DATE - i, (random() * 2)::int FROM generate_series(0, 29) AS i
ON CONFLICT (state_code, metric, day) DO NOTHING;

-- ============================================================
-- Provider encounters (clinical-doc stop) + credentialing queue
-- ============================================================
INSERT INTO clinical_encounters (id, provider_id, patient_id, state_code, encounter_type, status,
                                 started_at, signed_at, signed_by, created_by)
VALUES
  ('85000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000001',
   'NC', 'office', 'signed',
   now() - interval '3 days', now() - interval '3 days',
   '00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000003'),
  ('85000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000002',
   'NC', 'telehealth', 'in_progress',
   now() - interval '1 day', NULL, NULL,
   '00000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO credentialing_applications (id, provider_id, state_code, application_type, status,
                                      submitted_at, target_decision_by, created_by)
VALUES
  ('90000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000001', 'NC', 'initial', 'review_pending',
   now() - interval '2 days', now() + interval '3 days',
   '00000000-0000-0000-0000-000000000010'),
  ('90000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000001', 'NC', 'recredential', 'psv_pending',
   now() - interval '5 days', now() + interval '1 day',
   '00000000-0000-0000-0000-000000000010')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- DME orders + NEMT trips (supplier/broker portals)
-- ============================================================
INSERT INTO dme_orders (id, patient_id, prescribing_provider_id, supplier_provider_id, payer_id,
                        state_code, hcpcs_code, description, quantity, rental_or_purchase,
                        total_charge_cents, prior_auth_id, cmn_complete, date_of_service, status,
                        delivery_address, created_by)
VALUES
  ('95000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000011',
   'NCMEDPAY', 'NC', 'E0601', 'CPAP device with humidifier', 1, 'rental',
   18500, '40000000-0000-0000-0000-000000000001', TRUE, CURRENT_DATE - 2, 'pending',
   '123 Main St, Raleigh NC 27601',
   '00000000-0000-0000-0000-000000000011'),
  ('95000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000011',
   'NCMEDPAY', 'NC', 'K0001', 'Standard wheelchair', 1, 'purchase',
   42000, NULL, TRUE, CURRENT_DATE - 10, 'delivered',
   '456 Oak Ave, Durham NC 27701',
   '00000000-0000-0000-0000-000000000011')
ON CONFLICT (id) DO NOTHING;

INSERT INTO nemt_trips (id, patient_id, broker_id, payer_id, state_code, trip_type,
                        pickup_address, pickup_latitude, pickup_longitude,
                        destination_address, destination_latitude, destination_longitude,
                        scheduled_pickup_at, status, miles_billed, total_charge_cents, created_by)
VALUES
  ('96000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000012',
   'NCMEDPAY', 'NC', 'one_way',
   '789 Pine Rd, Cary NC 27513', 35.7915, -78.7811,
   'Duke Primary Care, Durham NC 27705', 36.0012, -78.9382,
   now() + interval '1 day', 'scheduled', NULL, NULL,
   '00000000-0000-0000-0000-000000000012'),
  ('96000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000012',
   'NCMEDPAY', 'NC', 'round_trip',
   '123 Main St, Raleigh NC 27601', 35.7796, -78.6382,
   'WakeMed Outpatient, Raleigh NC 27610', 35.7865, -78.6250,
   now() - interval '2 days', 'completed', 18.4, 5520,
   '00000000-0000-0000-0000-000000000012')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Audit log (compliance stop — live feed on /compliance + /audit)
-- ============================================================
INSERT INTO audit_log_events (id, occurred_at, actor_user_id, actor_role, actor_state_code, resource, resource_id, action, outcome, context, producer) VALUES
  ('a0000000-0000-0000-0000-000000000001', now() - interval '12 minutes', '00000000-0000-0000-0000-000000000006', 'fraud_investigator', 'NC', 'patient', '10000000-0000-0000-0000-000000000001', 'read', 'success', '{"reason":"fraud case review","records":47}'::jsonb, 'patient-service'),
  ('a0000000-0000-0000-0000-000000000002', now() - interval '38 minutes', '00000000-0000-0000-0000-000000000003', 'individual_provider', 'NC', 'claim', '50000000-0000-0000-0000-000000000001', 'export', 'success', '{"format":"837P","count":1247}'::jsonb, 'claims-service'),
  ('a0000000-0000-0000-0000-000000000003', now() - interval '1 hour', '00000000-0000-0000-0000-000000000005', 'prior_auth_specialist', 'NC', 'pa_request', '40000000-0000-0000-0000-000000000001', 'update', 'success', '{"override":"criterion met","criterion_id":"demo-crit-1"}'::jsonb, 'prior-auth-service'),
  ('a0000000-0000-0000-0000-000000000004', now() - interval '3 hours', '00000000-0000-0000-0000-000000000007', 'denial_appeals_specialist', 'NC', 'auth', '00000000-0000-0000-0000-000000000007', 'login', 'denied', '{"attempts":5,"ip":"203.0.113.44"}'::jsonb, 'auth-service'),
  ('a0000000-0000-0000-0000-000000000005', now() - interval '4 hours', '00000000-0000-0000-0000-000000000009', 'compliance_officer', 'NC', 'audit_log_events', 'a0000000-0000-0000-0000-000000000001', 'read', 'success', '{"query":"phi export last 24h"}'::jsonb, 'audit-log-service'),
  ('a0000000-0000-0000-0000-000000000006', now() - interval '6 hours', '00000000-0000-0000-0000-000000000004', 'patient', 'NC', 'patient', '00000000-0000-0000-0000-000000000004', 'read', 'success', '{"surface":"crisis_plan"}'::jsonb, 'patient-service'),
  ('a0000000-0000-0000-0000-000000000007', now() - interval '8 hours', '00000000-0000-0000-0000-000000000006', 'fraud_investigator', 'NC', 'fraud_case', '60000000-0000-0000-0000-000000000002', 'update', 'success', '{"action":"escalate","target":"OCPI"}'::jsonb, 'fraud-engine-service'),
  ('a0000000-0000-0000-0000-000000000008', now() - interval '10 hours', '00000000-0000-0000-0000-000000000002', 'state_medicaid_agency', 'NC', 'report_job', '70000000-0000-0000-0000-000000000099', 'create', 'success', '{"kind":"perm","state":"NC"}'::jsonb, 'reporting-service'),
  ('a0000000-0000-0000-0000-000000000009', now() - interval '1 day', '00000000-0000-0000-0000-000000000001', 'platform_administrator', NULL, 'integration', 'nctracks', 'read', 'success', '{"mode":"stub"}'::jsonb, 'state-config-service'),
  ('a0000000-0000-0000-0000-000000000010', now() - interval '2 days', '00000000-0000-0000-0000-000000000003', 'individual_provider', 'NC', 'patient', '10000000-0000-0000-0000-000000000002', 'read', 'success', '{"encounter":"active"}'::jsonb, 'patient-service')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Summary print
SELECT '== Demo seed complete ==' AS status;
SELECT 'Users'    AS table_name, COUNT(*) AS rows FROM users
UNION ALL SELECT 'Patients',     COUNT(*) FROM patients
UNION ALL SELECT 'Providers',    COUNT(*) FROM providers
UNION ALL SELECT 'PA requests',  COUNT(*) FROM pa_requests
UNION ALL SELECT 'PA criteria',  COUNT(*) FROM pa_criterion_evaluations
UNION ALL SELECT 'Claims',       COUNT(*) FROM claims
UNION ALL SELECT 'Fraud cases',  COUNT(*) FROM fraud_cases
UNION ALL SELECT 'Denials',      COUNT(*) FROM denials
UNION ALL SELECT 'Encounters',   COUNT(*) FROM clinical_encounters
UNION ALL SELECT 'Cred apps',    COUNT(*) FROM credentialing_applications
UNION ALL SELECT 'DME orders',   COUNT(*) FROM dme_orders
UNION ALL SELECT 'NEMT trips',   COUNT(*) FROM nemt_trips
UNION ALL SELECT 'Audit events', COUNT(*) FROM audit_log_events
UNION ALL SELECT 'Daily rollups',COUNT(*) FROM daily_rollups;
