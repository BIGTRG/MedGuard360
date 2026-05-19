#!/usr/bin/env python3
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (SimpleDocTemplate, Table, TableStyle, Paragraph,
                                 Spacer, PageBreak, HRFlowable, KeepTogether)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
import os

os.makedirs('/mnt/user-data/outputs', exist_ok=True)

NAV   = colors.HexColor('#00264D')
BLUE  = colors.HexColor('#0057A8')
CYAN  = colors.HexColor('#00A3CC')
ORNG  = colors.HexColor('#E8620A')
LBG   = colors.HexColor('#EEF4FB')
LBG2  = colors.HexColor('#FFF7F3')
GRN   = colors.HexColor('#1A7A4A')
WHITE = colors.white
LGRAY = colors.HexColor('#F5F5F5')
GRAY  = colors.HexColor('#555555')
DGRAY = colors.HexColor('#333333')

def S():
    base = getSampleStyleSheet()
    def add(name, **kw):
        base.add(ParagraphStyle(name=name, **kw))
    add('DocTitle',    fontSize=28, leading=34, textColor=NAV,  alignment=TA_CENTER, fontName='Helvetica-Bold', spaceAfter=6)
    add('DocSub',      fontSize=13, leading=18, textColor=BLUE, alignment=TA_CENTER, fontName='Helvetica',      spaceAfter=4)
    add('DocTag',      fontSize=10, leading=14, textColor=GRAY, alignment=TA_CENTER, fontName='Helvetica',      spaceAfter=2)
    add('SecH',        fontSize=15, leading=20, textColor=NAV,  fontName='Helvetica-Bold', spaceBefore=16, spaceAfter=6)
    add('SubH',        fontSize=12, leading=16, textColor=BLUE, fontName='Helvetica-Bold', spaceBefore=10, spaceAfter=4)
    add('Body',        fontSize=10, leading=15, textColor=DGRAY, alignment=TA_JUSTIFY, spaceAfter=6, fontName='Helvetica')
    add('Bul',         fontSize=10, leading=15, textColor=DGRAY, leftIndent=18, spaceAfter=3, fontName='Helvetica')
    add('Sub',         fontSize=9,  leading=13, textColor=GRAY,  leftIndent=36, spaceAfter=2, fontName='Helvetica')
    add('Cap',         fontSize=8,  leading=11, textColor=GRAY,  alignment=TA_CENTER, fontName='Helvetica')
    add('PitchBig',    fontSize=32, leading=40, textColor=WHITE, alignment=TA_CENTER, fontName='Helvetica-Bold', spaceAfter=8)
    add('PitchSub',    fontSize=15, leading=20, textColor=colors.HexColor('#CCE4FF'), alignment=TA_CENTER, fontName='Helvetica', spaceAfter=6)
    add('StatNum',     fontSize=40, leading=48, textColor=ORNG,  alignment=TA_CENTER, fontName='Helvetica-Bold', spaceAfter=2)
    add('StatLbl',     fontSize=11, leading=14, textColor=NAV,   alignment=TA_CENTER, fontName='Helvetica-Bold', spaceAfter=4)
    add('KPINum',      fontSize=28, leading=34, textColor=GRN,   alignment=TA_CENTER, fontName='Helvetica-Bold', spaceAfter=2)
    add('KPILbl',      fontSize=9,  leading=12, textColor=GRAY,  alignment=TA_CENTER, fontName='Helvetica')
    return base

def div(c=BLUE, thick=1, before=4, after=8):
    return HRFlowable(width='100%', thickness=thick, color=c, spaceBefore=before, spaceAfter=after)

def box(story, text, s, bg=LBG, indent=True):
    p = Paragraph(text, s['SubH'])
    t = Table([[p]], colWidths=[6.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),bg),
        ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
        ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
    ]))
    story.append(t); story.append(Spacer(1,5))

def cover(story, s, doc_num, title, sub, tag):
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph(title, s['DocTitle']))
    story.append(Paragraph(sub,   s['DocSub']))
    story.append(Spacer(1,4))
    story.append(Paragraph(f'DOCUMENT {doc_num} OF 5  ·  MEDGUARD360', s['DocTag']))
    story.append(div(ORNG, 2, 6, 6))
    story.append(Paragraph(tag,  s['DocTag']))
    story.append(Spacer(1, 0.3*inch))

def foot(story, s, num, label):
    story.append(Spacer(1,16))
    story.append(div(colors.HexColor('#CCCCCC'), 0.5))
    story.append(Paragraph(f'MedGuard360  ·  TRG TechLink Proprietary  ·  Document {num} of 5  ·  {label}  ·  2026', s['Cap']))

def mk(path, fn):
    doc = SimpleDocTemplate(path, pagesize=letter,
                            rightMargin=0.85*inch, leftMargin=0.85*inch,
                            topMargin=0.85*inch,  bottomMargin=0.75*inch)
    s = S()
    story = []
    fn(story, s)
    doc.build(story)
    print(f'✓  {path}')

