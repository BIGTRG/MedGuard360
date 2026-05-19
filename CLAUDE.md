# CLAUDE.md — MedGuard360 Master Context

This file is read automatically by Claude Code when you open this workspace.
It gives Claude Code full context to build any part of MedGuard360 intelligently.

---

## Project Identity

**Project:** MedGuard360
**Company:** TRG TechLink
**Owner:** Sainté Robinson (Deon)
**Workspace:** /Users/ginger/.openclaw/workspace/
**Stack Inventory:** SERVER_STACK_INVENTORY.md (read before building anything)

MedGuard360 is a unified, AI-assisted, human-verified Medicaid and Medicare
fraud prevention and billing platform serving all 50 states. It is the first
platform that prevents fraud BEFORE it happens rather than auditing after payment.

---

## Core Platform Modules

1. Real-Time Clinical Documentation — Voice/video, NLP, AI code suggestion
2. Biometric Identity — Facial recognition, thumbprint, emergency responder access
3. Provider Credentialing — 50-state unified, 3–5 day turnaround
4. AI-Assisted Claim Generation — 837P, 837I, NCPDP, HCPCS
5. Preventive Fraud Detection — GPS, timestamp, doc cross-validation pre-submission
6. Prior Authorization + Clinical Decision Engine — Real-time symptom-to-procedure AI
7. Denial Management & Appeals — AI-drafted, human-approved
8. Crisis Plan & Emergency Response — Biometric scan, 3-second responder access
9. Real-Time Eligibility Verification — All 50 states
10. Statewide One-Call Hub — 1-800 per state, AI + human
11. Compliance, Reporting & Analytics — PERM, fraud reports, dashboards
12. AI Governance Framework — AI assists, humans decide

---

## Technology Stack — STRICT RULES, NO EXCEPTIONS

### Backend
- Runtime: Node.js v25.9.0 ONLY
- Framework: Express.js ONLY
- Process: PM2 — ecosystem.config.js REQUIRED for every new service
- Language: TypeScript strict mode everywhere

### Frontend
- Framework: Next.js 14 ONLY
- Language: TypeScript
- Styling: Tailwind CSS + shadcn/ui + Heroicons
- State: React hooks (no Redux unless pre-existing)

### Mobile
- Framework: React Native / Expo ONLY
- Target: iOS 16+, Android 12+, Windows 10+, macOS 12+, Linux Ubuntu 22+
- Architecture: Offline-first, SQLite local cache, intelligent sync

### AI / Machine Learning
- Runtime: Python 3.10+ ONLY
- API Framework: FastAPI ONLY
- Called by: Node services via internal REST API
- Libraries: PyTorch, scikit-learn, XGBoost, Hugging Face Transformers,
             scispaCy, MedSpaCy, Tesseract, Whisper

### Database
- Primary: PostgreSQL — ports 5432, 5433, 5434 (primary + 2 replicas)
- Cache: Redis — ports 6379, 6380, 6381 (3-node cluster)
- Add PgBouncer for connection pooling on high-traffic services
- NEVER use MongoDB, SQLite (except mobile local cache), or MySQL for new services

### Storage
- Object Storage: MinIO ONLY (self-hosted S3-compatible)
- Path: /opt/storage/
- Tiered: hot (30 days), warm (12 months), cold (7+ years)
- NEVER store PHI on local disk outside MinIO

### Message Queue
- Platform: Apache Kafka ONLY
- Use for: all inter-service events (claims, credentialing, fraud flags, alerts)
- NEVER call services directly for state changes — emit Kafka events

### Authentication
- Platform: Clerk + JWT ONLY
- NEVER build custom auth
- Biometric: vendor SDK (Suprema / NEC) integrated with Clerk

### Real-Time
- Platform: Socket.IO ONLY
- Use for: live documentation, claim status, fraud alerts, PA decisions

### Video
- Platform: LiveKit ONLY
- Use for: clinical encounter video capture, telehealth

### Reverse Proxy
- Platform: nginx ONLY
- Config: TLS 1.3, rate limiting, security headers, multi-portal routing

### Monitoring
- Metrics: Prometheus — EVERY new service needs /metrics endpoint
- Dashboards: Grafana
- Alerts: AlertManager → info@geniuseye.ai
- Scrape interval: 15 seconds

### Logging
- Platform: ELK Stack (Elasticsearch + Logstash + Kibana)
- Format: Structured JSON ONLY — use winston logger in Node services
- HIPAA: every PHI access logged to audit-log-service

### Security
- Network: iptables (65 rules baseline) + fail2ban
- Encryption at rest: AES-256 MANDATORY for all PHI
- Encryption in transit: TLS 1.3 MANDATORY
- Secrets: /opt/credential-vault/ ONLY — NEVER in process.env or .env files
- Row-level security on ALL PostgreSQL tables containing PHI

