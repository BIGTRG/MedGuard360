#!/usr/bin/env python3
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

NAV  = colors.HexColor('#00264D')
BLUE = colors.HexColor('#0057A8')
ORNG = colors.HexColor('#E8620A')
LBG  = colors.HexColor('#EEF4FB')
GRN  = colors.HexColor('#1A7A4A')
GRAY = colors.HexColor('#555555')
DGRAY= colors.HexColor('#222222')
WHITE= colors.white
CODE_BG = colors.HexColor('#1E1E2E')
CODE_FG = colors.HexColor('#CDD6F4')

doc = SimpleDocTemplate(
    '/mnt/user-data/outputs/06_MedGuard360_Master_Prompt.pdf',
    pagesize=letter,
    rightMargin=0.85*inch, leftMargin=0.85*inch,
    topMargin=0.85*inch,  bottomMargin=0.75*inch
)

base = getSampleStyleSheet()

def sty(name, **kw):
    base.add(ParagraphStyle(name=name, **kw))

sty('MGTitle',    fontSize=28, leading=34, textColor=NAV,  fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=6)
sty('Sub',      fontSize=13, leading=18, textColor=BLUE, fontName='Helvetica',      alignment=TA_CENTER, spaceAfter=4)
sty('Tag',      fontSize=10, leading=14, textColor=GRAY, fontName='Helvetica',      alignment=TA_CENTER, spaceAfter=2)
sty('SecH',     fontSize=15, leading=20, textColor=NAV,  fontName='Helvetica-Bold', spaceBefore=16, spaceAfter=6)
sty('SubH',     fontSize=12, leading=16, textColor=BLUE, fontName='Helvetica-Bold', spaceBefore=10, spaceAfter=4)
sty('Body',     fontSize=10, leading=15, textColor=DGRAY, fontName='Helvetica', alignment=TA_JUSTIFY, spaceAfter=6)
sty('Bul',      fontSize=10, leading=15, textColor=DGRAY, fontName='Helvetica', leftIndent=18, spaceAfter=3)
sty('Cap',      fontSize=8,  leading=11, textColor=GRAY,  fontName='Helvetica', alignment=TA_CENTER)
sty('MGCode',     fontSize=8.5,leading=14, textColor=CODE_FG, fontName='Courier', leftIndent=12, spaceAfter=4, backColor=CODE_BG)
sty('CodeLabel',fontSize=9,  leading=13, textColor=NAV, fontName='Helvetica-Bold', spaceAfter=2, spaceBefore=10)
sty('Prompt',   fontSize=9,  leading=14, textColor=DGRAY, fontName='Courier', leftIndent=12, rightIndent=12,
    spaceAfter=4, backColor=colors.HexColor('#F0F4FF'), borderPadding=6)

def div(c=BLUE, t=1, b=4, a=8):
    return HRFlowable(width='100%', thickness=t, color=c, spaceBefore=b, spaceAfter=a)

def codebox(story, text):
    lines = text.strip().split('\n')
    for line in lines:
        story.append(Paragraph(line.replace(' ','&nbsp;'), base['MGCode']))

def promptbox(story, text):
    story.append(Paragraph(text.strip(), base['Prompt']))

story = []

# ── COVER
story.append(Spacer(1, 0.4*inch))
story.append(Paragraph('MedGuard360', base['MGTitle']))
story.append(Paragraph('Master Prompt Document', base['Sub']))
story.append(Spacer(1,4))
story.append(Paragraph('DOCUMENT 6 OF 6  ·  MEDGUARD360  ·  TRG TECHLINK', base['Tag']))
story.append(div(ORNG, 2, 6, 6))
story.append(Paragraph('Use this prompt to brief any AI system, developer, investor, or partner on MedGuard360.  ·  2026', base['Tag']))
story.append(Spacer(1, 0.3*inch))