# ─────────────────────────────────────────────────────────────
# DOC 1  WHAT IT LOOKS LIKE
# ─────────────────────────────────────────────────────────────
def d1(story, s):
    cover(story, s, '1', 'MedGuard360',
          'Unified Medicaid & Medicare Fraud Prevention Platform',
          'What It Looks Like  ·  TRG TechLink  ·  Proprietary  ·  2026')

    story.append(Paragraph('Executive Vision', s['SecH'])); story.append(div())
    story.append(Paragraph(
        'MedGuard360 is the first unified, AI-assisted, human-verified enterprise platform that serves as '
        'the single source of truth for every Medicaid, Medicare, CHIP, and government-funded healthcare '
        'billing transaction across all 50 states, D.C., and U.S. territories. Every prescription, every '
        'home visit, every DME delivery, every transportation ride, and every clinical note is captured, '
        'validated, and cross-referenced in real time — before a single claim is ever submitted. '
        'The platform is app-first: native on every device — phones, tablets, laptops, clinic workstations, '
        'and emergency responder vehicles.', s['Body']))

    story.append(Paragraph('The Twenty User Portals', s['SecH'])); story.append(div())
    portals = [
        ('1. Patient / Beneficiary','Biometric login, enrolled providers, claims history, crisis plan, '
         'appointment scheduling, benefits summary. Emergency responders scan face or thumbprint to pull '
         'read-only emergency profile instantly.'),
        ('2. Individual Provider','Real-time audio/video documentation, AI-suggested billing codes, '
         'one-click claim submission, payment tracking, credential status and expiration alerts.'),
        ('3. Facility / Organization','Staff roster, multi-provider credentialing, facility-level billing, '
         'utilization dashboards, compliance reporting.'),
        ('4. Pharmacy','NCPDP D.0 claims, prescription validation against clinical encounter, '
         'formulary management, controlled substance verification.'),
        ('5. DMEPOS Supplier','Inventory, face-to-face physician order verification, delivery confirmation, '
         'patient fit sign-off before HCPCS claim submission.'),
        ('6. NEMT Broker','GPS-verified ride scheduling, driver credentialing, mileage billing, '
         'trip confirmation against clinical appointment.'),
        ('7. Managed Care Organization','Member enrollment, provider network, PA queues, capitation '
         'tracking, claim adjudication, medical loss ratio dashboards.'),
        ('8. State Medicaid Agency','All providers, claims, credentialing, fraud flags, and reporting '
         'metrics for the state. Configure state-specific rules in the rules engine.'),
        ('9. Federal CMS','National fraud trends, PERM audit data, cross-state analytics, provider '
         'exclusion monitoring, improper payment dashboards.'),
        ('10. Credentialing Specialist','AI-extracted provider data pre-populated for review. '
         'Primary source verification results auto-returned. One-click approval triggers enrollment.'),
        ('11. Prior Authorization Specialist','AI-scored PA requests with criteria pre-matched. '
         'Straight-forward cases: one click. Borderline: full clinical evidence attached.'),
        ('12. Billing / Revenue Cycle','Claims across all payers, denial reasons categorized by AI, '
         'appeal queues, resubmission templates, revenue by provider, service, and state.'),
        ('13. Compliance Officer','Monthly AI compliance reports, provider risk scores, anomaly flags, '
         'peer comparisons, audit-ready documentation packages.'),
        ('14. Fraud Investigator','Medium/high-risk claims routed with full record, provider billing '
         'history, peer analysis, fraud risk score with plain-language explanation.'),
        ('15. Denial Management / Appeals','Denied claims sorted by denial code, AI-suggested '
         'corrections, pre-populated resubmission templates, deadline tracking.'),
        ('16. School District / LEA','Medicaid billing for special education services under IDEA. '
         'IEP service documentation links directly to claim generation.'),
        ('17. Health Information Exchange','FHIR R4 data sharing, referral workflows, '
         'patient consent management, cross-provider clinical history.'),
        ('18. Emergency Responder','Biometric scan returns: name, Medicaid ID, diagnoses, medications, '
         'crisis plan, emergency contacts, allergies — all within 3 seconds.'),
        ('19. Quality Assurance / Auditor','Read-only access, claims data, documentation samples, '
         'credentialing records, exportable audit packages formatted for CMS.'),
        ('20. Platform Administrator','State configuration packages, system health, user role '
         'management, API connection status to each state MMIS, AI model performance.'),
    ]
    for title, desc in portals:
        box(story, title, s)
        story.append(Paragraph(desc, s['Body']))

    story.append(PageBreak())
    story.append(Paragraph('Service Categories Supported', s['SecH'])); story.append(div())
    cats = [
        'Medical / Physical Health — Primary care, specialist, preventive, surgical, emergency, lab, diagnostics',
        'Behavioral Health — Mental health therapy, substance use, psychiatric, community-based support, ABA',
        'Home Health — Skilled nursing, home health aide, PT/OT/speech in home, PDGM billing with HIPPS codes',
        'Community-Based Services — GPS-verified home visits with real-time audio/video documentation',
        'Pharmacy — NCPDP D.0 retail claims, MTM, controlled substance verification, formulary management',
        'Durable Medical Equipment — Wheelchairs, prosthetics, orthotics, oxygen, DME/surgical/diabetic supplies',
        'Non-Emergency Medical Transportation — GPS-verified trips, driver credentialing, mileage HCPCS billing',
        'Long-Term Care / Institutional — Nursing facilities, assisted living, behavioral health inpatient',
        'School-Based Services — Speech, OT, PT, behavioral health under IDEA for Medicaid-enrolled students',
        'Telehealth / Telemedicine — Video, audio-only, remote monitoring, state-specific modifier application',
        'CHIP Services — State-specific eligibility, income rules, and service coverage for children',
        'Crisis Intervention — Mobile crisis, stabilization, 911 integration, post-crisis follow-up billing',
        'Preventive Services — Screenings, immunizations, wellness visits, early intervention, family planning',
        'Ancillary Services — Social work, care coordination, community health workers under supervision',
    ]
    for c in cats:
        story.append(Paragraph(f'• {c}', s['Bul']))

    story.append(PageBreak())
    story.append(Paragraph('New Platform Components (Latest Additions)', s['SecH'])); story.append(div())
    adds = [
        ('Statewide One-Call Hub (Per State)',
         'Single 1-800 number per state for all non-emergency calls. AI chatbot routes 90% of routine '
         'inquiries instantly — claim status, eligibility, transportation, prior auth status. '
         'Tier-2 human agents handle complex cases. Crisis specialists available 24/7. '
         'Every call recorded, transcribed, AI-analyzed, and logged for compliance.'),
        ('Credentialing Expiration Prevention Engine',
         '90/60/30/14/7-day automated alerts before every credential expiration across all licenses, '
         'DEA registration, malpractice insurance, NPI revalidation, facility certifications. '
         'Billing access automatically suspended if credentials lapse. Full audit trail of every alert sent. '
         'Provider can never claim they were not warned.'),
        ('App-on-Every-Device Architecture',
         'Native React Native/Expo app deployed on all smartphones, tablets, laptops, clinic workstations, '
         'and emergency responder vehicle tablets. Offline-first architecture with intelligent sync. '
         'Not web-first — app-first. Same real-time capability everywhere.'),
        ('GPS & Timestamp Anti-Fraud Layer',
         'Every provider visit geotagged and timestamped in real time. GPS proves provider was at the '
         'billed location. Timestamp proves service occurred when claimed. Mileage billed against '
         'actual route data. Eliminates location and time-based fraud by design.'),
        ('Tiered Storage Architecture',
         'Hot tier (30 days) — PostgreSQL + Redis: real-time querying. '
         'Warm tier (6-12 months) — MinIO distributed object storage: compliance holds. '
         'Cold tier (7+ years) — Archival storage: 7-year HIPAA minimum + state requirements. '
         'Automated tiering policies. AES-256 encryption at every tier.'),
        ('AI-Assisted, Human-Verified Workflows',
         'AI does the heavy lifting — document scanning, code suggestion, fraud scoring, PA matching, '
         'appeal drafting. Humans make every consequential decision — credentialing approval, '
         'fraud determination, denial resolution. Reduces manual volume by 70-80% while keeping human '
         'authority intact. Transforms jobs, not eliminates them.'),
    ]
    for t, d in adds:
        box(story, t, s, LBG2)
        story.append(Paragraph(d, s['Body']))

    story.append(PageBreak())
    story.append(Paragraph('Geographic Rollout Model', s['SecH'])); story.append(div())
    phases = [
        ('Phase 1 — Anchor States (Months 1–12)',
         'North Carolina, South Carolina, Georgia. Full build, MMIS integration, compliance certification. '
         'Early adopters bear partial customization cost, gain first-mover fraud savings.'),
        ('Phase 2 — Southeastern Expansion (Months 12–24)',
         'Tennessee, Virginia, Florida, Alabama, Mississippi. Standardized configuration package cuts '
         'onboarding from 12 months to 6–8 weeks per state.'),
        ('Phase 3 — National Rollout (Months 24–48)',
         'All remaining states onboarded in parallel. Automated configuration templates. '
         'Target 35+ states active within 48 months.'),
        ('Phase 4 — Federal Integration (Month 36+)',
         'CMS certification as approved EDI submitter and program integrity partner. '
         'Direct PERM audit data submission. National fraud pattern sharing.'),
    ]
    for t, d in phases:
        box(story, t, s)
        story.append(Paragraph(d, s['Body']))

    story.append(Paragraph('Revenue Model', s['SecH'])); story.append(div())
    rev = [
        ['Revenue Stream', 'Model', 'Estimated Range'],
        ['Provider User Fees', 'Monthly subscription per provider', '$50–$200/month/provider'],
        ['Facility Licensing', 'Monthly per facility', '$500–$5,000/month'],
        ['State Platform License', 'Annual per state', '$2M–$10M/year/state'],
        ['Billing Clearinghouse Commission', '% of successful claims', '0.25%–0.75% per claim'],
        ['Credentialing Processing', 'Per-application fee', '$150–$500/application'],
        ['Statewide Hub Operations', 'Monthly per state', '$50K–$200K/month'],
        ['Analytics Subscriptions', 'Premium dashboards', '$10K–$50K/month/state'],
        ['State Onboarding Services', 'One-time integration', '$250K–$1M per state'],
    ]
    t = Table(rev, colWidths=[2.2*inch, 2.5*inch, 1.8*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),NAV),('TEXTCOLOR',(0,0),(-1,0),WHITE),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),9),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#FAFAFA'),LBG]),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
        ('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),
        ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(t)
    foot(story, s, '1', 'What It Looks Like')

mk('/mnt/user-data/outputs/01_MedGuard360_What_It_Looks_Like.pdf', d1)


# ─────────────────────────────────────────────────────────────
# DOC 2  WHAT IT CAN DO
# ─────────────────────────────────────────────────────────────
def d2(story, s):
    cover(story, s, '2', 'MedGuard360',
          'Unified Medicaid & Medicare Fraud Prevention Platform',
          'What It Can Do  ·  TRG TechLink  ·  Proprietary  ·  2026')

    story.append(Paragraph('Full Functional Capability Set — 12 Core Modules', s['SecH'])); story.append(div())
    story.append(Paragraph(
        'Every module operates independently but shares a unified data layer, ensuring complete '
        'interoperability across all service categories, user types, states, and device types.', s['Body']))

    modules = [
        ('Module 1: Real-Time Clinical Documentation', [
            'Live audio transcription of every clinical encounter via speech-to-text AI',
            'Video recording for home visits and telehealth sessions — encrypted, immutable timestamps',
            'NLP extracts: chief complaint, diagnosis, treatment plan, medications, outcomes from spoken content',
            'Auto-populates structured note fields — provider reviews and approves before finalization',
            'Flags missing documentation elements based on diagnosis code and service type',
            'Auto-generates ICD-10-CM, CPT, and billing modifier suggestions from clinical text',
            'Notes locked after provider digital signature — no backdating without full audit trail',
            'Supports SOAP, DAP, progress notes, discharge summaries, operative reports',
            'Crisis language detection — triggers supervisor alert and crisis plan review',
            'Documentation completeness score required before associated claim can be submitted',
        ]),
        ('Module 2: Biometric Identity Verification', [
            'Facial recognition at point of service for providers, staff, and patients',
            'Fingerprint/thumbprint verification as primary or secondary authentication',
            'Multi-factor authentication for all remote portal access',
            'Emergency responder lookup — biometric scan returns full emergency profile in under 3 seconds',
            'Biometric identity permanently linked to Medicaid ID, NPI, and crisis plan',
            'Liveness detection — system verifies real person, not photo or recording',
            'All biometric data stored as irreversible AES-256 encrypted hashes',
            'Every verification event logged: timestamp, location, device ID, user role',
            'Failed verification attempts trigger escalation alert and temporary service hold',
        ]),
        ('Module 3: Provider Credentialing Across 50 States', [
            'Single universal application — provider enters information once for all states',
            'AI OCR scans diplomas, licenses, certifications, insurance, DEA registration',
            'NLP extracts: license numbers, expiration dates, issuing authority, disciplinary notations',
            'Primary source verification queries all 50 state boards simultaneously in parallel',
            'PECOS, OIG LEIE, and SAM.gov exclusion checks happen automatically at submission',
            'Risk-based categorization: Limited, Moderate, High — determines verification path',
            'High-risk providers: site visit scheduling and fingerprint background checks initiated',
            'Human credentialing specialist reviews all AI-extracted data before final approval',
            'Approval automatically pushes to state MMIS and all MCO systems — no rekeying',
            '3–5 day turnaround vs. 60–120 day industry standard',
            'Continuous monthly monitoring: license status, exclusions, disciplinary actions',
            '90/60/30/14/7-day credential expiration alerts across all licenses in all states',
            'Automatic billing suspension if credentials lapse — provider cannot bill on expired credentials',
        ]),
        ('Module 4: Claim Generation & Submission', [
            'EDI 837P professional claims — physician, therapy, behavioral health services',
            'EDI 837I institutional claims — hospital, facility, home health',
            'NCPDP D.0 pharmacy claims — retail, mail-order, controlled substances',
            'HCPCS-coded claims — DMEPOS and NEMT services',
            'Real-time eligibility verification before every claim submission',
            'Third-party liability check — primary/secondary payer order determined automatically',
            'Claim scrubbing: coding errors, missing fields, modifier conflicts caught pre-submission',
            'PA status verified — claims requiring authorization held until approval number obtained',
            'EDI 835 remittance advice processed automatically — payments posted to provider accounts',
            'Real-time claim status tracking: accepted, pending, denied, paid',
            'Timely filing rules enforced — alerts on approaching deadlines per payer',
            'Home health NOA generated and submitted within 5-day window automatically',
            'School-based Medicaid claims under LEA provider entity with IEP service linkage',
        ]),
        ('Module 5: AI-Assisted Fraud Prevention Engine', [
            'Pre-submission validation: claim cross-checked against clinical documentation',
            'Service confirmation: biometric provider presence, GPS location, timestamped notes required',
            'Anomaly detection: billing spikes, unusual codes, geographic mismatches',
            'Peer comparison: every provider benchmarked against specialty/geography peers',
            'Upcoding detection: service complexity vs. documentation complexity',
            'Duplicate billing detection across all payers simultaneously',
            'Ghost patient detection: claims for patients with no other system activity',
            'Transportation fraud: GPS routing vs. mileage billed',
            'Prescription fraud: prescription cross-referenced against clinical encounter',
            'DME fraud: delivery confirmed biometrically before claim submitted',
            'Risk scoring 1–100: low auto-approves, medium routes to human, high is held',
            'Post-payment surveillance: patterns analyzed even after payment for systematic fraud',
            'Graph Neural Network: identifies fraud rings — provider-patient billing networks',
            'All AI flags are explainable — plain-language reason attached to every flag',
            'Human investigator makes all final determinations — AI never unilaterally denies',
        ]),
        ('Module 6: Prior Authorization Management', [
            'Real-time PA requirement check before service is rendered',
            'AI auto-drafts PA justification narrative from clinical documentation',
            'NLP matches clinical facts against payer approval criteria',
            'Submitted electronically via payer APIs — CMS interoperability mandate compliant (Jan 2027)',
            'Standard PA: 7-day deadline. Expedited: 72-hour. Drug PA: 24-hour tracking',
            'Human PA specialist reviews AI recommendation before submission',
            'Approved PA numbers automatically attached to associated claims',
            'PA denial triggers appeal workflow — AI drafts appeal with supporting clinical evidence',
            'Real-time PA status dashboard for all pending, approved, and denied requests',
        ]),
        ('Module 7: Denial Management & Appeals', [
            'All denials captured automatically from EDI 835 remittance files',
            'AI categorizes denial by reason code: eligibility, auth, documentation, coding, timely filing',
            'AI suggests corrective action for each denial type based on payer rules',
            'Human appeals specialist reviews suggestion and approves or overrides',
            'Corrected claims auto-populated — one-click resubmission',
            'Appeal letters auto-drafted with clinical evidence attached',
            'Appeal deadlines tracked per payer — alerts at 30, 14, and 7 days',
            'Denial trend analysis: identifies systematic patterns by payer, provider, service',
            'Revenue recovery tracking: dollars recovered through successful appeals',
        ]),
        ('Module 8: Crisis Plan & Emergency Response', [
            'Every Medicaid beneficiary with behavioral health diagnosis has a stored crisis plan',
            'Plans include: triggers, de-escalation strategies, emergency contacts, preferred hospital, meds, DNR',
            'Updated every encounter where crisis-related documentation is detected',
            'Machine-readable format: structured fields for rapid emergency responder retrieval',
            'Emergency portal: biometric scan at any scene returns crisis plan in under 3 seconds',
            '911 CAD integration: push patient record to responding unit before arrival',
            'Post-crisis follow-up: auto-generates appointment request, notifies primary provider',
            'Crisis billing: mobile crisis and stabilization services auto-billed from encounter',
            'Supervisor alert: crisis notation in any note immediately escalates to supervisor',
        ]),
        ('Module 9: Real-Time Eligibility Verification', [
            'Queries state Medicaid eligibility systems in real time at point of service',
            'Verifies active enrollment, plan type (FFS vs. managed care), MCO assignment, coverage dates',
            'CHIP eligibility check for pediatric patients',
            'Medicare primary/secondary check for dually eligible beneficiaries',
            'Commercial insurance check for coordination of benefits — billing order determined',
            'Eligibility verification stored in claim record — full audit trail',
            'Failed eligibility triggers patient status resolution — not automatic denial',
            'Batch eligibility checks: verify entire patient roster nightly for high-volume facilities',
        ]),
        ('Module 10: Statewide One-Call Hub', [
            'Single 1-800 number per state handles all non-emergency Medicaid calls',
            'AI chatbot handles 90% of routine inquiries: claim status, eligibility, transport booking, PA status',
            'Tier-2 human agents handle complex cases: billing disputes, credentialing issues, appeals',
            'Crisis counseling specialists available 24/7 for mental health support calls',
            'Every call recorded, transcribed, AI-analyzed for anomalies and fraud flags',
            'Call volume dashboards: real-time tracking by issue type, resolution time, satisfaction',
            'Compliance: 100% call log audit trail for all state and federal reviews',
            'Hub data feeds back into platform — spikes in certain call types trigger upstream fixes',
        ]),
        ('Module 11: Compliance, Reporting & Analytics', [
            'PERM audit data automatically generated in CMS-required formats',
            'Provider dashboards: claims submitted, approval rates, denial rates, fraud flags',
            'State dashboards: volumes, service distribution, improper payment rates, credentialing pipeline',
            'MCO performance: MLR, PA approval rates, network adequacy metrics',
            'Fraud prevention reports: claims stopped, dollars saved, risk flags resolved monthly',
            'HIPAA access logs: complete audit trail of who accessed what PHI, when, from where',
            'OIG seven-component compliance tracking',
            'Exportable in CMS formats: XML, CSV, EDI',
            'Custom report builder for state agencies and compliance teams',
        ]),
        ('Module 12: AI Governance & Human Oversight Framework', [
            'AI-assisted, never AI-autonomous — every consequential decision requires human sign-off',
            'Low-risk claims auto-process with no human intervention',
            'Medium-risk: AI flag with explanation and suggested action → human specialist reviews',
            'High-risk: AI flag with full evidence package → human investigator determines outcome',
            'All AI decisions include plain-language explanation — no black box',
            'AI model performance monitored: accuracy, false positive, false negative rates tracked continuously',
            'Human overrides logged and used to retrain AI models quarterly',
            'Bias monitoring: AI models audited quarterly for disparate impact',
            'State regulators can audit AI decision logic — full transparency',
            'AI reduces manual volume by 70–80% — transforms jobs, does not eliminate them',
        ]),
    ]

    for mod_title, caps in modules:
        story.append(PageBreak()) if len(story) % 60 == 0 else None
        box(story, mod_title, s)
        for cap in caps:
            story.append(Paragraph(f'• {cap}', s['Bul']))
        story.append(Spacer(1, 8))

    foot(story, s, '2', 'What It Can Do')

mk('/mnt/user-data/outputs/02_MedGuard360_What_It_Can_Do.pdf', d2)


# ─────────────────────────────────────────────────────────────
# DOC 3  BUILD BLUEPRINT
# ─────────────────────────────────────────────────────────────
def d3(story, s):
    cover(story, s, '3', 'MedGuard360',
          'Unified Medicaid & Medicare Fraud Prevention Platform',
          'Build Blueprint  ·  TRG TechLink  ·  Proprietary  ·  2026')

    story.append(Paragraph('Section 1: Technology Stack', s['SecH'])); story.append(div())
    stack = [
        ['Layer','Technology','Purpose'],
        ['Frontend','Next.js 14 + TypeScript + Tailwind + shadcn/ui','All 20 role-based portals'],
        ['Mobile App','React Native / Expo (iOS + Android + Desktop)','App-on-every-device — all form factors'],
        ['Real-Time','Socket.IO','Live documentation, claim status, alerts'],
        ['Video','LiveKit','Clinical encounter video capture and storage'],
        ['Auth','Clerk + JWT + Biometric SDK','MFA, biometric, role-based access control'],
        ['Backend','Node.js v25.9.0 + Express.js','20+ microservices — PM2 managed'],
        ['AI/ML Engine','Python 3.10+ FastAPI','NLP, OCR, fraud detection, risk scoring'],
        ['Primary DB','PostgreSQL primary + 2 replicas (5432–5434)','All transactional data'],
        ['Cache','Redis 3-node cluster (6379–6381)','Eligibility cache, sessions, rate limiting'],
        ['Search','Elasticsearch (ELK Stack)','Claims analytics, audit log search'],
        ['Message Queue','Apache Kafka','Event streaming between microservices'],
        ['EDI Processing','Custom Node.js EDI engine','837P, 837I, 835, 270/271, NCPDP D.0'],
        ['Object Storage','MinIO (self-hosted S3-compatible)','Audio, video, documents — encrypted'],
        ['Hot Storage','PostgreSQL + Redis','Last 30 days — real-time querying'],
        ['Warm Storage','MinIO distributed object storage','6–12 months — compliance holds'],
        ['Cold Storage','MinIO archival tier / tape','7+ years — regulatory retention'],
        ['Reverse Proxy','nginx (TLS 1.3)','Multi-portal routing, rate limiting, security headers'],
        ['Monitoring','Prometheus + Grafana + AlertManager','20+ scrape targets, 41 alert rules'],
        ['Logging','ELK Stack (5+ Kibana dashboards)','Centralized logging, HIPAA audit trails'],
        ['Process Mgmt','PM2','Auto-restart, cluster mode for all Node services'],
        ['Security','iptables + fail2ban + AES-256','Network rules, intrusion prevention, encryption'],
        ['Secrets','/ opt/credential-vault/','API keys, MMIS credentials — never hardcoded'],
        ['Dev Tools','Git + npm + TypeScript + ESLint + Prettier','Version control, linting, formatting'],
        ['Testing','Jest (unit) + Playwright (e2e)','Full test coverage required on all services'],
    ]
    t = Table(stack, colWidths=[1.5*inch, 2.5*inch, 2.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),NAV),('TEXTCOLOR',(0,0),(-1,0),WHITE),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#FAFAFA'),LBG]),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
        ('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),
        ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(t)

    story.append(PageBreak())
    story.append(Paragraph('Section 2: Microservices Map (20 Services)', s['SecH'])); story.append(div())
    svcs = [
        ('auth-service','JWT issuance, Clerk integration, biometric token validation, RBAC enforcement'),
        ('provider-service','Provider profiles, NPI lookup, taxonomy validation, enrollment status'),
        ('credentialing-service','Credentialing workflows, OCR, primary source verification, PECOS/LEIE checks'),
        ('patient-service','Patient demographics, Medicaid ID, crisis plans, biometric identity linkage'),
        ('eligibility-service','Real-time Medicaid/Medicare/commercial eligibility queries, COB determination'),
        ('prior-auth-service','PA request generation, payer API submission, status tracking, appeal initiation'),
        ('clinical-doc-service','Audio transcription, NLP note analysis, coding suggestion, completeness scoring'),
        ('claims-service','EDI 837P/837I/NCPDP generation, scrubbing, submission, 835 remittance processing'),
        ('fraud-engine-service','ML anomaly detection, risk scoring, peer comparison, GNN fraud ring analysis'),
        ('denial-service','Denial capture, categorization, appeal drafting, resubmission, deadline tracking'),
        ('pharmacy-service','NCPDP D.0 processing, formulary, controlled substance verification, MTM billing'),
        ('dme-service','DMEPOS validation, face-to-face confirmation, delivery tracking, HCPCS billing'),
        ('nemt-service','Trip scheduling, GPS route tracking, driver credentialing, mileage verification'),
        ('crisis-service','Crisis plan storage, 911 integration, emergency responder API, follow-up workflows'),
        ('hub-service','1-800 hub routing, AI chatbot, call recording, transcription, compliance logging'),
        ('reporting-service','PERM data, state compliance reports, provider dashboards, MCO analytics'),
        ('notification-service','Email, SMS, in-app alerts — credentials, claims, fraud flags, PA decisions'),
        ('state-config-service','State configuration packages, rules engine, MMIS connection parameters'),
        ('audit-log-service','Append-only event logging, HIPAA access logs, AI decision logs'),
        ('hie-service','FHIR R4 data exchange, referral workflows, patient consent management'),
    ]
    svc_tbl = [['Service', 'Core Responsibility']] + [[n,d] for n,d in svcs]
    t = Table(svc_tbl, colWidths=[2.0*inch, 4.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),BLUE),('TEXTCOLOR',(0,0),(-1,0),WHITE),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8),
        ('FONTNAME',(0,1),(0,-1),'Helvetica-BoldOblique'),('TEXTCOLOR',(0,1),(0,-1),NAV),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#FAFAFA'),LBG]),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
        ('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),
        ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(t)

    story.append(PageBreak())
    story.append(Paragraph('Section 3: AI Engine Configuration (10 Engines)', s['SecH'])); story.append(div())
    engines = [
        ('AI Engine 1: Speech-to-Text',
         'Whisper (self-hosted) or Deepgram. Streams real-time transcription with speaker diarization. '
         'Output available within 2 seconds of speech. Feeds clinical-doc-service.'),
        ('AI Engine 2: Clinical NLP & Code Suggestion',
         'Fine-tuned LLM + scispaCy/MedSpaCy. Extracts diagnoses, symptoms, procedures, medications. '
         'Suggests ICD-10-CM, CPT, modifiers. Human coder approves all suggestions before claim submission.'),
        ('AI Engine 3: OCR & Document Intelligence',
         'Tesseract OCR + deep learning document classifier. Reads diplomas, licenses, certifications. '
         'Extracts structured fields. Human credentialing specialist verifies before any verification proceeds.'),
        ('AI Engine 4: Fraud Anomaly Detection',
         'Isolation Forest (unsupervised) + XGBoost (supervised). Risk score 1–100 per claim. '
         '<30 auto-approve. 30–70 human review. >70 hold and investigate. Retrained monthly.'),
        ('AI Engine 5: Graph Neural Network — Fraud Ring Detection',
         'PyTorch Geometric GNN. Analyzes provider-patient-claim network graph nightly. '
         'Identifies organized fraud ring clusters. Flags to human fraud investigators.'),
        ('AI Engine 6: PA NLP Matching',
         'BERT-based semantic similarity. Matches clinical documentation against payer PA criteria. '
         'Generates preliminary approval recommendation. Human PA specialist reviews before submission.'),
        ('AI Engine 7: Denial Prediction & Appeal Drafting',
         'Gradient Boosted Trees for denial prediction + GPT-style model for appeal letter drafting. '
         'Human appeals specialist reviews and approves before any resubmission.'),
        ('AI Engine 8: Continuous Provider Monitoring',
         'Daily automated queries: state medical boards, OIG LEIE, SAM.gov, disciplinary databases. '
         'Low-risk changes auto-logged. High-risk changes (exclusion, revocation) trigger immediate hold + alert.'),
        ('AI Engine 9: Crisis Detection in Documentation',
         'Fine-tuned text classifier for behavioral health crisis language. Severity levels: low/medium/high. '
         'High severity triggers supervisor notification. Clinical determination always made by human.'),
        ('AI Engine 10: Eligibility & Benefits Intelligence',
         'Rules-based + ML. Predicts eligibility status, plan assignment, benefits summary. '
         'Queries live state systems for confirmation. Human specialist resolves mismatches.'),
    ]
    for eng, desc in engines:
        box(story, eng, s, colors.HexColor('#F0F4FF'))
        story.append(Paragraph(desc, s['Body']))

    story.append(PageBreak())
    story.append(Paragraph('Section 4: External System Integrations', s['SecH'])); story.append(div())
    integrations = [
        'State MMIS Systems (All 50 States) — SFTP + REST API adapters. NCTracks, GAMMIS, Medi-Cal, etc.',
        'CMS PECOS — Provider exclusion and enrollment status API',
        'OIG LEIE — Monthly full file download + real-time query API',
        'SAM.gov — Federal debarment and exclusion automated queries',
        'NPPES — NPI lookup and validation API',
        'State Medical Boards (All 50) — License status, expiration, disciplinary actions',
        'Pharmacy Switch Networks — RelayHealth, Emdeon: NCPDP D.0 routing',
        'MCO APIs (Per State) — PA APIs, eligibility APIs, claim adjudication per MCO',
        'CMS Prior Authorization APIs — CMS Interoperability Final Rule (mandatory Jan 2027)',
        'State HIEs — FHIR R4 compliant data exchange, referral workflows',
        '911 / CAD Systems — Push patient emergency profile to responding units',
        'IRS / SSA — Tax ID and SSN verification for provider enrollment',
        'DEA — Registration verification for controlled substance prescribers',
        'Joint Commission / NCQA — Facility accreditation verification',
        'Medicare PECOS and MAC Systems — Dual eligibility billing coordination',
    ]
    for item in integrations:
        story.append(Paragraph(f'• {item}', s['Bul']))

    story.append(PageBreak())
    story.append(Paragraph('Section 5: Phased Build Plan', s['SecH'])); story.append(div())
    build_phases = [
        ('Phase 1 — Foundation (Months 1–6)', [
            'auth-service: biometric login, Clerk, 20 role types',
            'provider-service + patient-service: core data models',
            'credentialing-service: OCR, primary source verification for NC/SC/GA',
            'eligibility-service: NC Medicaid eligibility API',
            'clinical-doc-service: audio transcription, NLP note analysis',
            'claims-service: 837P/837I generation, NCTracks submission',
            'Basic fraud-engine-service: rule-based fraud checks',
            'state-config-service: NC configuration package',
            'audit-log-service: append-only logging',
            'PM2 deployment + Prometheus/Grafana monitoring for all services',
        ]),
        ('Phase 2 — Expansion (Months 7–12)', [
            'SC and GA state configuration packages and MMIS integrations',
            'pharmacy-service: NCPDP D.0 integration',
            'dme-service: DMEPOS validation and HCPCS billing',
            'nemt-service: GPS tracking, trip verification, billing',
            'prior-auth-service: PA workflows for NC/SC/GA MCOs',
            'denial-service: denial capture, AI appeal drafting',
            'crisis-service: crisis plan management, emergency responder API',
            'hub-service: 1-800 hub AI chatbot + human routing',
            'ML anomaly detection + GNN fraud ring detection',
            'Launch patient portal with biometric identity',
            'Onboard first 500 providers across 3 states',
        ]),
        ('Phase 3 — AI & MCO Integration (Months 13–18)', [
            'All MCOs in NC/SC/GA: parallel credentialing, PA APIs, claim adjudication',
            'hie-service: FHIR R4 integration with state HIEs',
            'School-based billing module under claims-service',
            'Home health billing module: PDGM, HIPPS codes, NOA submission',
            'Telehealth modifier logic: state-specific telehealth rules',
            'Behavioral health routing: LME/MCO pathways, supervision billing',
            'reporting-service: PERM audit data, state compliance reports',
            'Onboard 5 southeastern states with standardized config package',
            'Begin CMS clearinghouse certification process',
        ]),
        ('Phase 4 — National Scale (Months 19–36)', [
            'All remaining states — configuration packages in 6–8 week cycles',
            'billing-admin-service: user fees, clearinghouse commission tracking',
            'Complete CMS certification as approved EDI submitter',
            '911/CAD dispatch integration in participating states',
            'AI Engines 6 and 7 in production (PA NLP + denial prediction)',
            'Direct CMS PERM data submission pipeline active',
            'Target: 35+ states, 10,000+ providers, 1M+ claims/month',
            'Federal contracting discussions for CMS program integrity partnership',
        ]),
    ]
    for phase, tasks in build_phases:
        box(story, phase, s)
        for task in tasks:
            story.append(Paragraph(f'• {task}', s['Bul']))
        story.append(Spacer(1,6))

    story.append(PageBreak())
    story.append(Paragraph('Section 6: Regulatory & Compliance Requirements', s['SecH'])); story.append(div())
    regs = [
        ('HIPAA Privacy & Security (45 CFR 160/164)', 'PHI encryption, BAAs, annual risk assessments, breach notification within 60 days'),
        ('HITECH Act', 'Enhanced penalties, EHR meaningful use standards, breach notification'),
        ('42 CFR Part 455', 'Medicaid provider enrollment: risk-based screening, site visits, background checks, exclusion lists'),
        ('42 CFR Part 456', 'Utilization control: medical necessity documentation, prior authorization standards'),
        ('MITA Framework', 'Medicaid Information Technology Architecture: interoperability and modularity standards'),
        ('CMS Interoperability Final Rule', 'FHIR R4 APIs, prior authorization API mandatory by January 2027'),
        ('EDI Standards (45 CFR Part 162)', 'HIPAA-mandated transactions: 837P, 837I, 835, 270/271, 276/277, NCPDP D.0'),
        ('NCQA Credentialing Standards', 'Primary source verification, revalidation cycles, continuous monitoring'),
        ('OIG Compliance Program Guidance', 'Seven core compliance program elements tracked for all provider organizations'),
        ('42 CFR Part 2', 'Substance use disorder records — additional confidentiality, separate consent for data sharing'),
        ('IDEA / School-Based Medicaid', '34 CFR 300.154 — interagency agreement requirements for school-based billing'),
        ('Social Security Act §1936', 'Audit-ready data for MIC and UPIC audit requests'),
    ]
    reg_tbl = [['Regulation', 'Requirement']] + [[r, d] for r, d in regs]
    t = Table(reg_tbl, colWidths=[2.3*inch, 4.2*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),NAV),('TEXTCOLOR',(0,0),(-1,0),WHITE),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#FAFAFA'),LBG]),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
        ('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),
        ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(t)
    foot(story, s, '3', 'Build Blueprint')

mk('/mnt/user-data/outputs/03_MedGuard360_Build_Blueprint.pdf', d3)


# ─────────────────────────────────────────────────────────────
# DOC 4  TECHNICAL STACK & EQUIPMENT
# ─────────────────────────────────────────────────────────────
def d4(story, s):
    cover(story, s, '4', 'MedGuard360',
          'Technical Stack & Infrastructure Requirements',
          'Equipment, APIs, Software & Storage  ·  TRG TechLink  ·  Proprietary  ·  2026')

    story.append(Paragraph('Section 1: Server Infrastructure Requirements', s['SecH'])); story.append(div())
    story.append(Paragraph(
        'MedGuard360 runs on TRG TechLink\'s fully self-hosted stack. The following specifications '
        'define what is required at Phase 1 launch (3 states) and what is needed at full national scale (50 states).', s['Body']))

    servers = [
        ['Component','Phase 1 (3 States)','Full Scale (50 States)','Notes'],
        ['Primary App Servers','4x High-Memory Nodes\n64GB RAM / 32-core / 2TB NVMe each','20x High-Memory Nodes\n256GB RAM / 64-core / 4TB NVMe each','PM2 cluster mode, Node.js microservices'],
        ['PostgreSQL Primary DB','1x Database Server\n128GB RAM / 64-core / 10TB NVMe SSD','1x Database Server\n512GB RAM / 128-core / 50TB NVMe SSD','ACID compliance, row-level security'],
        ['PostgreSQL Replicas','2x Replica Servers\n64GB RAM / 32-core / 10TB NVMe each','4x Replica Servers\n256GB RAM / 64-core / 50TB NVMe each','Read replicas, auto-failover'],
        ['Redis Cluster','3-node cluster\n32GB RAM / 16-core per node','3-node cluster (scaled)\n128GB RAM / 32-core per node','Ports 6379–6381, session & cache'],
        ['AI/ML GPU Servers','2x GPU Servers\nNVIDIA A100 80GB x2 each','6x GPU Servers\nNVIDIA A100 80GB x4 each','NLP, OCR, fraud ML, GNN models'],
        ['Hot Storage (MinIO)','200TB raw capacity\n(RAID-6 protected)','2PB raw capacity\n(erasure coded)','Last 30 days audio/video/docs'],
        ['Warm Storage (MinIO)','1PB raw capacity','20PB raw capacity','6–12 months compliance holds'],
        ['Cold Storage (Archival)','2PB tape or object storage','100PB+ archival storage','7+ year regulatory retention'],
        ['Kafka Cluster','3 brokers\n16GB RAM / 8-core each','9 brokers\n64GB RAM / 32-core each','Event streaming between services'],
        ['Elasticsearch Cluster','3 nodes\n32GB RAM / 16-core each','9 nodes\n128GB RAM / 64-core each','Audit logs, analytics, search'],
        ['nginx Reverse Proxy','2x Load Balancer\n16GB RAM / 8-core each (HA pair)','4x Load Balancer\n32GB RAM / 16-core each (HA)','TLS 1.3, multi-portal routing'],
        ['Monitoring Stack','1x Server\nPrometheus + Grafana + AlertManager','2x Servers HA pair\nPrometheus + Grafana + AlertManager','20+ scrape targets, 41 alert rules'],
        ['Backup Servers','2x Backup Nodes\n4TB NVMe + 100TB tape','4x Backup Nodes\n10TB NVMe + 1PB tape','AES-256 encrypted, daily full'],
        ['VoIP/Hub Servers','2x Call Center Servers\n32GB RAM / 16-core each','10x Call Center Servers\n64GB RAM / 32-core each','1-800 hub, AI chatbot, recording'],
        ['HSM / Secrets Vault','1x Hardware Security Module','2x HSM (HA pair)','Biometric key storage, /opt/credential-vault/'],
    ]
    t = Table(servers, colWidths=[1.5*inch, 1.7*inch, 1.7*inch, 1.6*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),NAV),('TEXTCOLOR',(0,0),(-1,0),WHITE),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),7),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#FAFAFA'),LBG]),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
        ('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),
        ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(t)

    story.append(PageBreak())
    story.append(Paragraph('Section 2: Network & Security Equipment', s['SecH'])); story.append(div())
    net = [
        ['Equipment','Specification','Purpose'],
        ['Core Switches','100Gbps spine-leaf architecture\nJuniper/Cisco enterprise grade','Internal server interconnects'],
        ['Edge Routers','Dual 10Gbps uplinks\nBGP routing, redundant ISP','Internet edge, failover'],
        ['Hardware Firewalls','Palo Alto PA-5400 series (HA pair)','Perimeter security, IDS/IPS'],
        ['VPN Appliances','Fortinet FortiGate 600F','Secure remote admin access'],
        ['DDoS Protection','Cloudflare Enterprise or Arbor\n100Gbps scrubbing capacity','DDoS mitigation at edge'],
        ['Hardware Security Module','Thales Luna 7 or equivalent\nFIPS 140-2 Level 3','Biometric encryption key storage'],
        ['Biometric Scanners','Suprema BioStation A2 (fingerprint)\n3M/NEC facial recognition cameras','Provider and patient enrollment'],
        ['IP Cameras (Data Centers)','Physical security — server rooms','Unauthorized access prevention'],
        ['UPS Systems','APC Smart-UPS 20kVA per rack row','Power redundancy'],
        ['Backup Generators','Diesel generator — 100% load capacity','Full facility failover power'],
    ]
    t = Table(net, colWidths=[1.8*inch, 2.7*inch, 2.0*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),BLUE),('TEXTCOLOR',(0,0),(-1,0),WHITE),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#FAFAFA'),LBG]),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
        ('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),
        ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(t)

    story.append(PageBreak())
    story.append(Paragraph('Section 3: Software Licenses & Tools', s['SecH'])); story.append(div())
    sw = [
        ['Software / Tool','License Type','Purpose'],
        ['Node.js v25.9.0','Open Source (MIT)','Backend microservices runtime'],
        ['Python 3.10+','Open Source (PSF)','AI/ML engine runtime'],
        ['PostgreSQL','Open Source (PostgreSQL License)','Primary relational database'],
        ['Redis','Open Source (BSD)','Caching and session management'],
        ['Apache Kafka','Open Source (Apache 2.0)','Event streaming between services'],
        ['Elasticsearch','Elastic License (commercial for production)','Search, analytics, audit logs'],
        ['MinIO','GNU AGPL v3 / Commercial','Object storage for audio/video/docs'],
        ['nginx','Open Source (BSD-2) / NGINX Plus','Reverse proxy, load balancing, TLS'],
        ['PM2','Open Source (AGPL) / PM2 Plus','Process management for Node services'],
        ['Prometheus + Grafana','Open Source (Apache 2.0)','Monitoring and dashboards'],
        ['Next.js 14','Open Source (MIT)','Frontend portal framework'],
        ['React Native / Expo','Open Source (MIT)','Cross-platform mobile and desktop apps'],
        ['Clerk','Commercial SaaS','Authentication and user management'],
        ['Socket.IO','Open Source (MIT)','Real-time bidirectional communication'],
        ['LiveKit','Open Source / Commercial','Video capture and streaming'],
        ['Whisper (OpenAI)','Open Source (MIT)','Speech-to-text transcription engine'],
        ['scispaCy + MedSpaCy','Open Source (MIT)','Clinical NLP processing'],
        ['PyTorch + Geometric','Open Source (BSD)','ML and GNN fraud detection models'],
        ['XGBoost','Open Source (Apache 2.0)','Supervised fraud classification'],
        ['Tesseract OCR','Open Source (Apache 2.0)','Document digitization for credentialing'],
        ['Hugging Face Transformers','Open Source (Apache 2.0)','BERT-based PA NLP matching'],
        ['FastAPI','Open Source (MIT)','AI engine REST API framework'],
        ['Stripe','Commercial SaaS','User fee billing and subscription management'],
        ['Twilio / AWS Connect','Commercial','VoIP infrastructure for 1-800 hub'],
        ['Nodemailer','Open Source (MIT)','Email notifications'],
        ['Jest + Playwright','Open Source (MIT)','Unit and e2e testing'],
        ['ESLint + Prettier','Open Source (MIT)','Code linting and formatting'],
        ['TypeScript','Open Source (Apache 2.0)','Type-safe development across all services'],
        ['Docker Compose','Open Source (Apache 2.0)','Infrastructure component orchestration'],
        ['Git','Open Source (GPL v2)','Version control'],
        ['fail2ban','Open Source (GPL)','SSH/nginx/DB intrusion prevention'],
    ]
    t = Table(sw, colWidths=[2.2*inch, 2.0*inch, 2.3*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),NAV),('TEXTCOLOR',(0,0),(-1,0),WHITE),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),7.5),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#FAFAFA'),LBG]),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
        ('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),
        ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(t)

    story.append(PageBreak())
    story.append(Paragraph('Section 4: External API Integrations & Estimated Costs', s['SecH'])); story.append(div())
    apis = [
        ['API / Service','Provider','Integration Method','Est. Annual Cost'],
        ['State MMIS Systems (50)','Per State','SFTP + REST adapters','$0 (state-paid)'],
        ['CMS PECOS','CMS Federal','REST API','$0 (federal, free)'],
        ['OIG LEIE','OIG HHS','File download + API','$0 (federal, free)'],
        ['SAM.gov','GSA','REST API','$0 (federal, free)'],
        ['NPPES NPI Registry','CMS','REST API','$0 (federal, free)'],
        ['State Medical Boards (50)','Each State Board','API/Scraping mix','$0–$50K setup'],
        ['Pharmacy Switch (RelayHealth)','RelayHealth/Change Healthcare','NCPDP D.0','$50K–$200K/yr'],
        ['MCO APIs (per state)','Varied MCOs','REST/SOAP per MCO','$0–$100K/yr (varies)'],
        ['Clerk (Auth)','Clerk.dev','SDK + API','$25K–$100K/yr'],
        ['Deepgram (Speech-to-Text)','Deepgram','REST API / Streaming','$50K–$500K/yr (volume)'],
        ['Twilio (1-800 Hub)','Twilio','REST API + Voice SDK','$100K–$1M/yr (volume)'],
        ['Stripe (Billing)','Stripe','SDK + Webhooks','2.9% + $0.30/transaction'],
        ['LiveKit (Video)','LiveKit','SDK + Self-hosted','$20K–$100K/yr'],
        ['DEA Verification','DEA','API','TBD — federal access'],
        ['Biometric SDK','Suprema / NEC','SDK license','$50K–$200K/yr'],
        ['Cloudflare Enterprise','Cloudflare','DNS + DDoS + CDN','$100K–$500K/yr'],
    ]
    t = Table(apis, colWidths=[1.8*inch, 1.4*inch, 1.7*inch, 1.6*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),BLUE),('TEXTCOLOR',(0,0),(-1,0),WHITE),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),7.5),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#FAFAFA'),LBG]),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
        ('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),
        ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(t)

    story.append(PageBreak())
    story.append(Paragraph('Section 5: Storage Capacity Planning', s['SecH'])); story.append(div())
    story.append(Paragraph(
        'Every provider visit generates audio (1MB/min), video (10–50MB/hr), GPS pings, '
        'clinical notes, and metadata. At 5M visits/day across 50 states, daily ingestion '
        'is estimated at 5–15 petabytes. The tiered storage model manages this at scale.', s['Body']))
    storage = [
        ['Tier','Retention','Technology','Phase 1 Capacity','Full Scale Capacity'],
        ['Hot (Real-Time)','0–30 days','PostgreSQL + Redis + MinIO hot','200TB','2PB'],
        ['Warm (Compliance)','1–12 months','MinIO distributed object storage','1PB','20PB'],
        ['Cold (Archival)','1–7+ years','MinIO archival / tape backup','2PB','100PB+'],
        ['Backup','90 days full\n365 days incremental','Encrypted AES-256 off-site','500TB','10PB'],
        ['DR (Disaster Recovery)','Mirror of hot tier','Geographically separated node','200TB','2PB'],
    ]
    t = Table(storage, colWidths=[1.0*inch, 1.2*inch, 1.8*inch, 1.4*inch, 1.6*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),NAV),('TEXTCOLOR',(0,0),(-1,0),WHITE),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#FAFAFA'),LBG]),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
        ('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),
        ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(t)

    story.append(PageBreak())
    story.append(Paragraph('Section 6: Mobile App Technical Requirements', s['SecH'])); story.append(div())
    mobile = [
        ('Framework','React Native (Expo) — single codebase for iOS, Android, and desktop'),
        ('Offline Architecture','Offline-first design — SQLite local cache syncs to server when connectivity restored'),
        ('Audio Capture','Native device microphone with background recording, noise cancellation, compression'),
        ('Video Capture','Native camera API, hardware-accelerated H.264 compression before upload'),
        ('GPS Tracking','Background GPS polling every 30 seconds during active visits, geofencing triggers'),
        ('Biometric Auth','TouchID / FaceID on mobile. Windows Hello on desktop. Third-party scanner SDK for kiosks'),
        ('Push Notifications','Expo Push Notifications — credential alerts, claim status, fraud flags'),
        ('Encryption','AES-256 encryption of all local data. TLS 1.3 for all network calls'),
        ('Sync Protocol','Intelligent delta sync — only changed data transmitted. Compression before transmission'),
        ('Battery Optimization','GPS and audio only active during declared visit hours. Background sync over WiFi preferred'),
        ('Supported OS','iOS 16+, Android 12+, Windows 10+, macOS 12+, Linux (Ubuntu 22+)'),
        ('Device Form Factors','Phones, tablets, laptops, clinic workstations, emergency responder vehicle tablets'),
        ('MDM Compatibility','Microsoft Intune / Jamf compatible for enterprise fleet management'),
    ]
    for field, val in mobile:
        story.append(Paragraph(f'<b>{field}:</b> {val}', s['Bul']))
        story.append(Spacer(1,3))

    foot(story, s, '4', 'Technical Stack & Equipment')

mk('/mnt/user-data/outputs/04_MedGuard360_Technical_Stack.pdf', d4)


# ─────────────────────────────────────────────────────────────
# DOC 5  PITCH DECK
# ─────────────────────────────────────────────────────────────
def dark_slide(story, s, headline, sub=''):
    """Full-width dark header slide block"""
    content = [[Paragraph(headline, s['PitchBig']),
                Paragraph(sub, s['PitchSub']) if sub else Spacer(1,1)]]
    t = Table(content, colWidths=[6.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),NAV),
        ('LEFTPADDING',(0,0),(-1,-1),24),('RIGHTPADDING',(0,0),(-1,-1),24),
        ('TOPPADDING',(0,0),(-1,-1),32),('BOTTOMPADDING',(0,0),(-1,-1),32),
    ]))
    story.append(t)
    story.append(Spacer(1,0.2*inch))