### Dev Tooling
- Version control: Git
- Package manager: npm
- Linting: ESLint — zero warnings, zero errors before merge
- Formatting: Prettier — enforced on all files
- Testing: Jest (unit, 80% minimum coverage) + Playwright (e2e)

---

## Microservices (20 Services)

Each is a separate Node.js/Express.js service managed by PM2:

| Service | Port | Purpose |
|---------|------|---------|
| auth-service | 3001 | JWT, Clerk, biometric tokens, RBAC |
| provider-service | 3002 | Provider profiles, NPI, taxonomy |
| credentialing-service | 3003 | 50-state credentialing, PSV, PECOS/LEIE |
| patient-service | 3004 | Patient records, Medicaid ID, crisis plans |
| eligibility-service | 3005 | Real-time Medicaid/Medicare/commercial eligibility |
| prior-auth-service | 3006 | PA workflows, clinical decision AI, payer APIs |
| clinical-doc-service | 3007 | Audio transcription, NLP notes, coding suggestion |
| claims-service | 3008 | EDI 837P/I/835, NCPDP, HCPCS generation |
| fraud-engine-service | 3009 | ML fraud scoring, GNN ring detection |
| denial-service | 3010 | Denial capture, appeals, resubmission |
| pharmacy-service | 3011 | NCPDP D.0, formulary, MTM |
| dme-service | 3012 | DMEPOS validation, HCPCS billing |
| nemt-service | 3013 | GPS trip tracking, mileage billing |
| crisis-service | 3014 | Crisis plans, 911 integration, responder API |
| hub-service | 3015 | 1-800 statewide hub, AI chatbot, call routing |
| reporting-service | 3016 | PERM data, compliance reports, dashboards |
| notification-service | 3017 | Email/SMS/push alerts |
| state-config-service | 3018 | Per-state rules engine, MMIS connections |
| audit-log-service | 3019 | Append-only HIPAA event log |
| hie-service | 3020 | FHIR R4 HIE integration, referrals |

---

## AI Engines (10 Engines — Python FastAPI)

Each runs as a separate FastAPI service, called by Node services via internal REST:

| Engine | Port | Model | Purpose |
|--------|------|-------|---------|
| speech-to-text | 8001 | Whisper | Real-time clinical audio transcription |
| clinical-nlp | 8002 | LLM + scispaCy/MedSpaCy | Note analysis, ICD/CPT suggestion |
| ocr-engine | 8003 | Tesseract + CNN classifier | Credential document digitization |
| fraud-detection | 8004 | Isolation Forest + XGBoost | Claim risk scoring 1–100 |
| fraud-ring-gnn | 8005 | PyTorch Geometric GNN | Fraud ring network analysis |
| pa-nlp-matcher | 8006 | BERT semantic similarity | PA criteria vs. clinical doc matching |
| denial-predictor | 8007 | GBT + GPT-style | Denial prediction + appeal drafting |
| provider-monitor | 8008 | Rules + anomaly detection | Monthly credential monitoring |
| crisis-detector | 8009 | Fine-tuned text classifier | Crisis language detection in notes |
| eligibility-intel | 8010 | Rules + ML | Eligibility prediction + benefits |

---

## Prior Authorization Clinical Decision Engine

This is a core innovation. The PA engine does NOT just submit forms.
It is a clinical intelligence engine that:

1. Reads patient symptoms, diagnosis codes, medication history from clinical-doc-service
2. Reads the procedure or medication being ordered (CPT/HCPCS/NDC code)
3. Queries state-config-service for payer-specific coverage criteria
4. Cross-references CMS coverage determinations + clinical society guidelines
5. Compares documented clinical facts against approval criteria via BERT NLP
6. Returns instant determination: Approve / Deny / Needs More Info
7. Provides plain-language explanation of exactly which criteria are met or missing
8. For symptom-based requests: recommends appropriate procedures + their PA status

PA Timelines enforced automatically:
- Standard: 7 days
- Expedited/Urgent: 72 hours
- Drug PA: 24 hours
- CMS Interoperability API: compliant with mandate effective January 2027

---

## Compliance Rules — NON-NEGOTIABLE

- HIPAA: 45 CFR Parts 160 and 164 — minimum necessary, PHI encryption, audit logs
- Provider Screening: 42 CFR Part 455 — risk-based, PECOS, LEIE, SAM.gov
- Utilization: 42 CFR Part 456 — medical necessity documentation required
- SUD Records: 42 CFR Part 2 — separate consent for data sharing
- Interoperability: CMS Final Rule — FHIR R4 APIs, PA API by Jan 2027
- EDI: 45 CFR Part 162 — 837P, 837I, 835, 270/271, 276/277, NCPDP D.0
- School-Based: 34 CFR 300.154 — LEA interagency agreements
- MITA: Medicaid Information Technology Architecture alignment

---

## Coding Standards — ENFORCED