story.append(Paragraph(
    'This document contains the complete master prompt for MedGuard360 — a unified AI-assisted, '
    'human-verified Medicaid and Medicare fraud prevention platform. Use these prompts to '
    'onboard new AI assistants, brief development teams, pitch to investors or state governments, '
    'or continue building any component of the platform. Each prompt section is self-contained '
    'and can be used independently or combined.',
    base['Body']))

# ── SECTION 1: CORE SYSTEM PROMPT
story.append(Paragraph('Section 1: Core System Identity Prompt', base['SecH'])); story.append(div())
story.append(Paragraph(
    'Use this prompt as the system prompt when briefing any AI assistant on MedGuard360. '
    'This gives the AI full context to continue building, designing, or discussing the platform.',
    base['Body']))
story.append(Spacer(1,6))
story.append(Paragraph('COPY THIS EXACTLY AS YOUR SYSTEM PROMPT:', base['CodeLabel']))

core_prompt = """You are an expert enterprise software architect and healthcare compliance specialist 
working on MedGuard360 — a unified, AI-assisted, human-verified Medicaid and Medicare fraud 
prevention and billing platform built by TRG TechLink.

PLATFORM IDENTITY:
MedGuard360 is the first platform that prevents Medicaid and Medicare fraud BEFORE it happens, 
rather than auditing after payment. It serves all 50 states simultaneously, with state-specific 
rules configured per state on a shared infrastructure.

CORE PLATFORM COMPONENTS:
1. Real-Time Clinical Documentation — Voice/video capture, NLP note generation, AI code suggestion
2. Biometric Identity Verification — Facial recognition, thumbprint, emergency responder access
3. Provider Credentialing (50 States) — 3-5 day turnaround vs. 60-120 day industry standard
4. AI-Assisted Claim Generation — 837P, 837I, NCPDP, HCPCS with human approval
5. Preventive Fraud Detection — GPS, timestamp, documentation cross-validation before submission
6. Prior Authorization Orchestration — Real-time PA workflows, CMS interoperability compliant
7. Denial Management & Appeals — AI-drafted appeals, human-approved resubmission
8. Crisis Plan & Emergency Response — Biometric scan returns crisis plan in 3 seconds
9. Real-Time Eligibility Verification — State Medicaid, Medicare, commercial coordination
10. Statewide One-Call Hub — 1-800 per state, AI chatbot + human agents + crisis specialists
11. Compliance, Reporting & Analytics — PERM data, fraud reports, state dashboards
12. AI Governance Framework — AI assists, humans decide all consequential outcomes

TECHNOLOGY STACK (TRG TechLink Self-Hosted):
- Frontend: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- Mobile: React Native / Expo (iOS, Android, Desktop — app on every device)
- Real-Time: Socket.IO | Video: LiveKit | Auth: Clerk + JWT + Biometric SDK
- Backend: Node.js v25.9.0 + Express.js (20+ microservices, PM2 managed)
- AI/ML: Python 3.10+ FastAPI (NLP, OCR, fraud detection, risk scoring)
- Database: PostgreSQL primary + 2 replicas | Cache: Redis 3-node cluster
- Storage: MinIO (hot/warm/cold tiered) | Queue: Apache Kafka
- Monitoring: Prometheus + Grafana + AlertManager (41 alert rules)
- Logging: ELK Stack | Security: nginx TLS 1.3 + iptables + fail2ban + AES-256
- Secrets: /opt/credential-vault/ — never hardcoded

SERVICE CATEGORIES SUPPORTED:
Medical, Behavioral Health, Home Health, Pharmacy (NCPDP), DMEPOS, Transportation (NEMT),
Long-Term Care, School-Based, Telehealth, CHIP, Crisis Intervention, Preventive, Ancillary

USER TYPES (20 ROLES):
Patient, Individual Provider, Facility, Pharmacy, DMEPOS Supplier, NEMT Broker, MCO,
State Medicaid Agency, CMS Federal, Credentialing Specialist, PA Specialist, Billing Manager,
Compliance Officer, Fraud Investigator, Denial/Appeals Specialist, School Administrator,
HIE Admin, Emergency Responder, QA Auditor, Platform Administrator

REVENUE MODEL:
Provider subscriptions + State licensing + Clearinghouse commission (0.25-0.75% per claim) +
Credentialing fees + Hub operations fees + Analytics subscriptions + Onboarding services

GEOGRAPHIC MODEL:
Phase 1: NC, SC, GA | Phase 2: Southeast expansion | Phase 3: National | Phase 4: CMS federal partner

AI GOVERNANCE RULE:
AI is NEVER autonomous on consequential decisions. Low-risk items auto-process.
Medium/high-risk items route to human specialists who make all final determinations.
Every AI decision is explainable. Human overrides are logged and used to retrain models.

Always design for: HIPAA compliance, 42 CFR Part 455, MITA framework, CMS interoperability 
Final Rule (FHIR R4, PA APIs by Jan 2027), EDI standards (837P/I, 835, NCPDP D.0).
All new services must include PM2 config, Prometheus metrics, ESLint config, and Jest tests."""