def stat_row(story, s, stats):
    """Row of big stat numbers"""
    cells = []
    for num, lbl in stats:
        cells.append([Paragraph(num, s['StatNum']), Paragraph(lbl, s['StatLbl'])])
    t = Table([cells], colWidths=[6.5*inch/len(stats)]*len(stats))
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),LBG),
        ('ALIGN',(0,0),(-1,-1),'CENTER'),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
        ('TOPPADDING',(0,0),(-1,-1),16),('BOTTOMPADDING',(0,0),(-1,-1),16),
        ('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#DDDDDD')),
    ]))
    story.append(t)
    story.append(Spacer(1,0.15*inch))

def kpi_row(story, s, kpis, bg=LBG):
    cells = []
    for num, lbl, color in kpis:
        num_style = ParagraphStyle('kn', fontSize=26, leading=32, textColor=color,
                                   alignment=TA_CENTER, fontName='Helvetica-Bold')
        lbl_style = ParagraphStyle('kl', fontSize=9, leading=12, textColor=GRAY,
                                   alignment=TA_CENTER, fontName='Helvetica')
        cells.append([Paragraph(num, num_style), Paragraph(lbl, lbl_style)])
    t = Table([cells], colWidths=[6.5*inch/len(kpis)]*len(kpis))
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),bg),
        ('ALIGN',(0,0),(-1,-1),'CENTER'),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
        ('TOPPADDING',(0,0),(-1,-1),12),('BOTTOMPADDING',(0,0),(-1,-1),12),
        ('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#DDDDDD')),
    ]))
    story.append(t)
    story.append(Spacer(1,0.15*inch))