### Every New Node.js Service Must Include:
1. `ecosystem.config.js` PM2 config entry
2. Express.js service with `/health` and `/metrics` endpoints
3. Winston structured JSON logger → ELK
4. JWT middleware on ALL routes
5. Zod input validation on ALL API inputs
6. PgBouncer-compatible PostgreSQL connection pool
7. Kafka producer/consumer where state changes occur
8. Emit to audit-log-service for every PHI access
9. PostgreSQL schema migration file
10. TypeScript types file (`types.ts`)
11. Jest test file (`*.test.ts`) — 80% minimum coverage
12. Playwright e2e test file
13. `README.md` for the service

### Every New Python AI Engine Must Include:
1. FastAPI app with `/health` and `/metrics` endpoints
2. Prometheus metrics via `prometheus_fastapi_instrumentator`
3. Pydantic models for all inputs and outputs
4. Structured JSON logging
5. Model versioning — never overwrite trained models
6. Plain-language explanation field in every prediction output
7. Human override logging endpoint
8. pytest test file — 80% minimum coverage
9. `requirements.txt`
10. `README.md`

### AI Governance Rule (ABSOLUTE):
- AI NEVER makes autonomous decisions on: credentialing approvals, fraud determinations,
  PA approvals/denials, claim denials, or any patient-facing outcome
- Every AI output routes to human approval queue for consequential decisions
- Every AI decision includes plain-language explanation
- Human overrides logged and used to retrain models quarterly
- Low-risk (<30 fraud score) items only may auto-process

---

## Service Communication Pattern

```
Provider App → claims-service → Kafka topic: claim.submitted
                              → fraud-engine-service (subscribes)
                              → eligibility-service (subscribes)
                              → audit-log-service (subscribes)
                              → prior-auth-service (subscribes if PA required)
                              → notification-service (subscribes for status updates)
```

NEVER make synchronous direct HTTP calls between services for state changes.
Use Kafka events. Use synchronous HTTP only for real-time data lookups
(eligibility checks, provider profile lookups, state config reads).

---

## Database Schema Convention

Every table containing PHI must have:
- `id` UUID primary key
- `created_at` TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
- `created_by` UUID NOT NULL REFERENCES users(id)
- `state_code` VARCHAR(2) — for state-scoped data
- Row-level security policy restricting access by user role and state

---

## EDI Standards Reference

| Transaction | Standard | Purpose |
|-------------|----------|---------|
| 837P | ASC X12 N 5010 | Professional claims |
| 837I | ASC X12 N 5010 | Institutional claims |
| 835 | ASC X12 N 5010 | Remittance advice |
| 270/271 | ASC X12 N 5010 | Eligibility inquiry/response |
| 276/277 | ASC X12 N 5010 | Claim status |
| NCPDP D.0 | NCPDP | Pharmacy claims |
| FHIR R4 | HL7 | HIE data exchange, PA APIs |

---

## Storage Paths

```
/opt/credential-vault/     ← Secrets ONLY — API keys, MMIS creds, JWT secrets
/opt/storage/              ← MinIO root — all PHI documents, audio, video
/opt/storage/hot/          ← Last 30 days — real-time access
/opt/storage/warm/         ← 1–12 months — compliance holds
/opt/storage/cold/         ← 1–7+ years — archival
/opt/backups/              ← AES-256 encrypted backups
```

---

## Geographic Rollout

- Phase 1: North Carolina, South Carolina, Georgia
- Phase 2: Southeast expansion (10–15 states)
- Phase 3: National (35+ states)
- Phase 4: Federal CMS partnership

State configuration packages live in state-config-service.
Each state has its own config record with:
- MMIS API connection credentials
- MCO registry with credentialing requirements
- Prior authorization rules and payer APIs
- Telehealth policy rules
- School-based Medicaid rules
- Claim timely filing limits
- State-specific fraud rules

---

## User Roles (20 Types)

patient, individual_provider, facility_provider, pharmacy, dmepos_supplier,
nemt_broker, mco_admin, state_medicaid_agency, federal_cms, credentialing_specialist,
prior_auth_specialist, billing_manager, compliance_officer, fraud_investigator,
denial_appeals_specialist, school_administrator, hie_administrator,
emergency_responder, qa_auditor, platform_administrator

---

## Revenue Model

1. Provider subscriptions: $50–$200/month per provider
2. Facility licensing: $500–$5,000/month per facility
3. State platform license: $2M–$10M/year per state
4. Clearinghouse commission: 0.25%–0.75% per claim processed
5. Credentialing processing: $150–$500 per application
6. Hub operations: $50K–$200K/month per state
7. Analytics subscriptions: $10K–$50K/month per state
8. State onboarding: $250K–$1M one-time per state

---

*MedGuard360 — TRG TechLink Proprietary — 2026*
*Read this file before building anything in this workspace.*