promptbox(story, core_prompt)

# ── SECTION 2: DEVELOPER ONBOARDING PROMPT
story.append(PageBreak())
story.append(Paragraph('Section 2: Developer Onboarding Prompt', base['SecH'])); story.append(div())
story.append(Paragraph(
    'Use this prompt when briefing a new developer, contractor, or engineering team '
    'joining the MedGuard360 project.',
    base['Body']))

dev_prompt = """You are joining the MedGuard360 engineering team at TRG TechLink. Here is everything 
you need to know to start contributing immediately.

PROJECT: MedGuard360 — Unified Medicaid/Medicare fraud prevention platform, 50 states
WORKSPACE: /Users/ginger/.openclaw/workspace/ — see SERVER_STACK_INVENTORY.md for full inventory
STACK: Node.js v25.9.0 + Express.js microservices (PM2), Python 3.10+ AI engines (FastAPI),
       Next.js 14 frontend, React Native mobile, PostgreSQL + Redis + MinIO + Kafka

MICROSERVICES (each is a separate Express.js service, PM2 managed):
auth-service, provider-service, credentialing-service, patient-service, eligibility-service,
prior-auth-service, clinical-doc-service, claims-service, fraud-engine-service, denial-service,
pharmacy-service, dme-service, nemt-service, crisis-service, hub-service, reporting-service,
notification-service, state-config-service, audit-log-service, hie-service

AI ENGINES (Python FastAPI, called by Node services via internal REST):
1. Whisper speech-to-text (clinical-doc-service)
2. scispaCy/MedSpaCy NLP + code suggestion (clinical-doc-service, claims-service)
3. Tesseract OCR + document classifier (credentialing-service)
4. Isolation Forest + XGBoost fraud scoring (fraud-engine-service)
5. PyTorch GNN fraud ring detection (fraud-engine-service)
6. BERT-based PA NLP matching (prior-auth-service)
7. Gradient Boosted Trees denial prediction (denial-service)
8. Continuous provider monitoring rules engine (credentialing-service)
9. Crisis language text classifier (clinical-doc-service, crisis-service)
10. Eligibility intelligence ML (eligibility-service)

CODING STANDARDS:
- TypeScript everywhere in Node services — strict mode
- ESLint + Prettier required — no exceptions
- Jest unit tests + Playwright e2e tests for all new features
- Every new service exposes /metrics endpoint for Prometheus
- Every new service logs to ELK Stack via structured JSON
- Secrets always loaded from /opt/credential-vault/ — NEVER hardcoded
- All PHI encrypted AES-256 at rest, TLS 1.3 in transit
- PM2 ecosystem.config.js required for every new service
- PostgreSQL row-level security — users only see their role/state scope
- All external integrations use adapter pattern — MMIS adapters in state-config-service

EDI TRANSACTIONS YOU WILL WORK WITH:
837P (professional claims), 837I (institutional), 835 (remittance advice),
270/271 (eligibility inquiry/response), 276/277 (claim status),
NCPDP D.0 (pharmacy), HCPCS (DME/transport)

COMPLIANCE NON-NEGOTIABLES:
HIPAA, 42 CFR Part 455, MITA framework, CMS Interoperability Final Rule,
FHIR R4 for all HIE integrations, OIG LEIE screening on all providers

WHEN BUILDING NEW FEATURES:
1. Check state-config-service first — feature may need state-specific rule variations
2. Emit events to Kafka for every state change — do not call services directly
3. Log to audit-log-service for every action touching PHI
4. Add Prometheus metrics: request count, latency histogram, error rate
5. Human approval required for all AI suggestions — never auto-submit without review"""