def feature_card(story, s, icon, title, desc, bg=LBG):
    t = Table([[Paragraph(f'<b>{icon}  {title}</b>', s['SubH']),
                Paragraph(desc, s['Body'])]], colWidths=[2.0*inch, 4.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),bg),
        ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
        ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(t)
    story.append(Spacer(1,6))

def section_title(story, s, text, color=NAV):
    sty = ParagraphStyle('st', fontSize=18, leading=24, textColor=color,
                         fontName='Helvetica-Bold', spaceBefore=16, spaceAfter=8)
    story.append(Paragraph(text, sty))
    story.append(HRFlowable(width='100%', thickness=2, color=ORNG, spaceAfter=10))

def two_col(story, items_left, items_right, s, w=3.1*inch):
    rows = []
    max_len = max(len(items_left), len(items_right))
    for i in range(max_len):
        l = Paragraph(f'• {items_left[i]}', s['Bul']) if i < len(items_left) else Spacer(1,1)
        r = Paragraph(f'• {items_right[i]}', s['Bul']) if i < len(items_right) else Spacer(1,1)
        rows.append([l, r])
    t = Table(rows, colWidths=[w, w])
    t.setStyle(TableStyle([
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('LEFTPADDING',(0,0),(-1,-1),4),
    ]))
    story.append(t)
    story.append(Spacer(1,8))

