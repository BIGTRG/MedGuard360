# MedGuard360 — Master Build & Deploy Instructions
# Paste the prompt below directly into Claude Cowork

---

## COWORK MASTER PROMPT — COPY EVERYTHING BELOW THIS LINE

---

You are building and deploying MedGuard360 — a unified Medicaid and Medicare fraud prevention platform — on TRG TechLink's existing self-hosted server stack. Read CLAUDE.md completely before doing anything else. This is your full build and deployment instruction set.

OWNER: Sainté Robinson (Deon) — TRG TechLink
WORKSPACE: This folder — medguard360/
SERVER STACK: Fully self-hosted. No AWS, no Vercel, no Supabase, no external cloud unless explicitly approved.

---

## YOUR MISSION

Build every service, every AI engine, every frontend portal, and every infrastructure configuration in this workspace. Then deploy everything to the TRG TechLink self-hosted server stack. Do not stop until the full platform is running, all services are healthy, all PM2 processes are active, all Prometheus metrics are scraping, and all services are accessible through nginx.

Work through each phase below in order. Complete one phase fully before moving to the next. After each phase, report what was built, what is running, and what comes next.

---

## PHASE 1 — INFRASTRUCTURE FOUNDATION
Build and configure all infrastructure before any application code.

### 1.1 — Directory Structure
Create the following directory structure on the server:
```
/opt/medguard360/
├── services/           ← All Node.js microservices
├── ai-engines/         ← All Python FastAPI AI engines
├── frontend/           ← Next.js portals
├── mobile/             ← React Native / Expo app
├── infrastructure/     ← nginx, PM2, Prometheus configs
├── logs/               ← Centralized log directory
└── scripts/            ← Deployment and maintenance scripts
/opt/storage/
├── hot/                ← MinIO hot tier (30 days)
├── warm/               ← MinIO warm tier (12 months)
└── cold/               ← MinIO cold tier (7+ years)
/opt/credential-vault/  ← All secrets — never hardcoded
/opt/backups/           ← AES-256 encrypted backups
```

### 1.2 — Environment Variables & Secrets
Create /opt/credential-vault/.env.medguard360 with placeholders for:
- DATABASE_URL (PostgreSQL primary)
- DATABASE_REPLICA_1_URL
- DATABASE_REPLICA_2_URL
- REDIS_CLUSTER_URLS (comma-separated 6379,6380,6381)
- KAFKA_BROKERS
- MINIO_ENDPOINT
- MINIO_ACCESS_KEY
- MINIO_SECRET_KEY
- CLERK_SECRET_KEY
- CLERK_PUBLISHABLE_KEY
- JWT_SECRET
- SMTP_HOST / SMTP_USER / SMTP_PASS (Nodemailer)
- STRIPE_SECRET_KEY
- TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN
- LIVEKIT_API_KEY / LIVEKIT_API_SECRET
- BIOMETRIC_SDK_KEY
- STATE_CONFIG_ENCRYPTION_KEY
- AUDIT_LOG_ENCRYPTION_KEY
Load all secrets from this file in every service. Never use process.env directly — always load from /opt/credential-vault/.env.medguard360.

### 1.3 — PostgreSQL Schema
Create the master database migration file at:
/opt/medguard360/infrastructure/db/001_initial_schema.sql

Include these tables with full column definitions, indexes, and row-level security policies:
- users (id, email, role, state_code, clerk_id, created_at, updated_at)
- providers (id, npi, taxonomy_code, first_name, last_name, org_name, risk_category, enrollment_status, state_code, created_at, updated_at, created_by)
- provider_credentials (id, provider_id, credential_type, license_number, issuing_state, expiration_date, verification_status, verified_at, verified_by, created_at)
- patients (id, medicaid_id, first_name, last_name, dob, state_code, payer_id, mco_id, biometric_hash, crisis_plan_id, created_at, updated_at)
- encounters (id, provider_id, patient_id, service_date, location_lat, location_lng, audio_file_path, video_file_path, transcript, note_text, note_status, created_at)
- claims (id, encounter_id, provider_id, patient_id, payer_id, claim_type, service_date, total_amount, status, fraud_score, fraud_flags, submitted_at, paid_at, created_at)
- prior_authorizations (id, claim_id, provider_id, patient_id, payer_id, procedure_code, clinical_justification, ai_recommendation, status, approved_at, denied_at, denial_reason, created_at)
- crisis_plans (id, patient_id, triggers, deescalation_strategies, emergency_contacts, preferred_hospital, medications, allergies, dnr_status, updated_at, created_at)
- credentialing_events (id, provider_id, event_type, event_data, ai_extraction, human_reviewer_id, outcome, created_at)
- audit_logs (id, user_id, action, resource_type, resource_id, state_code, ip_address, device_id, phi_accessed, created_at)
- state_configurations (id, state_code, mmis_endpoint, mmis_credentials_vault_key, mco_list, telehealth_rules, pa_rules, timely_filing_days, updated_at)
- eligibility_checks (id, patient_id, provider_id, check_date, payer_type, enrollment_status, plan_name, mco_id, result, created_at)
- denials (id, claim_id, denial_code, denial_reason, ai_suggestion, appeal_status, resubmitted_at, resolved_at, created_at)
- hub_calls (id, state_code, caller_type, intent, resolution, duration_seconds, recording_path, transcript, fraud_flag, created_at)