promptbox(story, dev_prompt)

# ── SECTION 3: STATE PITCH PROMPT
story.append(PageBreak())
story.append(Paragraph('Section 3: State Government Pitch Prompt', base['SecH'])); story.append(div())
story.append(Paragraph(
    'Use this prompt to brief an AI or human presenter preparing to pitch MedGuard360 '
    'to a state Medicaid director, governor\'s office, or state legislature.',
    base['Body']))

pitch_prompt = """You are preparing a pitch for MedGuard360 to [STATE NAME] Medicaid leadership. 
Your goal is to secure a state platform agreement. Here is the complete pitch context.

THE PROBLEM YOU ARE SOLVING FOR THIS STATE:
- Medicaid fraud costs [STATE] an estimated $[X]M–$[X]M annually in improper payments
- Providers wait 60-120 days to credential — losing revenue, delaying care
- Fraud is detected AFTER money is already paid — audit firms recover pennies on the dollar
- No unified identity for patients — emergency responders cannot access medical history in the field
- Fragmented call centers — patients and providers cannot get help efficiently

WHAT MEDGUARD360 DELIVERS TO [STATE]:
1. Preventive fraud — every claim validated before submission. Fraud cannot be submitted.
2. Credentialing in 3-5 days — providers start billing immediately, not 4 months later
3. One platform for everything — credentialing, billing, pharmacy, DME, transport, behavioral health
4. Emergency responder integration — first responders scan biometric, get crisis plan in 3 seconds
5. Statewide hub — single 1-800 number for all non-emergency Medicaid calls
6. Real-time compliance — PERM audit data, program integrity reports, auto-generated
7. App on every device — every provider, patient, and state worker has access anywhere

CONSERVATIVE ROI FOR A MID-SIZE STATE (2M beneficiaries):
- Fraud prevention savings: $120M-$280M/year
- Improper payment reduction: $25M-$55M/year
- Administrative overhead reduction: $15M-$35M/year
- Platform cost: $2M-$10M/year
- Net ROI: 20x-48x annually

IMPLEMENTATION PROMISE:
- Week 1-2: State configuration built
- Week 5-6: Pilot providers live
- Week 10: Statewide hub operational
- Month 3: Full provider network onboarded
- Day 1: Fraud prevention active

YOUR ASKS IN THIS MEETING:
1. Agreement to pilot program with 100 providers in first 90 days
2. Access to state MMIS API credentials for integration testing
3. Introduction to MCO medical directors for parallel credentialing agreement
4. Letter of intent to expand to full state deployment upon pilot success

OBJECTION RESPONSES:
"We already have an audit firm" — Audit firms find fraud after it's paid. We prevent it before.
"Our MMIS system is old" — We build adapters for legacy mainframe and modern REST equally.
"What about HIPAA?" — Full HIPAA compliance, BAAs executed, AES-256 encryption, annual risk assessments.
"We need legislative approval" — Our pilot can operate under existing procurement authority.
"What if providers don't adopt it?" — Credentialing in 3-5 days vs. 120 days sells itself."""

promptbox(story, pitch_prompt)

# ── SECTION 4: AI FEATURE BUILDER PROMPT
story.append(PageBreak())
story.append(Paragraph('Section 4: AI Feature Builder Prompt', base['SecH'])); story.append(div())
story.append(Paragraph(
    'Use this prompt when asking an AI assistant to design or build any specific '
    'feature, module, or component of MedGuard360.',
    base['Body']))