def d5(story, s):
    # ── SLIDE 1: COVER
    story.append(Spacer(1, 0.4*inch))
    dark_slide(story, s,
               'MedGuard360',
               'The Unified Medicaid & Medicare Fraud Prevention Platform\nPresented by TRG TechLink  ·  2026')
    story.append(Paragraph(
        'Confidential Pitch Presentation  ·  For State Medicaid Agency Review Only', s['Cap']))

    story.append(PageBreak())

    # ── SLIDE 2: THE PROBLEM
    section_title(story, s, 'The Problem We Are Solving')
    story.append(Paragraph(
        'Medicaid and Medicare fraud costs the United States government between '
        '$80 and $100 billion every year. Current systems detect fraud AFTER money is already gone. '
        'Providers operate across dozens of disconnected systems. Credentialing takes 60–120 days. '
        'Patients have no unified identity. Emergency responders have no way to pull medical history in the field. '
        'Nobody talks to each other. The system is broken by design.', s['Body']))
    story.append(Spacer(1,0.1*inch))
    stat_row(story, s, [
        ('$100B+', 'Estimated Annual Medicaid & Medicare Fraud'),
        ('60–120', 'Days to Credential a Single Provider Today'),
        ('50', 'Disconnected State Medicaid Systems'),
        ('0', 'Unified Preventive Fraud Platforms in Existence'),
    ])

    story.append(PageBreak())

    # ── SLIDE 3: THE SOLUTION
    section_title(story, s, 'MedGuard360: The Solution')
    story.append(Paragraph(
        'MedGuard360 is the first unified, AI-assisted, human-verified platform that connects '
        'every provider, patient, state agency, MCO, pharmacy, transporter, and emergency responder '
        'in a single ecosystem — with real-time fraud prevention built in from the start.', s['Body']))
    story.append(Spacer(1,0.1*inch))
    features = [
        ('▶', 'Preventive Fraud by Design', 'Every claim validated against real-time documentation, GPS, timestamps, and biometrics before submission. Fraud cannot happen because the data proves it.'),
        ('▶', 'App on Every Device', 'Native mobile and desktop app for every user type. Provider in the field, clinic workstation, emergency responder tablet — all connected, all real-time.'),
        ('▶', 'Credentialing in 3–5 Days', 'What takes 60–120 days today takes 3–5 days. AI automates verification. Human approves. Provider starts billing immediately.'),
        ('▶', 'One Platform, All 50 States', 'State-agnostic core, state-configurable rules. Every state on the same platform. Scales from North Carolina today to all 50 states within 4 years.'),
        ('▶', 'Crisis Plans & Emergency Access', 'Every patient\'s crisis plan accessible to emergency responders via biometric scan in under 3 seconds. Life-saving technology built into billing infrastructure.'),
        ('▶', 'One Statewide Call Hub', 'Single 1-800 number per state. AI handles 90% of routine calls. Humans handle complexity. Every call logged, tracked, compliant.'),
    ]
    for icon, title, desc in features:
        feature_card(story, s, icon, title, desc)

    story.append(PageBreak())

    # ── SLIDE 4: HOW IT WORKS
    section_title(story, s, 'How It Works — Step by Step')
    steps = [
        ['Step', 'Action', 'What Happens'],
        ['1', 'Provider Applies', 'Single application submitted once for all states. AI scans and extracts all documents instantly.'],
        ['2', 'Credentialing (3–5 Days)', 'AI verifies across all 50 state boards, PECOS, OIG LEIE simultaneously. Human approves. Account activates automatically.'],
        ['3', 'Patient Enrolled', 'Patient biometric registered. Crisis plan created. Eligibility verified in real time. Identity linked permanently.'],
        ['4', 'Service Rendered', 'Provider app captures audio, video, GPS. AI transcribes notes. Documentation completeness scored before billing unlocks.'],
        ['5', 'Claim Generated', 'AI suggests billing codes from clinical content. Human approves. Claim scrubbed and submitted. Eligibility verified pre-submission.'],
        ['6', 'Fraud Check', 'AI scores every claim 1–100 for fraud risk. Low risk auto-approves. Medium/high routes to human investigator before payment.'],
        ['7', 'Payment Processed', 'Clean claims paid. Remittance posted automatically. Revenue tracked by provider, state, payer in real time.'],
        ['8', 'Continuous Monitoring', 'Monthly license checks, exclusion monitoring, billing pattern analysis. Problems flagged before they become fraud.'],
    ]
    t = Table(steps, colWidths=[0.4*inch, 1.3*inch, 4.8*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),NAV),('TEXTCOLOR',(0,0),(-1,0),WHITE),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
        ('FONTNAME',(0,1),(0,-1),'Helvetica-Bold'),('TEXTCOLOR',(0,1),(0,-1),ORNG),
        ('FONTSIZE',(0,0),(-1,-1),9),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#FAFAFA'),LBG]),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
        ('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(t)

    story.append(PageBreak())

    # ── SLIDE 5: PLATFORM MOCKUP — PROVIDER PORTAL
    section_title(story, s, 'Platform Mockup: Provider Portal (Desktop)')
    story.append(Paragraph('What a provider sees when they log in on their clinic workstation or laptop:', s['Body']))
    story.append(Spacer(1,6))

    # Mockup table: navigation + main panel
    nav_items = ['Dashboard', 'My Patients', 'Start Visit', 'Claims', 'Credentials', 'Prior Auth', 'Messages', 'Reports', 'Help']
    nav_cells = [[Paragraph(f'  {n}', ParagraphStyle('n', fontSize=9, textColor=WHITE, fontName='Helvetica', spaceAfter=8))] for n in nav_items]

    nav_tbl = Table(nav_cells, colWidths=[1.2*inch])
    nav_tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),NAV),
        ('LEFTPADDING',(0,0),(-1,-1),6),
        ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
    ]))

    # Main content panel
    main_content = [
        [Paragraph('Good morning, Dr. Johnson  |  License Active  ✓  |  5 Claims Pending  |  2 Alerts', ParagraphStyle('mc', fontSize=9, textColor=NAV, fontName='Helvetica-Bold')),],
        [HRFlowable(width='100%', thickness=1, color=BLUE)],
        [Paragraph('TODAY\'S SCHEDULE', ParagraphStyle('lh', fontSize=8, textColor=GRAY, fontName='Helvetica-Bold'))],
        [Paragraph('9:00 AM — Marcus Williams — Community Visit — GPS Verified ✓', ParagraphStyle('si', fontSize=9, textColor=DGRAY, fontName='Helvetica', spaceAfter=3))],
        [Paragraph('10:30 AM — Patricia Jones — Telehealth — Audio-Only — Pending', ParagraphStyle('si', fontSize=9, textColor=DGRAY, fontName='Helvetica', spaceAfter=3))],
        [Paragraph('1:00 PM — James Carter — Behavioral Health — Documentation Required', ParagraphStyle('si', fontSize=9, textColor=ORNG, fontName='Helvetica', spaceAfter=3))],
        [Spacer(1,6)],
        [Paragraph('RECENT CLAIMS', ParagraphStyle('lh', fontSize=8, textColor=GRAY, fontName='Helvetica-Bold'))],
        [Paragraph('Claim #88412 — Marcus Williams — $185.00 — Approved ✓', ParagraphStyle('si', fontSize=9, textColor=GRN, fontName='Helvetica', spaceAfter=3))],
        [Paragraph('Claim #88401 — Sandra Lee — $220.00 — Under Review (Fraud Score: 42)', ParagraphStyle('si', fontSize=9, textColor=ORNG, fontName='Helvetica', spaceAfter=3))],
        [Paragraph('Claim #88388 — Robert King — $95.00 — Denied: Missing PA — Appeal Ready', ParagraphStyle('si', fontSize=9, textColor=colors.red, fontName='Helvetica', spaceAfter=3))],
        [Spacer(1,6)],
        [Paragraph('⚠ CREDENTIAL ALERT: DEA Registration expires in 30 days — Click to Renew', ParagraphStyle('alert', fontSize=9, textColor=ORNG, fontName='Helvetica-Bold'))],
    ]
    main_tbl = Table(main_content, colWidths=[5.1*inch])
    main_tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#FAFAFA')),
        ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
        ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
    ]))

    outer = Table([[nav_tbl, main_tbl]], colWidths=[1.2*inch, 5.1*inch])
    outer.setStyle(TableStyle([
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('GRID',(0,0),(-1,-1),1,colors.HexColor('#CCCCCC')),
        ('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
        ('TOPPADDING',(0,0),(-1,-1),0),('BOTTOMPADDING',(0,0),(-1,-1),0),
    ]))
    story.append(outer)
    story.append(Spacer(1,6))
    story.append(Paragraph('Every panel above is live data, pulled in real time from the platform. No static pages.', s['Cap']))

    story.append(PageBreak())

    # ── SLIDE 6: PATIENT MOBILE APP MOCKUP
    section_title(story, s, 'Platform Mockup: Patient Mobile App')
    story.append(Paragraph('What a Medicaid beneficiary sees on their smartphone after logging in via fingerprint:', s['Body']))
    story.append(Spacer(1,8))

    def phone_row(label, value, color=DGRAY, bold=False):
        fn = 'Helvetica-Bold' if bold else 'Helvetica'
        return [Paragraph(label, ParagraphStyle('pl', fontSize=8, textColor=GRAY, fontName='Helvetica')),
                Paragraph(value, ParagraphStyle('pv', fontSize=9, textColor=color, fontName=fn))]

    phone_data = [
        phone_row('MEMBER', 'Marcus Williams  |  Medicaid ID: NC-2841977', NAV, True),
        phone_row('STATUS', '✓ Medicaid Active  ·  Blue Cross MCO  ·  Coverage Current', GRN, True),
        phone_row('PRIMARY CARE', 'Dr. Sarah Johnson  ·  TeleMed Clinic  ·  (919) 555-0122', BLUE),
        phone_row('LAST VISIT', 'May 8, 2026  ·  Community Visit  ·  Claim Approved $185', DGRAY),
        phone_row('UPCOMING', 'May 15, 2026  ·  Telehealth — 10:30 AM  ·  Add to Calendar', BLUE),
        phone_row('MEDICATIONS', 'Sertraline 100mg  ·  Refill Due May 20  ·  Tap to Request', ORNG),
        phone_row('CRISIS PLAN', '✓ Active  ·  Last Updated May 1, 2026  ·  View Plan', GRN),
        phone_row('BENEFITS', 'Medical  ✓  |  Behavioral Health  ✓  |  Transportation  ✓', DGRAY),
        phone_row('TRANSPORT', 'Request a Ride to Appointment  →', BLUE, True),
        phone_row('HELP', 'Call State Hub  ·  1-800-MED-GUARD  ·  Available 24/7', NAV),
    ]
    phone_tbl = Table(phone_data, colWidths=[1.4*inch, 4.0*inch])
    phone_tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),LGRAY),
        ('ROWBACKGROUNDS',(0,0),(-1,-1),[WHITE, LGRAY]),
        ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
        ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#DDDDDD')),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))

    outer_phone = Table([[phone_tbl]], colWidths=[5.5*inch])
    outer_phone.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),NAV),
        ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
        ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),
        ('ALIGN',(0,0),(-1,-1),'CENTER'),
    ]))
    story.append(outer_phone)

    story.append(PageBreak())

    # ── SLIDE 7: EMERGENCY RESPONDER MOCKUP
    section_title(story, s, 'Platform Mockup: Emergency Responder Scan')
    story.append(Paragraph(
        'A paramedic arrives on scene. Patient is unresponsive. They hold their tablet to the patient\'s face. '
        'This is what appears on screen within 3 seconds:', s['Body']))
    story.append(Spacer(1,8))

    er_header = Table([[
        Paragraph('🔒  BIOMETRIC MATCH CONFIRMED  ·  EMERGENCY RESPONDER ACCESS', ParagraphStyle('erh', fontSize=10, textColor=WHITE, fontName='Helvetica-Bold', alignment=TA_CENTER))
    ]], colWidths=[6.5*inch])
    er_header.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#B22222')),
        ('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10),
    ]))
    story.append(er_header)
    story.append(Spacer(1,4))

    er_data = [
        ['PATIENT', 'Marcus Antonio Williams  |  DOB: 03/14/1985  |  Medicaid ID: NC-2841977'],
        ['DIAGNOSIS', 'Bipolar I Disorder  ·  Generalized Anxiety  ·  Hypertension'],
        ['MEDICATIONS', 'Lithium 600mg (AM/PM)  ·  Lorazepam 1mg PRN  ·  Lisinopril 10mg'],
        ['ALLERGIES', '⚠  Penicillin — SEVERE  ·  Codeine — Moderate'],
        ['CRISIS TRIGGERS', 'Loud environments, sleep deprivation, missed medications'],
        ['DE-ESCALATION', 'Calm, quiet voice. Use first name. Give space. Do not touch without consent.'],
        ['PREFERRED HOSPITAL', 'WakeMed — North Campus  ·  (919) 350-8000'],
        ['EMERGENCY CONTACT', 'Sister — Latoya Williams  ·  (919) 555-0147  ·  Primary'],
        ['CARE TEAM', 'Dr. Sarah Johnson (PCP)  ·  (919) 555-0122  ·  Crisis Line: (919) 716-0000'],
        ['INSURANCE', 'Medicaid NC  ·  Blue Cross MCO  ·  Group: NC-BCB-441'],
        ['DNR STATUS', 'Full Code — No DNR on file'],
    ]
    er_tbl = Table(er_data, colWidths=[1.3*inch, 5.2*inch])
    er_tbl.setStyle(TableStyle([
        ('FONTNAME',(0,0),(0,-1),'Helvetica-Bold'),('TEXTCOLOR',(0,0),(0,-1),NAV),
        ('FONTSIZE',(0,0),(-1,-1),9),
        ('ROWBACKGROUNDS',(0,0),(-1,-1),[WHITE, LGRAY]),
        ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#DDDDDD')),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(er_tbl)
    story.append(Spacer(1,6))
    story.append(Paragraph('All information retrieved in under 3 seconds. No login required for authorized responders.', s['Cap']))

    story.append(PageBreak())

    # ── SLIDE 8: STATE MEDICAID AGENCY MOCKUP
    section_title(story, s, 'Platform Mockup: State Medicaid Agency Dashboard')
    story.append(Paragraph('What a state Medicaid program integrity officer sees on their dashboard every morning:', s['Body']))
    story.append(Spacer(1,8))

    kpi_row(story, s, [
        ('12,847', 'Claims Processed Today', BLUE),
        ('$4.2M', 'Total Billed Today', GRN),
        ('143', 'Fraud Flags (AI)', ORNG),
        ('7', 'High-Risk — Human Review', colors.HexColor('#B22222')),
        ('$18K', 'Fraud Stopped Today', GRN),
    ])

    story.append(Spacer(1,8))

    state_data = [
        ['Metric', 'This Month', 'Last Month', 'Trend'],
        ['Total Claims Submitted', '312,441', '298,002', '▲ +4.8%'],
        ['Clean Claims (Auto-Approved)', '287,813 (92.1%)', '271,004 (90.9%)', '▲ Improving'],
        ['Medium-Risk Claims Reviewed', '21,447', '23,882', '▼ Decreasing'],
        ['High-Risk Claims Held', '3,181', '3,116', '→ Stable'],
        ['Confirmed Fraud Cases', '112', '98', '▲ Monitored'],
        ['Dollars Recovered (Appeals)', '$442,000', '$388,000', '▲ +13.9%'],
        ['Providers Credentialed', '1,244', '986', '▲ +26.2%'],
        ['Credential Alerts Sent', '3,802', '4,118', '▼ Improving'],
        ['Avg. Credentialing Time', '4.1 days', '4.3 days', '▼ Improving'],
        ['Emergency Responder Scans', '847', '812', '▲ +4.3%'],
        ['Hub Call Volume', '14,392 calls', '13,889 calls', '▲ Managed'],
    ]
    state_tbl = Table(state_data, colWidths=[2.4*inch, 1.5*inch, 1.5*inch, 1.1*inch])
    state_tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),NAV),('TEXTCOLOR',(0,0),(-1,0),WHITE),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),('FONTSIZE',(0,0),(-1,-1),8.5),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[WHITE,LBG]),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
        ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
        ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('TEXTCOLOR',(3,1),(3,-1),GRN),
    ]))
    story.append(state_tbl)

    story.append(PageBreak())

    # ── SLIDE 9: CREDENTIALING FLOW MOCKUP
    section_title(story, s, 'Platform Mockup: Credentialing Application Flow')
    story.append(Paragraph('A provider submits a credentialing application. Here is the status tracker they see:', s['Body']))
    story.append(Spacer(1,8))

    cred_steps = [
        ('✓ COMPLETE', 'Application Submitted', 'May 10, 2026 — 9:14 AM', GRN),
        ('✓ COMPLETE', 'Document Scan & Extraction (AI)', 'May 10, 2026 — 9:16 AM — 14 documents processed', GRN),
        ('✓ COMPLETE', 'PECOS Federal Screening', 'May 10, 2026 — 9:18 AM — No exclusions found', GRN),
        ('✓ COMPLETE', 'OIG LEIE Check', 'May 10, 2026 — 9:18 AM — Clear', GRN),
        ('⏳ IN PROGRESS', 'Primary Source Verification — NC Medical Board', 'May 10, 2026 — Awaiting response (Est. 24 hrs)', ORNG),
        ('⏳ IN PROGRESS', 'Primary Source Verification — DEA Registration', 'May 10, 2026 — Queried — Response expected May 11', ORNG),
        ('○ PENDING', 'Human Credentialing Specialist Review', 'Scheduled after verifications complete', GRAY),
        ('○ PENDING', 'State Medicaid Enrollment — NCTracks', 'Triggers automatically upon approval', GRAY),
        ('○ PENDING', 'MCO Enrollment — Blue Cross NC, Healthy Blue NC', 'Parallel enrollment triggers on approval', GRAY),
        ('○ PENDING', 'Account Activation & Billing Access', 'Est. Completion: May 13–14, 2026', GRAY),
    ]

    cred_data = [[
        Paragraph(status, ParagraphStyle('cs', fontSize=8, fontName='Helvetica-Bold', textColor=color)),
        Paragraph(f'<b>{step}</b>', ParagraphStyle('cn', fontSize=9, fontName='Helvetica-Bold', textColor=NAV)),
        Paragraph(detail, ParagraphStyle('cd', fontSize=8, fontName='Helvetica', textColor=GRAY)),
    ] for status, step, detail, color in cred_steps]

    cred_tbl = Table(cred_data, colWidths=[0.9*inch, 2.2*inch, 3.4*inch])
    cred_tbl.setStyle(TableStyle([
        ('ROWBACKGROUNDS',(0,0),(-1,-1),[WHITE,LGRAY]),
        ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#DDDDDD')),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    story.append(cred_tbl)
    story.append(Spacer(1,6))
    story.append(Paragraph('3–5 days total vs. 60–120 days under legacy systems. Provider starts billing immediately upon approval.', s['Cap']))

    story.append(PageBreak())

    # ── SLIDE 10: FRAUD DETECTION MOCKUP
    section_title(story, s, 'Platform Mockup: AI Fraud Detection Flag')
    story.append(Paragraph('A claim is submitted. AI scores it as high-risk. Here is what the fraud investigator sees:', s['Body']))
    story.append(Spacer(1,8))

    flag_header = Table([[
        Paragraph('⚠  HIGH RISK CLAIM  ·  FRAUD SCORE: 87/100  ·  HOLD — HUMAN REVIEW REQUIRED',
                  ParagraphStyle('fh', fontSize=10, textColor=WHITE, fontName='Helvetica-Bold', alignment=TA_CENTER))
    ]], colWidths=[6.5*inch])
    flag_header.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#8B0000')),
        ('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10),
    ]))
    story.append(flag_header)
    story.append(Spacer(1,4))

    fraud_info = [
        ['Claim ID', '#FF-28841  ·  Submitted May 12, 2026  ·  $18,400 billed'],
        ['Provider', 'ABC Home Health Services  ·  NPI: 1234567890  ·  Charlotte, NC'],
        ['Patient', 'Robert King  ·  Medicaid ID: NC-3398412'],
        ['Service Billed', 'Home Health — 92 visits in 30 days  ·  HCPCS G0156'],
        ['AI Flag Reason 1', '⚠ 92 visits in 30 days — peer average for this service is 12 visits/month'],
        ['AI Flag Reason 2', '⚠ GPS data shows provider device was in Raleigh during 44 of 92 billed visits in Charlotte'],
        ['AI Flag Reason 3', '⚠ Patient had no documented physician order for home health services in EHR'],
        ['AI Flag Reason 4', '⚠ Same patient billed by 3 different home health providers same dates of service'],
        ['Provider History', '2 prior fraud flags (resolved) — billing volume ▲ 340% in last 90 days'],
        ['Recommendation', 'HOLD FOR INVESTIGATION — Do not release payment — Assign to Senior Investigator'],
        ['Investigator Action', '[ Approve with Notes ]  [ Deny & Refer to State ]  [ Request Additional Docs ]'],
    ]
    fraud_tbl = Table(fraud_info, colWidths=[1.5*inch, 5.0*inch])
    fraud_tbl.setStyle(TableStyle([
        ('FONTNAME',(0,0),(0,-1),'Helvetica-Bold'),('TEXTCOLOR',(0,0),(0,-1),NAV),
        ('FONTSIZE',(0,0),(-1,-1),9),
        ('ROWBACKGROUNDS',(0,0),(-1,-1),[WHITE,colors.HexColor('#FFF5F5')]),
        ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#DDDDDD')),
        ('TEXTCOLOR',(1,4),(1,7),colors.HexColor('#B22222')),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(fraud_tbl)
    story.append(Spacer(1,6))
    story.append(Paragraph('AI explains every flag in plain language. Investigator sees evidence, not just a score. Human makes the final call.', s['Cap']))

    story.append(PageBreak())

    # ── SLIDE 11: ROI FOR THE STATE
    section_title(story, s, 'Return on Investment — What MedGuard360 Saves Your State')
    story.append(Paragraph(
        'States currently lose billions annually to improper payments and fraud. '
        'MedGuard360 converts fraud loss into measurable program savings. '
        'Below is a conservative ROI model for a mid-size state (approximately 2M Medicaid beneficiaries):', s['Body']))
    story.append(Spacer(1,8))

    roi_data = [
        ['Category', 'Current Annual Loss', 'With MedGuard360', 'Estimated Savings'],
        ['Fraudulent Claims Paid', '$180M–$400M', 'Pre-submission prevention', '$120M–$280M/yr'],
        ['Improper Payments (Coding)', '$40M–$80M', 'AI code validation + human review', '$25M–$55M/yr'],
        ['Credentialing Fraud', '$15M–$30M', 'Real-time verification, no lapse billing', '$10M–$25M/yr'],
        ['Transportation Fraud', '$20M–$50M', 'GPS verification, route matching', '$15M–$40M/yr'],
        ['Pharmacy Fraud', '$25M–$60M', 'Prescription linked to encounter', '$18M–$45M/yr'],
        ['Administrative Overhead', '$30M–$60M', 'AI automation reduces manual processing', '$15M–$35M/yr'],
        ['TOTAL ESTIMATED SAVINGS', '$310M–$680M/yr', '', '$203M–$480M/yr'],
    ]
    roi_tbl = Table(roi_data, colWidths=[1.9*inch, 1.5*inch, 1.7*inch, 1.4*inch])
    roi_tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),NAV),('TEXTCOLOR',(0,0),(-1,0),WHITE),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
        ('BACKGROUND',(0,-1),(-1,-1),colors.HexColor('#1A7A4A')),('TEXTCOLOR',(0,-1),(-1,-1),WHITE),
        ('FONTNAME',(0,-1),(-1,-1),'Helvetica-Bold'),
        ('FONTSIZE',(0,0),(-1,-1),8.5),
        ('ROWBACKGROUNDS',(0,1),(-1,-2),[WHITE,LBG]),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
        ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
    ]))
    story.append(roi_tbl)
    story.append(Spacer(1,10))
    story.append(Paragraph('Platform cost to the state: $2M–$10M/year depending on population. '
                            'Conservative savings: $203M–$480M/year. Net ROI: 20x–48x annually.', s['Body']))

    story.append(PageBreak())

    # ── SLIDE 12: COMPETITIVE ADVANTAGE
    section_title(story, s, 'Why MedGuard360 Wins')
    story.append(Spacer(1,6))

    comp_data = [
        ['Capability', 'Legacy EHR Systems', 'Current Audit Firms', 'MedGuard360'],
        ['Fraud Prevention', 'None — reactive only', 'Post-payment audit', '✓ Pre-submission, real-time'],
        ['Multi-State Credentialing', 'No', 'No', '✓ All 50 states unified'],
        ['Biometric Identity', 'Rare', 'No', '✓ Facial + fingerprint built-in'],
        ['Emergency Responder Access', 'No', 'No', '✓ Biometric scan, 3 seconds'],
        ['Crisis Plan Integration', 'Basic EHR notes only', 'No', '✓ Machine-readable, responder-ready'],
        ['Real-Time Claim Validation', 'No', 'No', '✓ Documentation proves every claim'],
        ['App on Every Device', 'Web portal only', 'No', '✓ Native iOS, Android, Desktop'],
        ['Statewide Call Hub', 'No', 'No', '✓ 1-800 per state, AI + Human'],
        ['Credentialing in 3–5 Days', 'No (60–120 days)', 'Not applicable', '✓ Automated + human verification'],
        ['GPS Visit Verification', 'No', 'No', '✓ Every visit geotagged'],
        ['AI + Human Governance', 'No AI', 'Human only (slow)', '✓ AI scales, humans decide'],
    ]
    comp_tbl = Table(comp_data, colWidths=[2.0*inch, 1.4*inch, 1.5*inch, 1.6*inch])
    comp_tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),NAV),('TEXTCOLOR',(0,0),(-1,0),WHITE),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
        ('FONTSIZE',(0,0),(-1,-1),8.5),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[WHITE,LGRAY]),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
        ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),
        ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('TEXTCOLOR',(3,1),(3,-1),GRN),
        ('FONTNAME',(3,1),(3,-1),'Helvetica-Bold'),
    ]))
    story.append(comp_tbl)

    story.append(PageBreak())

    # ── SLIDE 13: IMPLEMENTATION TIMELINE
    section_title(story, s, 'Implementation Timeline for Your State')
    story.append(Paragraph('From contract signing to full deployment — here is exactly what happens:', s['Body']))
    story.append(Spacer(1,8))

    timeline = [
        ['Week', 'Milestone', 'What TRG TechLink Delivers'],
        ['Week 1–2', 'State Configuration Build', 'Your MMIS API integration, MCO registry, state-specific rules engine configured'],
        ['Week 3–4', 'Integration Testing', 'Full end-to-end testing: claim submission, eligibility checks, credentialing workflows'],
        ['Week 5–6', 'Provider Pilot Launch', '50–100 pilot providers onboarded. Credentialing, billing, documentation all tested live.'],
        ['Week 7–8', 'State Agency Training', 'Program integrity, compliance, and reporting teams trained on state agency portal'],
        ['Week 9–10', 'Hub Launch', 'Statewide 1-800 hub goes live. AI chatbot trained on your state\'s Medicaid rules.'],
        ['Week 11–12', 'Full Provider Onboarding', 'All registered providers invited. Mass credentialing begins. Billing goes live.'],
        ['Month 4–6', 'Optimization', 'AI models trained on your state\'s claim patterns. Fraud detection tuned. Reports refined.'],
        ['Month 6+', 'Steady State', 'Full operations. Monthly monitoring. Continuous improvement. Dedicated TRG support team.'],
    ]
    time_tbl = Table(timeline, colWidths=[0.8*inch, 1.6*inch, 4.1*inch])
    time_tbl.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,0),NAV),('TEXTCOLOR',(0,0),(-1,0),WHITE),
        ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
        ('FONTNAME',(0,1),(0,-1),'Helvetica-Bold'),('TEXTCOLOR',(0,1),(0,-1),ORNG),
        ('FONTSIZE',(0,0),(-1,-1),9),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[WHITE,LBG]),
        ('GRID',(0,0),(-1,-1),0.4,colors.HexColor('#CCCCCC')),
        ('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),
        ('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]))
    story.append(time_tbl)

    story.append(PageBreak())

    # ── SLIDE 14: CLOSING
    story.append(Spacer(1, 0.3*inch))
    dark_slide(story, s,
               'The Time Is Now',
               'Every day without MedGuard360 is another day of preventable fraud.\n'
               'We are ready to deploy. Your state deserves better.')
    story.append(Spacer(1, 0.2*inch))

    story.append(Paragraph('What Happens When You Sign', s['SecH'])); story.append(div())
    next_steps = [
        '1. Contract executed — state configuration build begins within 48 hours',
        '2. Dedicated TRG TechLink integration team assigned to your state',
        '3. MMIS connection established and tested within 2 weeks',
        '4. First providers credentialed within 10 business days of go-live',
        '5. Fraud prevention active on day one of billing',
        '6. Statewide hub operational within 10 weeks',
        '7. Full ROI tracking delivered monthly to your Medicaid director',
    ]
    for step in next_steps:
        story.append(Paragraph(step, s['Bul']))
        story.append(Spacer(1,4))

    story.append(Spacer(1,16))
    contact = Table([[
        Paragraph('TRG TechLink  ·  MedGuard360', ParagraphStyle('ct', fontSize=14, textColor=NAV, fontName='Helvetica-Bold', alignment=TA_CENTER)),
        Paragraph('info@geniuseye.ai\nwww.medguard360.com', ParagraphStyle('ce', fontSize=11, textColor=BLUE, fontName='Helvetica', alignment=TA_CENTER)),
    ]], colWidths=[3.2*inch, 3.3*inch])
    contact.setStyle(TableStyle([
        ('BACKGROUND',(0,0),(-1,-1),LBG),
        ('LEFTPADDING',(0,0),(-1,-1),16),('RIGHTPADDING',(0,0),(-1,-1),16),
        ('TOPPADDING',(0,0),(-1,-1),16),('BOTTOMPADDING',(0,0),(-1,-1),16),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('GRID',(0,0),(-1,-1),0.5,colors.HexColor('#CCCCCC')),
    ]))
    story.append(contact)

    foot(story, s, '5', 'State Pitch Deck')

mk('/mnt/user-data/outputs/05_MedGuard360_Pitch_Deck.pdf', d5)

print('\n✅  ALL FIVE DOCUMENTS COMPLETE')