Run the migration against PostgreSQL primary. Verify replication to both replicas.

### 1.4 — PgBouncer Connection Pooling
Install and configure PgBouncer:
- Listen on port 5435
- Pool mode: transaction
- Max client connections: 10000
- Default pool size: 50
- Point all application services to port 5435, not 5432 directly
Config file: /opt/medguard360/infrastructure/pgbouncer/pgbouncer.ini

### 1.5 — Kafka Topics
Create all required Kafka topics:
```
medguard.claims.submitted
medguard.claims.approved
medguard.claims.denied
medguard.fraud.flagged
medguard.fraud.cleared
medguard.credentialing.submitted
medguard.credentialing.approved
medguard.credentialing.expired
medguard.eligibility.checked
medguard.pa.requested
medguard.pa.approved
medguard.pa.denied
medguard.crisis.detected
medguard.audit.event
medguard.notification.send
medguard.hub.call.completed
```
Retention: 30 days. Replication factor: 3. Partitions: 12 per topic.

### 1.6 — MinIO Object Storage
Configure MinIO with three buckets:
- medguard-hot (lifecycle: delete after 30 days)
- medguard-warm (lifecycle: delete after 365 days)
- medguard-cold (lifecycle: no auto-delete — 7+ year retention)
Enable server-side AES-256 encryption on all buckets.
Create service account credentials and store in /opt/credential-vault/.env.medguard360.

---

## PHASE 2 — BUILD ALL 20 MICROSERVICES
Build each service as a complete, production-ready Node.js/Express.js TypeScript application.

For EVERY service, include:
- src/index.ts — main Express app
- src/routes/ — all route handlers
- src/middleware/ — auth, validation, logging, error handling
- src/models/ — TypeScript interfaces and Zod schemas
- src/services/ — business logic
- src/kafka/ — producer and consumer setup
- src/db/ — PostgreSQL queries using pg library (not ORM)
- tests/unit/ — Jest tests (80% minimum coverage)
- tests/e2e/ — Playwright tests
- ecosystem.config.js — PM2 config
- tsconfig.json — TypeScript strict mode
- .eslintrc.json — ESLint config
- .prettierrc — Prettier config
- package.json — all dependencies
- README.md — service documentation

Standard middleware every service must have:
- JWT verification (Clerk)
- Role-based access control
- Zod input validation
- Winston JSON logger → ELK
- Prometheus /metrics endpoint
- /health endpoint
- Rate limiting
- CORS (allow only medguard subdomains)
- Helmet security headers
- Audit log emission for all PHI access

### Build these services in this order:

**2.01 — audit-log-service (port 3019)**
Append-only event log. Accepts POST /log events from all services. Stores to PostgreSQL audit_logs table with AES-256 encryption on phi_accessed field. Exposes GET /logs with role-based filtering. NEVER allows updates or deletes. Indexes by user_id, resource_type, state_code, created_at.

**2.02 — auth-service (port 3001)**
Clerk webhook handler for user creation/updates. JWT validation middleware exported for other services. Role assignment and management. Biometric token validation endpoint. Session management via Redis. Rate limiting: 100 requests/minute per IP.

**2.03 — state-config-service (port 3018)**
Stores and serves per-state configuration. GET /config/:stateCode returns full state rules. POST /config/:stateCode (admin only) updates rules. Caches configs in Redis with 1-hour TTL. Encrypts MMIS credentials using STATE_CONFIG_ENCRYPTION_KEY. Exposes /config/:stateCode/mmis-endpoint, /config/:stateCode/mcos, /config/:stateCode/pa-rules, /config/:stateCode/telehealth-rules, /config/:stateCode/timely-filing.