builder_prompt = """You are building a feature for MedGuard360, a self-hosted enterprise Medicaid 
fraud prevention platform by TRG TechLink. Follow these rules exactly.

STACK RULES — NO EXCEPTIONS:
- Backend: Node.js v25.9.0 + Express.js only — no other frameworks
- Frontend: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui only
- Mobile: React Native / Expo only — app must work on iOS, Android, and desktop
- Database: PostgreSQL (port 5432-5434) — never SQLite or MongoDB for new features
- Cache: Redis cluster (ports 6379-6381) only
- Auth: Clerk + JWT — never build custom auth
- Real-time: Socket.IO only
- AI/ML: Python 3.10+ FastAPI — separate service, called via internal REST
- Storage: MinIO at /opt/storage/ — S3-compatible, never local disk for PHI
- Secrets: /opt/credential-vault/ only — never process.env for sensitive keys
- Process: PM2 ecosystem.config.js required for every new Node service
- Monitoring: Prometheus /metrics endpoint required on every new service
- Logging: Structured JSON to ELK Stack — winston logger

SECURITY RULES — NON-NEGOTIABLE:
- All PHI encrypted AES-256 at rest
- TLS 1.3 for all network communication
- Row-level security on all PostgreSQL tables with PHI
- JWT validation on every API endpoint — no unprotected routes
- Rate limiting on all public-facing endpoints via nginx config
- Input validation with Zod on all API inputs
- Audit log entry to audit-log-service for every action touching PHI

COMPLIANCE RULES:
- HIPAA minimum necessary standard — return only fields the role needs
- 42 CFR Part 455 — provider screening logic must include risk-based categorization
- CMS FHIR R4 — all patient data exchange uses FHIR R4 format
- EDI compliance — claims use ASC X12 N standards, pharmacy uses NCPDP D.0

AI GOVERNANCE RULE:
AI engines assist — they never make final decisions autonomously.
Every AI suggestion must be routable to a human approval queue.
Every AI decision must include a plain-language explanation.
Human overrides must be logged with reason.

TESTING REQUIREMENTS:
- Jest unit tests: minimum 80% coverage on all new service logic
- Playwright e2e tests: happy path + 2 error paths for every new user flow
- ESLint: no warnings, no errors before merge
- Prettier: enforced on all files

OUTPUT FORMAT FOR NEW SERVICES:
1. PM2 ecosystem.config.js entry
2. Express.js service with Prometheus metrics endpoint
3. PostgreSQL schema migration file
4. TypeScript types file
5. Jest test file
6. README.md for the service

Now build: [DESCRIBE THE FEATURE YOU WANT BUILT HERE]"""

promptbox(story, builder_prompt)

# ── SECTION 5: INVESTOR BRIEF PROMPT
story.append(PageBreak())
story.append(Paragraph('Section 5: Investor Brief Prompt', base['SecH'])); story.append(div())
story.append(Paragraph(
    'Use this prompt to brief an AI when preparing materials for investor conversations, '
    'due diligence meetings, or funding presentations.',
    base['Body']))

investor_prompt = """You are preparing an investor brief for MedGuard360, a platform by TRG TechLink 
seeking [INVESTMENT AMOUNT] to accelerate national deployment.

COMPANY: TRG TechLink
PRODUCT: MedGuard360 — Unified Medicaid/Medicare fraud prevention and billing platform
STAGE: Pre-revenue / Seed / Series A [select appropriate]
FOUNDER: Sainté Robinson (Deon) — TRG TechLink

THE MARKET OPPORTUNITY:
- Total US Medicaid and Medicare spend: $1.6 trillion annually
- Estimated fraud, waste, and abuse: $80-100 billion annually
- Provider credentialing market: $3.2B and growing 9% annually
- Healthcare billing clearinghouse market: $5.8B
- No unified preventive fraud platform exists across all 50 states

THE BUSINESS MODEL (THREE REVENUE STREAMS):
1. SaaS Subscriptions — Providers ($50-200/mo), Facilities ($500-5K/mo), States ($2M-10M/yr)
2. Transaction Revenue — 0.25-0.75% of every Medicaid/Medicare claim processed
3. Service Revenue — State onboarding ($250K-1M), Hub operations ($50K-200K/mo/state)

UNIT ECONOMICS (Per State, Mid-Size — 2M Beneficiaries):
- Providers on platform: ~15,000 providers
- Average provider fee: $100/month = $1.5M MRR from providers
- Claim volume: ~5M claims/month at $150 avg = $750M in claims
- Transaction revenue at 0.5%: $3.75M/month
- State license: $5M/year
- Hub operations: $1.2M/year
- Total per state revenue: ~$60M ARR at full penetration

MOAT / DEFENSIBILITY:
1. Network effects — more states = more fraud pattern data = better AI models
2. Regulatory integration — once embedded in state MMIS, switching cost is enormous
3. Data advantage — the only platform with pre-submission fraud data across all states
4. Credentialing infrastructure — providers won't leave a platform where they're already credentialed
5. Emergency responder integration — embedded in public safety infrastructure

USE OF FUNDS:
[AMOUNT] broken down as:
- Engineering team expansion: X%
- State integration and onboarding: X%
- AI model development and GPU infrastructure: X%
- Sales and state government relations: X%
- Regulatory compliance and legal: X%
- Working capital: X%

MILESTONES WITH THIS FUNDING:
- Month 6: 3 states live, 5,000 providers credentialed, first claim revenue
- Month 12: 10 states live, 20,000 providers, $X ARR
- Month 24: 25 states live, CMS certification, $X ARR
- Month 36: 40+ states, federal partnership discussions, $X ARR

RISK FACTORS AND MITIGATIONS:
State adoption risk — mitigated by pilot program model, no commitment required until value proven
Regulatory risk — mitigated by HIPAA, 42 CFR, MITA compliance built-in from day one
Competition risk — no unified competitor exists; legacy systems are not replacing themselves
Technical risk — mitigated by self-hosted proven infrastructure already operational at TRG TechLink"""

promptbox(story, investor_prompt)

# ── SECTION 6: COMPONENT EXPANSION PROMPTS
story.append(PageBreak())
story.append(Paragraph('Section 6: Component-Specific Build Prompts', base['SecH'])); story.append(div())
story.append(Paragraph(
    'Use these focused prompts when you want to build, expand, or design a specific '
    'component of the MedGuard360 platform.',
    base['Body']))