**2.04 — notification-service (port 3017)**
Consumes medguard.notification.send Kafka topic. Email via Nodemailer. SMS via Twilio. Push notifications via Expo Push API. Alert types: credential_expiring_90, credential_expiring_60, credential_expiring_30, credential_expiring_14, credential_expiring_7, credential_expired, claim_approved, claim_denied, fraud_flagged, pa_approved, pa_denied, hub_callback. Templates for each alert type. Retry logic: 3 attempts with exponential backoff.

**2.05 — provider-service (port 3002)**
Full CRUD for provider profiles. NPI lookup via NPPES API (https://npiregistry.cms.hhs.gov/api). Taxonomy code validation. Provider search with filters: state, specialty, enrollment_status, risk_category. Enrollment status tracking across all states. GET /providers/:npi/states returns enrollment status per state. Emits to medguard.credentialing.submitted on new provider creation.

**2.06 — credentialing-service (port 3003)**
Core credentialing workflow engine.
- POST /credentialing/apply — accepts provider application with document uploads to MinIO
- Calls OCR AI engine (port 8003) for document extraction
- Calls PECOS API for exclusion check
- Calls OIG LEIE API (https://oig.hhs.gov/exclusions/exclusions_list.asp)
- Calls SAM.gov API for debarment check
- Queries all 50 state medical board APIs (configurable per state in state-config-service)
- Risk categorization: Limited/Moderate/High per 42 CFR Part 455
- Human review queue: GET /credentialing/queue returns pending items for specialists
- POST /credentialing/:id/approve — triggers enrollment push to state MMIS
- POST /credentialing/:id/deny — notifies provider with denial reason
- Credential expiration monitoring: cron job runs nightly, checks all active credentials
- Emits notifications at 90/60/30/14/7 days before expiration
- Auto-suspends billing access at expiration via provider-service
- Emits to medguard.credentialing.approved / medguard.credentialing.expired Kafka topics

**2.07 — patient-service (port 3004)**
Patient demographics management. Medicaid ID registration and lookup. Biometric hash storage (AES-256, never raw biometric data). Crisis plan CRUD — linked to crisis-service. Emergency profile endpoint: GET /patients/emergency/:biometricToken — returns read-only emergency profile, rate limited to emergency_responder role only, fully audited. GET /patients/:medicaidId/crisis-plan — returns crisis plan for authorized roles.

**2.08 — eligibility-service (port 3005)**
Real-time eligibility verification.
- POST /eligibility/check — accepts patient_id, provider_id, service_date, service_type
- Queries state MMIS eligibility API (endpoint from state-config-service)
- Checks Medicare eligibility via CMS API for dually eligible
- Checks commercial insurance if on file
- Determines coordination of benefits order
- Caches eligibility results in Redis with 15-minute TTL
- Stores every check in eligibility_checks table
- Returns: enrollment_status, plan_type, mco_id, coverage_dates, benefits_summary, payer_order
- Batch endpoint: POST /eligibility/batch — verifies up to 500 patients at once

**2.09 — clinical-doc-service (port 3007)**
Real-time clinical documentation engine.
- POST /encounters/start — creates encounter record, starts audio session tracking
- POST /encounters/:id/audio — accepts audio chunks, calls speech-to-text AI (port 8001)
- POST /encounters/:id/transcript — stores final transcript, calls clinical-nlp AI (port 8002)
- GET /encounters/:id/suggestions — returns AI-suggested ICD-10, CPT codes, modifiers
- POST /encounters/:id/note — saves provider-approved note with digital signature
- POST /encounters/:id/finalize — locks note, triggers claim generation in claims-service
- Crisis detection: every note processed by crisis-detector AI (port 8009)
- Documentation completeness scoring: returns score and missing elements before finalization
- GPS verification: stores lat/lng from mobile app on encounter record
- Video storage: accepts video chunks, stores to MinIO medguard-hot bucket

**2.10 — claims-service (port 3008)**
EDI claim generation and submission engine.
- Consumes encounter finalization events from clinical-doc-service
- Generates EDI 837P for professional claims
- Generates EDI 837I for institutional/home health claims
- Generates NCPDP D.0 for pharmacy claims
- Generates HCPCS-coded claims for DME and NEMT
- Pre-submission eligibility check via eligibility-service
- Pre-submission PA status check via prior-auth-service
- Claim scrubbing: validates codes, modifiers, required fields
- Sends to fraud-engine-service for risk scoring before submission
- Submits to state MMIS via EDI (endpoint from state-config-service)
- Processes incoming EDI 835 remittance advice
- Timely filing tracking: alerts when approaching payer deadlines
- Home health NOA generation and submission within 5-day window
- School-based LEA claim routing
- Emits to medguard.claims.submitted / approved / denied Kafka topics

**2.11 — fraud-engine-service (port 3009)**
Fraud detection orchestration.
- POST /fraud/score — accepts claim data, calls fraud-detection AI (port 8004), returns score + flags
- Score routing: <30 auto-approve, 30-70 human queue, >70 hold
- POST /fraud/network-analysis — triggers GNN analysis (port 8005) for provider network
- GET /fraud/queue — returns high-risk claims for human investigators
- POST /fraud/queue/:claimId/approve — investigator approves with notes
- POST /fraud/queue/:claimId/deny — investigator denies, triggers denial-service
- POST /fraud/queue/:claimId/refer — refers to state investigators
- GPS fraud check: validates provider location matches billed service location
- Timestamp fraud check: validates service time matches documentation time
- Duplicate detection: checks all payers for same patient/service/date
- Peer comparison: queries reporting-service for provider peer benchmarks
- Emits to medguard.fraud.flagged / medguard.fraud.cleared Kafka topics

**2.12 — prior-auth-service (port 3006)**
Prior authorization + clinical decision engine.
- POST /pa/check — accepts patient_id, procedure_code, payer_id — returns if PA required
- POST /pa/request — generates PA request from clinical documentation
- Calls pa-nlp-matcher AI (port 8006) to match clinical facts against payer criteria
- Returns: ai_recommendation (approve/deny/needs_more_info), matched_criteria, missing_criteria, confidence_score
- POST /pa/submit — submits PA request to payer API (from state-config-service)
- PA timeline tracking: standard 7-day, expedited 72-hour, drug 24-hour
- GET /pa/status/:paId — real-time PA status
- POST /pa/:paId/appeal — triggers appeal with additional clinical evidence
- Symptom-to-procedure engine: POST /pa/recommend — accepts symptom codes, returns recommended procedures with PA status for each
- GET /pa/queue — human PA specialist review queue
- Compliant with CMS Interoperability Final Rule FHIR R4 PA API

**2.13 — denial-service (port 3010)**
- Consumes medguard.claims.denied Kafka topic
- Categorizes denial by reason code: eligibility, authorization, documentation, coding, timely_filing
- Calls denial-predictor AI (port 8007) for correction suggestion and appeal draft
- GET /denials/queue — appeals specialist review queue
- POST /denials/:id/approve-appeal — approves AI-drafted appeal, resubmits claim
- POST /denials/:id/override — specialist overrides AI suggestion with custom appeal
- Appeal deadline tracking: alerts at 30/14/7 days before deadline
- Revenue recovery tracking by provider, payer, state

**2.14 — pharmacy-service (port 3011)**
- NCPDP D.0 claim generation and submission
- Prescription validation: every prescription linked to clinical encounter in clinical-doc-service
- Controlled substance additional verification workflow
- Formulary management per state/payer
- Medication therapy management (MTM) billing
- Drug prior authorization via prior-auth-service
- NDC code validation

**2.15 — dme-service (port 3012)**
- DMEPOS accreditation verification for suppliers
- Face-to-face physician order validation (linked to clinical encounter)
- Delivery confirmation with patient biometric signature before claim submission
- HCPCS code generation for equipment categories
- Warranty and maintenance tracking

**2.16 — nemt-service (port 3013)**
- Trip scheduling and driver assignment
- Real-time GPS tracking via mobile app location stream
- Route verification: actual GPS route vs. billed mileage
- Driver credentialing via credentialing-service
- Trip completion confirmation with patient biometric
- HCPCS A-code mileage claim generation
- Integration with clinical-doc-service to verify trip matches appointment

**2.17 — crisis-service (port 3014)**
- Crisis plan CRUD linked to patient-service
- Crisis plan fields: triggers, deescalation_strategies, emergency_contacts, preferred_hospital, medications, allergies, dnr_status
- Consumes crisis detection events from clinical-doc-service
- Emergency responder API: GET /crisis/emergency/:biometricToken — sub-3-second response, fully audited
- 911 CAD integration endpoint: POST /crisis/dispatch-push — pushes patient record to dispatch
- Post-crisis follow-up: auto-generate appointment request, notify primary care provider
- Supervisor notification: POST /crisis/supervisor-alert — immediate alert on high-severity detection
- 42 CFR Part 2 compliance for substance use disorder records

**2.18 — hub-service (port 3015)**
- Twilio Voice SDK integration for 1-800 call routing
- AI chatbot routing: accepts call transcript, calls clinical-nlp AI for intent detection
- Intent categories: claim_status, eligibility_check, transportation_request, pa_status, credentialing_status, crisis_support, billing_dispute, general
- Tier-1 (AI): claim_status, eligibility_check, pa_status — auto-resolved via platform APIs
- Tier-2 (human): billing_dispute, credentialing_status — queued to human agents
- Tier-3 (crisis): crisis_support — immediately routed to crisis specialists
- Call recording stored to MinIO with state_code prefix
- Every call transcribed via speech-to-text AI (port 8001)
- Fraud flag: calls asking about documentation manipulation flagged to fraud-engine-service
- Dashboard: GET /hub/dashboard — call volume, queue depth, resolution rate by state

**2.19 — reporting-service (port 3016)**
- PERM audit data generation in CMS-required XML format
- Provider performance dashboards: claim volumes, approval rates, denial rates, fraud flags
- State dashboards: all metrics by state for state agency portal
- MCO dashboards: MLR, PA approval rates, network adequacy
- Fraud prevention reports: claims stopped, dollars saved, monthly
- Peer comparison data for fraud-engine-service
- Custom report builder: POST /reports/custom — flexible query builder with role-based data access
- Scheduled reports: GET /reports/scheduled — runs on cron, emails to state contacts
- HIPAA audit report: GET /reports/hipaa-audit — full PHI access log export

**2.20 — hie-service (port 3020)**
- FHIR R4 compliant data exchange
- Patient consent management for data sharing
- Referral workflows: provider sends referral, receiving provider gets clinical history
- State HIE integration endpoints per state (from state-config-service)
- SMART on FHIR authorization
- Resource types: Patient, Encounter, Condition, MedicationRequest, Observation, DiagnosticReport, ServiceRequest

---

## PHASE 3 — BUILD ALL 10 AI ENGINES
Build each as a complete Python 3.10+ FastAPI application.

For EVERY AI engine, include:
- main.py — FastAPI app
- models/ — Pydantic input/output schemas
- engine/ — core ML/AI logic
- training/ — model training scripts
- tests/ — pytest tests (80% minimum coverage)
- requirements.txt — all dependencies
- Dockerfile — containerized for GPU isolation
- README.md — model documentation
- /health and /metrics endpoints (prometheus_fastapi_instrumentator)

### Build these AI engines in this order:

**3.01 — speech-to-text (port 8001)**
Model: OpenAI Whisper (base or medium, self-hosted)
Input: audio stream chunks (WAV/MP3/M4A)
Output: transcript text with speaker diarization, timestamps per sentence
Streaming mode: returns partial transcripts every 2 seconds
Batch mode: accepts full audio file, returns complete transcript
Language: English primary, Spanish secondary
Noise cancellation preprocessing before inference

**3.02 — clinical-nlp (port 8002)**
Models: scispaCy en_core_sci_lg + MedSpaCy + fine-tuned LLM
Input: clinical note text or transcript
Output:
- extracted_entities: diagnoses, symptoms, medications, procedures, vitals
- suggested_icd10_codes: list with confidence scores
- suggested_cpt_codes: list with confidence scores
- suggested_modifiers: list with justification
- completeness_score: 0-100 based on required elements for diagnosis
- missing_elements: list of what documentation is incomplete
- intent_category: for hub-service routing
Plain-language explanation for every suggestion

**3.03 — ocr-engine (port 8003)**
Models: Tesseract OCR 4.0 + CNN document classifier
Input: document image or PDF (base64 encoded)
Output:
- document_type: diploma, license, certification, insurance, dea_registration
- extracted_fields: license_number, expiration_date, issuing_authority, name, state
- confidence_scores per field
- raw_text: full OCR output
- anomaly_flags: missing fields, suspicious dates, inconsistencies
Preprocessing: image deskewing, contrast enhancement, noise reduction

**3.04 — fraud-detection (port 8004)**
Models: Isolation Forest (unsupervised) + XGBoost classifier
Features: billing_frequency, avg_claim_amount, code_diversity, geographic_consistency, peer_deviation, documentation_completeness, temporal_patterns, patient_concentration
Input: claim features JSON
Output:
- fraud_score: 0-100
- risk_level: low/medium/high
- top_contributing_factors: list of top 3 reasons in plain English
- peer_comparison: how provider compares to specialty peers
- anomaly_flags: specific anomalies detected
Retrain monthly on new labeled fraud data

**3.05 — fraud-ring-gnn (port 8005)**
Model: PyTorch Geometric Graph Neural Network
Input: provider-patient-claim network graph (nodes and edges)
Output:
- suspicious_clusters: groups of providers/patients with unusual relationships
- risk_scores per cluster
- evidence: specific billing patterns that triggered detection
- visualization_data: graph structure for investigator review
Runs as nightly batch job. Results stored to PostgreSQL for fraud-engine-service.

**3.06 — pa-nlp-matcher (port 8006)**
Model: BERT-based semantic similarity (BioBERT fine-tuned on clinical criteria)
Input: clinical_documentation text + payer_criteria text
Output:
- match_score: 0-100
- recommendation: approve/deny/needs_more_info
- matched_criteria: list of criteria met with evidence quotes
- missing_criteria: list of criteria not met
- additional_documentation_needed: specific items provider must add
- confidence: overall confidence in recommendation
Also handles: symptom-to-procedure recommendation
Input: symptom_codes list
Output: recommended_procedures with clinical rationale and PA status per payer

**3.07 — denial-predictor (port 8007)**
Models: Gradient Boosted Trees (denial prediction) + GPT-style text generation (appeal drafting)
Input: claim_data + denial_code + payer_rules
Output:
- denial_probability: 0-100 for similar claims
- root_cause: plain English explanation
- corrective_actions: ordered list of specific fixes
- appeal_draft: complete appeal letter with clinical evidence
- resubmission_code_suggestions: corrected codes if coding error

**3.08 — provider-monitor (port 8008)**
Automated daily monitoring for all active providers.
Checks per provider per day:
- OIG LEIE exclusion status
- SAM.gov debarment status
- State medical board license status (per enrolled state)
- DEA registration status
- Malpractice insurance expiration
- NPI revalidation status
Output: change_alerts list with severity: info/warning/critical
Critical alerts (exclusion, license revocation) → immediate billing suspension via provider-service
Warning alerts → notification-service for credential expiration sequence
Runs as scheduled job at 2:00 AM daily

**3.09 — crisis-detector (port 8009)**
Model: Fine-tuned text classifier (BERT base, trained on behavioral health crisis language)
Input: clinical note text or call transcript
Output:
- crisis_detected: boolean
- severity: none/low/medium/high
- crisis_type: suicidal_ideation/homicidal_ideation/psychosis/substance_crisis/medical_emergency
- confidence: 0-100
- trigger_phrases: specific text that triggered detection
- recommended_action: monitor/alert_supervisor/emergency_response
Inference time target: under 500ms

**3.10 — eligibility-intel (port 8010)**
Model: Rules-based engine + Random Forest classifier
Input: patient demographics, state, income_indicators, prior_coverage_history
Output:
- predicted_eligibility_status: active/inactive/pending
- predicted_plan_type: ffs/managed_care
- predicted_mco: most likely MCO assignment
- benefits_summary: covered service categories
- confidence: 0-100
Used for pre-visit eligibility prediction before real-time verification

---

## PHASE 4 — BUILD ALL 20 FRONTEND PORTALS
Build the Next.js 14 portal application with role-based routing.

App structure:
```
frontend/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── patient/
│   ├── provider/
│   ├── facility/
│   ├── pharmacy/
│   ├── dmepos/
│   ├── nemt/
│   ├── mco/
│   ├── state-agency/
│   ├── federal-cms/
│   ├── credentialing/
│   ├── prior-auth/
│   ├── billing/
│   ├── compliance/
│   ├── fraud/
│   ├── denial/
│   ├── school/
│   ├── hie/
│   ├── emergency/
│   ├── qa/
│   └── admin/
├── components/
│   ├── ui/          ← shadcn/ui components
│   ├── charts/      ← recharts dashboards
│   ├── forms/       ← all form components with validation
│   ├── tables/      ← data tables with sorting/filtering
│   └── shared/      ← shared components
├── lib/
│   ├── api/         ← API client for each service
│   ├── auth/        ← Clerk authentication
│   ├── types/       ← shared TypeScript types
│   └── utils/       ← shared utilities
└── public/
```

Each portal must include:
- Role-based middleware redirect on login
- Real-time data via Socket.IO
- Responsive design (works on all screen sizes)
- WCAG 2.1 AA accessibility compliance
- Loading states, error boundaries, empty states for all data
- Proper TypeScript typing throughout

Build each portal with full production UI:

**Patient Portal** — eligibility status, enrolled providers, claims history, upcoming appointments, medications, crisis plan viewer, transportation request, hub contact, benefits summary

**Provider Portal** — daily schedule, start visit (audio/video/GPS), active encounter documentation, AI code suggestions, claim submission, payment tracking, credential status, PA request submission, credential expiration alerts

**Facility Portal** — staff roster, multi-provider credentialing dashboard, facility-level billing, service utilization, compliance reporting, network management

**State Agency Portal** — all providers in state, all claims, all fraud flags, credentialing pipeline, PERM audit data, program integrity reports, custom report builder, MCO performance

**MCO Portal** — enrolled members, contracted providers, PA queue, capitation tracking, MLR dashboard, claim adjudication

**Emergency Responder Portal** — biometric scan input, instant patient emergency profile display (< 3 seconds), crisis plan viewer, read-only access only

**Fraud Investigator Portal** — high-risk claim queue, full claim detail with fraud flags explained, provider billing history, peer comparison charts, approve/deny/refer actions

**Credentialing Specialist Portal** — application queue, AI-extracted data for review, primary source verification results, approve/deny actions, multi-state enrollment tracking

Build remaining 12 portals with equivalent depth.

---

## PHASE 5 — BUILD MOBILE APP
Build the React Native / Expo cross-platform app.

```
mobile/
├── app/
│   ├── (auth)/
│   ├── (provider)/
│   │   ├── dashboard
│   │   ├── patients
│   │   ├── visit/          ← core encounter flow
│   │   │   ├── start
│   │   │   ├── document    ← audio/video/GPS active
│   │   │   ├── review      ← AI suggestions review
│   │   │   └── submit
│   │   ├── claims
│   │   └── credentials
│   ├── (patient)/
│   ├── (nemt)/
│   └── (emergency)/
├── components/
├── services/               ← API clients
├── hooks/                  ← custom hooks
└── utils/
```

Core mobile features:
- Offline-first: SQLite local cache, sync when connected
- Background audio recording with automatic upload
- GPS tracking with geofencing for visit start/end
- Biometric authentication (TouchID/FaceID/Windows Hello)
- Camera for DME delivery photos and document scanning
- Push notifications via Expo Push
- AES-256 encryption of all locally stored data
- Intelligent delta sync — only transmit changes
- Works on: iOS 16+, Android 12+, Windows 10+, macOS 12+, Linux Ubuntu 22+

---

## PHASE 6 — INFRASTRUCTURE CONFIGURATION

### 6.1 — PM2 Ecosystem Config
Create /opt/medguard360/infrastructure/pm2/ecosystem.config.js
Configure all 20 Node.js services with:
- cluster mode (max CPUs)
- auto-restart on crash
- log paths to /opt/medguard360/logs/
- environment variables loaded from /opt/credential-vault/.env.medguard360
- max memory restart: 1GB per service
- watch: false (production mode)

### 6.2 — nginx Configuration
Create /opt/medguard360/infrastructure/nginx/medguard360.conf
Configure:
- TLS 1.3 with HSTS
- Multi-portal routing by subdomain:
  - patient.medguard360.com → frontend patient portal
  - provider.medguard360.com → frontend provider portal
  - admin.medguard360.com → frontend admin portal
  - api.medguard360.com → API gateway routing to services
  - [state].hub.medguard360.com → hub-service per state
- Rate limiting: 100 req/min per IP for API, 1000 req/min for frontend
- Security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options
- Gzip compression
- Upstream blocks for all 20 services with health checks
- WebSocket support for Socket.IO

### 6.3 — Prometheus Scrape Config
Create /opt/medguard360/infrastructure/prometheus/medguard360.yml
Add scrape targets for all 20 Node.js services (ports 3001-3020) and all 10 AI engines (ports 8001-8010).
Scrape interval: 15s
Alert rules file: /opt/medguard360/infrastructure/prometheus/alerts.yml

### 6.4 — Alert Rules
Create alerts for every service:
- Service down > 30 seconds → CRITICAL
- Error rate > 5% → WARNING
- Response time p95 > 2 seconds → WARNING
- Fraud flag queue depth > 100 → WARNING
- Credential expiration queue depth > 50 → WARNING
- Database connection pool exhaustion → CRITICAL
- MinIO storage > 80% capacity → WARNING
- Kafka consumer lag > 10000 messages → WARNING
All alerts route to: info@geniuseye.ai

### 6.5 — Logstash Pipeline
Create /opt/medguard360/infrastructure/logstash/medguard360.conf
Ingests structured JSON logs from all services.
Parses: service_name, level, message, user_id, state_code, phi_accessed, timestamp.
Routes phi_accessed=true logs to separate HIPAA audit index.
Retention: 90 days standard, 7 years HIPAA audit.

### 6.6 — Backup Script
Create /opt/medguard360/infrastructure/scripts/backup.sh
Daily full backup of PostgreSQL primary, all MinIO buckets metadata, all config files.
AES-256 encrypt backup archives using BACKUP_ENCRYPTION_KEY from credential-vault.
Store to /opt/backups/ with timestamp prefix.
Retention: 90 days full, 365 days incremental.
Schedule via cron: 2:30 AM daily.

---

## PHASE 7 — DEPLOYMENT

### 7.1 — Install All Dependencies
```bash
# Node.js services
cd /opt/medguard360/services
for service in */; do
  cd $service && npm install && npm run build && cd ..
done

# Python AI engines
cd /opt/medguard360/ai-engines
for engine in */; do
  cd $engine && pip install --break-system-packages -r requirements.txt && cd ..
done

# Frontend
cd /opt/medguard360/frontend && npm install && npm run build

# Mobile
cd /opt/medguard360/mobile && npm install && npx expo export
```

### 7.2 — Database Migration
```bash
psql -h localhost -p 5432 -U medguard -d medguard360 \
  -f /opt/medguard360/infrastructure/db/001_initial_schema.sql
```

### 7.3 — Start All Services with PM2
```bash
cd /opt/medguard360
pm2 start infrastructure/pm2/ecosystem.config.js
pm2 save
pm2 startup
```

### 7.4 — Start AI Engines
```bash
cd /opt/medguard360/ai-engines
for engine in speech-to-text clinical-nlp ocr-engine fraud-detection \
  fraud-ring-gnn pa-nlp-matcher denial-predictor provider-monitor \
  crisis-detector eligibility-intel; do
  cd $engine
  uvicorn main:app --host 0.0.0.0 --port $(cat .port) --workers 4 &
  cd ..
done
```

### 7.5 — Configure nginx
```bash
cp /opt/medguard360/infrastructure/nginx/medguard360.conf /etc/nginx/sites-available/
ln -s /etc/nginx/sites-available/medguard360.conf /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 7.6 — Health Check All Services
After deployment, verify every service is healthy:
```bash
for port in 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 \
            3011 3012 3013 3014 3015 3016 3017 3018 3019 3020; do
  curl -s http://localhost:$port/health | jq .status
done

for port in 8001 8002 8003 8004 8005 8006 8007 8008 8009 8010; do
  curl -s http://localhost:$port/health | jq .status
done
```

### 7.7 — Verify Prometheus Scraping
```bash
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets | length'
# Should return 30 (20 services + 10 AI engines)
```

### 7.8 — Verify Kafka Topics
```bash
kafka-topics.sh --bootstrap-server localhost:9092 --list
# Should show all 17 medguard.* topics
```

### 7.9 — Run Full Test Suite
```bash
cd /opt/medguard360
# Unit tests all services
for service in services/*/; do
  cd $service && npm test && cd ../..
done
# E2E tests
npx playwright test
```

---

## COMPLETION CHECKLIST

When everything is deployed, verify:

- [ ] All 20 Node.js services return healthy on /health
- [ ] All 10 Python AI engines return healthy on /health
- [ ] All 30 Prometheus scrape targets showing UP
- [ ] All 17 Kafka topics created and available
- [ ] PostgreSQL primary has all tables, replicas synced
- [ ] PgBouncer accepting connections on port 5435
- [ ] MinIO 3 buckets created with AES-256 encryption enabled
- [ ] nginx serving all subdomains with TLS 1.3
- [ ] PM2 showing all 20 services as online
- [ ] Grafana dashboards showing metrics from all services
- [ ] AlertManager configured with all 41+ alert rules
- [ ] ELK Stack receiving structured JSON logs from all services
- [ ] Backup script scheduled in cron at 2:30 AM
- [ ] Provider credentialing workflow end-to-end test passes
- [ ] Claim submission workflow end-to-end test passes
- [ ] Fraud detection scoring working on test claim
- [ ] Emergency responder biometric lookup returning in <3 seconds
- [ ] Mobile app builds successfully for iOS and Android
- [ ] Frontend portals accessible and authenticating via Clerk

---

## IF YOU GET STUCK

If any step fails, do not skip it. Debug it completely.
Common issues and how to handle them:

- Port conflict: check `lsof -i :[port]` and stop conflicting process
- PostgreSQL connection refused: check `systemctl status postgresql`
- Redis connection refused: check `redis-cli -p 6379 ping`
- Kafka not available: check `systemctl status kafka`
- MinIO not accessible: check `systemctl status minio`
- PM2 service crashing: check `pm2 logs [service-name] --lines 50`
- nginx config error: check `nginx -t` for syntax errors
- Python import error: check `pip install --break-system-packages -r requirements.txt`
- TypeScript compile error: check `npm run build` output, fix all errors

Report to Deon after each phase with:
1. What was built
2. What is running
3. Any issues encountered and how they were resolved
4. What comes next

---

*MedGuard360 — TRG TechLink — Sainté Robinson (Deon) — 2026*
*Build it. Deploy it. Make it real.*