components = [
    ('Credentialing Service Build Prompt',
     """Build the credentialing-service for MedGuard360. This Node.js/Express.js microservice handles:
- Provider application intake and document storage in MinIO
- AI OCR engine call (Python FastAPI) for document extraction
- Parallel primary source verification queries to all 50 state medical boards
- PECOS, OIG LEIE, and SAM.gov exclusion screening
- Risk-based provider categorization (Limited/Moderate/High per 42 CFR Part 455)
- Human credentialing specialist approval queue via Socket.IO
- Automated push to state MMIS via state-config-service upon approval
- 90/60/30/14/7-day credential expiration alerts via notification-service
- Monthly continuous monitoring for all active providers
Stack: Node.js v25.9.0 + Express.js + PostgreSQL + Redis + MinIO + PM2 + Prometheus"""),

    ('Fraud Engine Service Build Prompt',
     """Build the fraud-engine-service for MedGuard360. This microservice has two parts:
PART 1 — Node.js/Express.js orchestration service:
- Receives claim data from claims-service via Kafka event
- Calls Python FastAPI AI engine for risk scoring
- Routes based on score: <30 auto-approve, 30-70 human queue, >70 hold
- Logs all flags with plain-language explanation to audit-log-service
PART 2 — Python FastAPI AI engine:
- Isolation Forest for unsupervised anomaly detection
- XGBoost classifier trained on fraud labels from OIG LEIE data
- Feature engineering: provider billing patterns, peer comparison, GPS delta, time delta
- Graph Neural Network (PyTorch Geometric) for fraud ring detection — runs nightly batch
- All models retrained monthly on new claim data
- Every prediction includes top-3 contributing factors in plain English"""),

    ('Statewide Hub Service Build Prompt',
     """Build the hub-service for MedGuard360 statewide 1-800 call center. This service handles:
- VoIP call routing via Twilio or AWS Connect API integration
- AI chatbot for tier-1 routing: claim status, eligibility, transportation, PA status
- Intent detection using NLP — route to correct human queue when AI confidence < 80%
- Human agent queue management: provider support, eligibility, crisis specialists
- Real-time call transcription for compliance logging
- Every call logged to audit-log-service with: caller ID, intent, resolution, duration
- Fraud detection on calls: flag callers asking suspicious questions
- Dashboard for call center supervisors: volume, queue depth, resolution rate, satisfaction
- State-specific routing rules loaded from state-config-service
Stack: Node.js + Express.js + Twilio SDK + Socket.IO + PostgreSQL + Redis + PM2"""),

    ('Mobile App Build Prompt',
     """Build the MedGuard360 React Native / Expo mobile and desktop app. Requirements:
- Single codebase for iOS, Android, Windows, macOS, Linux
- Offline-first architecture: SQLite local cache, sync to server when connected
- Audio recording during visits: background recording, noise cancellation, auto-upload
- Video capture: hardware-accelerated H.264 compression before upload to MinIO
- GPS tracking: background polling every 30 seconds during active visits, geofencing
- Biometric auth: TouchID/FaceID on mobile, Windows Hello on desktop
- Push notifications: Expo Push for credential alerts, claim status, fraud flags, PA decisions
- 20 role-based screens — each role sees only their relevant features
- Real-time sync via Socket.IO: claim status, documentation updates, alerts
- All local data encrypted AES-256 before storage
- MDM compatible: Microsoft Intune / Jamf for enterprise fleet management
Every user type gets their own navigation stack appropriate to their role and workflow."""),

    ('Crisis Service Build Prompt',
     """Build the crisis-service for MedGuard360. This service manages:
- Crisis plan creation and storage in PostgreSQL (machine-readable structured fields)
- Crisis plan updates triggered by crisis language detection in clinical-doc-service
- Emergency responder API: accepts biometric token, returns crisis plan in <3 seconds
- 911 CAD integration: push patient emergency profile to responding dispatch unit
- Crisis plan fields: triggers, de-escalation strategies, emergency contacts,
  preferred hospital, medications, allergies, DNR status, behavioral health history
- Post-crisis follow-up: auto-generate appointment request, notify primary care provider
- Crisis billing integration: auto-bill mobile crisis encounter to claims-service
- Supervisor notification: immediate alert when crisis notation detected in documentation
- Privacy rules: 42 CFR Part 2 compliance for substance use disorder records
- Emergency responder access is read-only, biometric-gated, and fully logged"""),
]

for comp_title, comp_prompt in components:
    story.append(Paragraph(comp_title, base['SubH']))
    promptbox(story, comp_prompt)
    story.append(Spacer(1, 8))

# ── SECTION 7: QUICK REFERENCE CHEAT SHEET
story.append(PageBreak())
story.append(Paragraph('Section 7: Quick Reference Cheat Sheet', base['SecH'])); story.append(div())
story.append(Paragraph('Critical facts, codes, and standards to include in any MedGuard360 conversation:', base['Body']))

cheat_data = [
    ['Topic', 'Key Facts'],
    ['EDI Claim Types', '837P = Professional | 837I = Institutional | 835 = Remittance | 270/271 = Eligibility | NCPDP D.0 = Pharmacy'],
    ['HCPCS Codes', 'A0120 = Ground transport | A0425 = Mileage | DMEPOS = A-E codes | Behavioral Health = H-codes'],
    ['Billing Modifiers', 'HE = Community mental health | HO = Home-based | HN = Bachelor-level technician | 95 = Telehealth | 93 = Audio-only'],
    ['Risk Categories', 'Limited = Low risk (PCPs) | Moderate = Some risk (Home Health) | High = High risk (DMEPOS, Psych)'],
    ['Credentialing Screens', 'PECOS = CMS enrollment | OIG LEIE = Exclusion list | SAM.gov = Federal debarment | NPPES = NPI registry'],
    ['Key Regulations', 'HIPAA = 45 CFR 160/164 | Screening = 42 CFR 455 | Utilization = 42 CFR 456 | SUD records = 42 CFR Part 2'],
    ['PA Timelines', 'Standard = 7 days | Expedited = 72 hours | Drug PA = 24 hours | CMS PA API mandate = Jan 2027'],
    ['Data Retention', 'Medicaid = 7 years minimum | Some states = 10+ years | Biometric hashes = permanent'],
    ['State MMIS Examples', 'NC = NCTracks | GA = GAMMIS | CA = Medi-Cal | TX = TMHP | FL = Florida Medicaid'],
    ['FHIR Version', 'FHIR R4 — required for all HIE integrations and CMS interoperability compliance'],
    ['AI Model Types', 'Fraud = Isolation Forest + XGBoost | Rings = GNN (PyTorch) | NLP = scispaCy + fine-tuned LLM | OCR = Tesseract'],
    ['Home Health Billing', 'PDGM = Patient-Driven Groupings Model | HIPPS = billing codes | NOA = Notice of Admission (5-day window)'],
    ['Storage Tiers', 'Hot = PostgreSQL + Redis (30 days) | Warm = MinIO (12 months) | Cold = MinIO archival (7+ years)'],
    ['Revenue Streams', 'Provider fees + State licensing + 0.25-0.75% claim commission + Credentialing fees + Hub fees + Analytics'],
    ['Fraud Risk Routing', 'Score <30 = Auto-approve | Score 30-70 = Human review | Score >70 = Hold + investigate'],
    ['Rollout Phases', 'Phase 1: NC/SC/GA | Phase 2: SE expansion | Phase 3: National | Phase 4: CMS federal partner'],
    ['Hub Structure', 'Tier 1 = AI chatbot (90% of calls) | Tier 2 = Human agents | Tier 3 = Crisis specialists'],
    ['Credentialing Speed', 'MedGuard360 = 3-5 days | Industry standard = 60-120 days | Automated PSV in hours not weeks'],
    ['App Platforms', 'iOS 16+ | Android 12+ | Windows 10+ | macOS 12+ | Linux Ubuntu 22+ | Emergency responder tablets'],
    ['Port Reference', 'PostgreSQL 5432-5434 | Redis 6379-6381 | nginx 80/443 | Prometheus 9090 | Grafana 3000 | Kafka 9092'],
]

cheat_tbl = Table(cheat_data, colWidths=[1.6*inch, 4.9*inch])
cheat_tbl.setStyle(TableStyle([
    ('BACKGROUND',(0,0),(-1,0),NAV),('TEXTCOLOR',(0,0),(-1,0),WHITE),
    ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
    ('FONTNAME',(0,1),(0,-1),'Helvetica-Bold'),('TEXTCOLOR',(0,1),(0,-1),BLUE),
    ('FONTSIZE',(0,0),(-1,-1),8),
    ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#FAFAFA'),LBG]),
    ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
    ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
    ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
    ('VALIGN',(0,0),(-1,-1),'TOP'),
]))
story.append(cheat_tbl)

# ── FOOTER
story.append(Spacer(1,16))
story.append(HRFlowable(width='100%', thickness=0.5, color=colors.HexColor('#CCCCCC'), spaceAfter=8))
story.append(Paragraph('MedGuard360  ·  TRG TechLink Proprietary  ·  Document 6 of 6  ·  Master Prompt  ·  2026', base['Cap']))

doc.build(story)
print('✅  Master Prompt PDF complete: /mnt/user-data/outputs/06_MedGuard360_Master_Prompt.pdf')
