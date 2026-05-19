from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

# ─── SHARED STYLES ────────────────────────────────────────────────────────────

def base_styles():
    styles = getSampleStyleSheet()

    styles.add(ParagraphStyle(
        name='DocTitle',
        fontSize=26,
        leading=32,
        textColor=colors.HexColor('#0B2E5F'),
        alignment=TA_CENTER,
        spaceAfter=6,
        fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        name='DocSubtitle',
        fontSize=13,
        leading=18,
        textColor=colors.HexColor('#3A7DC9'),
        alignment=TA_CENTER,
        spaceAfter=4,
        fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        name='DocMeta',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#666666'),
        alignment=TA_CENTER,
        spaceAfter=2,
        fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        name='SectionHeader',
        fontSize=15,
        leading=20,
        textColor=colors.HexColor('#0B2E5F'),
        spaceBefore=18,
        spaceAfter=6,
        fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        name='SubHeader',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1A5276'),
        spaceBefore=12,
        spaceAfter=4,
        fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        name='BodyText2',
        fontSize=10,
        leading=15,
        textColor=colors.HexColor('#222222'),
        alignment=TA_JUSTIFY,
        spaceAfter=6,
        fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        name='BulletItem',
        fontSize=10,
        leading=15,
        textColor=colors.HexColor('#222222'),
        leftIndent=20,
        spaceAfter=3,
        fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        name='SubBullet',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#444444'),
        leftIndent=40,
        spaceAfter=2,
        fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        name='Label',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0B2E5F'),
        fontName='Helvetica-Bold',
        spaceAfter=2,
    ))
    styles.add(ParagraphStyle(
        name='Caption',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#888888'),
        alignment=TA_CENTER,
        fontName='Helvetica'
    ))
    styles.add(ParagraphStyle(
        name='TagLine',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#2E86C1'),
        alignment=TA_CENTER,
        fontName='Helvetica-BoldOblique',
        spaceAfter=6
    ))
    return styles


def divider(color='#3A7DC9'):
    return HRFlowable(width='100%', thickness=1, color=colors.HexColor(color), spaceAfter=8, spaceBefore=4)


def section_box(story, title, style, color='#EAF2FB'):
    story.append(Spacer(1, 8))
    data = [[Paragraph(title, style['SubHeader'])]]
    t = Table(data, colWidths=[6.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(color)),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('ROUNDEDCORNERS', [4]),
    ]))
    story.append(t)
    story.append(Spacer(1, 6))


# ══════════════════════════════════════════════════════════════════════════════
# DOCUMENT 1 — WHAT IT LOOKS LIKE
# ══════════════════════════════════════════════════════════════════════════════

def build_doc1():
    path = '/mnt/user-data/outputs/MedGuard360_What_It_Looks_Like.pdf'
    doc = SimpleDocTemplate(path, pagesize=letter,
                            rightMargin=0.85*inch, leftMargin=0.85*inch,
                            topMargin=0.9*inch, bottomMargin=0.8*inch)
    s = base_styles()
    story = []

    # ── Cover
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph("MedGuard360", s['DocTitle']))
    story.append(Paragraph("Unified Medicaid & Medicare Fraud Prevention Platform", s['DocSubtitle']))
    story.append(Spacer(1, 6))
    story.append(Paragraph("DOCUMENT 1 OF 3 — WHAT IT LOOKS LIKE", s['TagLine']))
    story.append(divider())
    story.append(Paragraph("Prepared by: TRG TechLink  |  Classification: Proprietary  |  Version 1.0  |  2026", s['DocMeta']))
    story.append(Spacer(1, 0.3*inch))

    # ── Executive Vision
    story.append(Paragraph("Executive Vision", s['SectionHeader']))
    story.append(divider('#0B2E5F'))
    story.append(Paragraph(
        "MedGuard360 is a first-of-its-kind, AI-assisted, human-verified enterprise platform that serves as the "
        "single source of truth for every Medicaid, Medicare, CHIP, and government-funded healthcare billing "
        "transaction across all 50 states, the District of Columbia, and U.S. territories. Rather than reacting "
        "to fraud after it happens — as current audit-based systems do — MedGuard360 embeds compliance, "
        "identity verification, and documentation integrity directly into the moment of care. Every prescription, "
        "every home visit, every DME delivery, every transportation ride, every clinical note is captured, "
        "validated, and cross-referenced in real time before a single claim is ever submitted.",
        s['BodyText2']))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "The platform is not a web app. It is a provider-facing enterprise management system accessible through "
        "role-based portals for every type of user in the Medicaid ecosystem — from individual clinicians and "
        "patients, to state Medicaid agencies, managed care organizations, emergency responders, and federal "
        "CMS auditors.",
        s['BodyText2']))

    # ── Platform Identity
    story.append(Paragraph("Platform Identity and Structure", s['SectionHeader']))
    story.append(divider())
    story.append(Paragraph(
        "MedGuard360 presents itself differently depending on who is logging in. There is no single \"homepage\" "
        "for all users. The platform routes each user to their role-specific portal immediately upon authentication. "
        "Biometric verification — facial recognition or fingerprint — is available as the primary authentication "
        "layer for clinical users and patients, with traditional login credentials as backup.",
        s['BodyText2']))

    story.append(Spacer(1, 8))

    # ── 20 User Portals
    story.append(Paragraph("The Twenty User Portals", s['SectionHeader']))
    story.append(divider())

    portals = [
        ("1. Patient / Beneficiary Portal",
         "Patients log in or are identified by biometric scan. They see their enrolled providers, claimed services, "
         "upcoming appointments, medication history, crisis plan summary, and benefits status. Emergency responders "
         "can scan a patient's face or thumbprint at a scene and instantly pull this portal's read-only emergency view."),
        ("2. Individual Provider Portal",
         "Physicians, therapists, pharmacists, nurses, and all licensed clinicians. They document services in real "
         "time using voice capture, video, or structured note entry. The system auto-generates billing codes from "
         "clinical content. Claims are submitted with one click after AI-suggested codes are reviewed."),
        ("3. Facility / Organizational Provider Portal",
         "Hospitals, clinics, home health agencies, long-term care facilities, behavioral health centers, and schools. "
         "They manage staff rosters, multi-clinician credentialing, facility-level billing, service utilization reports, "
         "and compliance dashboards for their entire organization."),
        ("4. Pharmacy Portal",
         "Licensed pharmacies submit NCPDP-standard pharmacy claims. Prescriptions are validated against the "
         "originating clinical encounter before dispensing. Controlled substance prescriptions are flagged for "
         "additional verification. Formulary management and prior authorization workflows are built in."),
        ("5. DMEPOS Supplier Portal",
         "Durable medical equipment suppliers manage inventory, validate face-to-face physician orders, confirm "
         "delivery and patient fit before billing, and submit HCPCS-coded claims. Equipment categories include "
         "wheelchairs, prosthetics, orthotics, oxygen, wound care, and diabetic supplies."),
        ("6. Transportation / NEMT Portal",
         "Non-emergency medical transportation brokers and drivers manage ride scheduling, route verification, "
         "GPS-based trip confirmation, driver credentialing, and HCPCS-coded mileage claims. Trip completion is "
         "verified against clinical appointment records at the destination."),
        ("7. Managed Care Organization (MCO) Portal",
         "MCO administrators manage their enrolled member populations, contracted provider networks, prior "
         "authorization queues, capitation tracking, medical loss ratios, and claim adjudication dashboards. "
         "Credentialing coordination with state FFS enrollment happens in parallel."),
        ("8. State Medicaid Agency Portal",
         "State Medicaid program directors, enrollment specialists, program integrity officers, and data analysts "
         "see a full real-time view of all providers, claims, credentialing statuses, fraud flags, and reporting "
         "metrics for their state. They configure state-specific rules within the platform's rules engine."),
        ("9. Federal CMS Portal",
         "CMS auditors and federal program integrity staff access national-level analytics, PERM audit data, "
         "cross-state fraud pattern reports, provider exclusion monitoring, and improper payment rate dashboards "
         "across all 50 states simultaneously."),
        ("10. Credentialing Specialist Portal",
         "Human credentialing reviewers see AI-extracted provider data pre-populated from uploaded documents. "
         "They review, verify, approve, or flag discrepancies. Primary source verification results are returned "
         "automatically and displayed for review. Approvals trigger downstream enrollment workflows."),
        ("11. Prior Authorization Specialist Portal",
         "PA reviewers receive AI-scored authorization requests with clinical justification pre-matched against "
         "payer criteria. Straight-forward approvals take one click. Borderline cases are flagged with supporting "
         "documentation attached for clinical judgment."),
        ("12. Billing / Revenue Cycle Portal",
         "Billing managers track claims across all payers, view denial reasons categorized by AI, manage appeal "
         "queues with suggested correction actions, monitor reimbursement timelines, and track revenue by provider, "
         "service type, state, and payer."),
        ("13. Compliance Officer Portal",
         "Internal and external compliance officers receive AI-generated monthly compliance reports, provider "
         "risk scores, anomaly flags, peer comparison analyses, and audit-ready documentation packages. "
         "They review AI flags and make escalation decisions."),
        ("14. Fraud Investigator Portal",
         "Medium and high-risk claims flagged by AI are routed here. Investigators see the complete claim record, "
         "supporting documentation, provider billing history, peer comparisons, and a fraud risk score with "
         "explanation. They approve, deny, or refer to state or federal investigators."),
        ("15. Denial Management / Appeals Portal",
         "Appeals specialists see denied claims organized by denial code, with AI-suggested corrections and "
         "resubmission templates pre-populated. Timelines and deadlines are tracked automatically. One-click "
         "resubmission after corrections."),
        ("16. School District / LEA Portal",
         "Local education agencies manage Medicaid billing for special education services under IDEA. Staff "
         "therapists and school nurses are enrolled under the school's provider entity. IEP service documentation "
         "links directly to claim generation."),
        ("17. Health Information Exchange Portal",
         "HIE administrators manage FHIR-compliant data sharing consents, referral workflows, and cross-provider "
         "clinical data exchange. Providers receive relevant patient history automatically when a referral is "
         "received from another provider in the network."),
        ("18. Emergency Responder / 911 Portal",
         "Read-only biometric-gated access for first responders. Scanning a patient's face or fingerprint "
         "immediately returns: name, Medicaid ID, primary diagnosis, current medications, crisis plan summary, "
         "emergency contacts, known allergies, and relevant behavioral health history."),
        ("19. Quality Assurance / Auditor Portal",
         "Third-party auditors access claims data, documentation samples, credentialing records, and audit "
         "trails for their assigned scope. All audit activity is logged. Read-only access with exportable "
         "audit packages formatted for CMS or state submission."),
        ("20. Platform Administrator Portal",
         "TRG TechLink internal administrators manage state configuration packages, system health monitoring, "
         "user role management, API connection status to each state MMIS, and AI model performance dashboards. "
         "New state onboarding is managed entirely from this portal."),
    ]

    for title, desc in portals:
        section_box(story, title, s)
        story.append(Paragraph(desc, s['BodyText2']))
        story.append(Spacer(1, 4))

    # ── Service Categories
    story.append(PageBreak())
    story.append(Paragraph("Service Categories Supported", s['SectionHeader']))
    story.append(divider())
    story.append(Paragraph(
        "MedGuard360 handles billing, credentialing, documentation, and compliance for every category "
        "of Medicaid and Medicare-covered service:",
        s['BodyText2']))

    categories = [
        ("Medical / Physical Health", "Primary care, specialist visits, preventive care, surgical services, emergency care, lab and diagnostic services."),
        ("Behavioral Health", "Mental health therapy, substance use treatment, psychiatric services, community-based behavioral support, applied behavior analysis."),
        ("Home Health", "Skilled nursing in the home, home health aide services, physical, occupational, and speech therapy in the home. Patient-Driven Groupings Model billing."),
        ("Community-Based Services", "Services delivered in the client's home or community setting. Real-time audio/video documentation with GPS-verified location."),
        ("Pharmacy Services", "Retail pharmacy claims via NCPDP D.0 standard, medication therapy management, controlled substance verification, formulary management."),
        ("Durable Medical Equipment", "Wheelchairs, hospital beds, prosthetics, orthotics, oxygen equipment, surgical dressings, diabetic supplies, lymphedema compression."),
        ("Non-Emergency Medical Transportation", "Scheduled rides to and from medical appointments. GPS-verified trips, driver credentialing, mileage billing via HCPCS codes."),
        ("Long-Term Care / Institutional", "Nursing facilities, assisted living, behavioral health inpatient, intermediate care facilities. Facility-level credentialing and state survey compliance."),
        ("School-Based Services", "Speech therapy, occupational therapy, physical therapy, behavioral health under IDEA for Medicaid-enrolled students."),
        ("Telehealth / Telemedicine", "Video visits, audio-only therapy, remote patient monitoring. State-specific modifier application and reimbursement parity rules."),
        ("CHIP Services", "All services covered under state Children's Health Insurance Programs, with state-specific income and eligibility rules applied."),
        ("Crisis Intervention", "Mobile crisis response, crisis stabilization units, crisis plan management, 911 integration, post-crisis follow-up documentation."),
        ("Preventive Services", "Screenings, immunizations, wellness visits, early intervention programs, family planning, maternal health."),
        ("Ancillary Services", "Social work, care coordination, community health worker services, case management billed under supervising provider credentials."),
    ]

    for cat, desc in categories:
        story.append(Paragraph(f"<b>{cat}:</b> {desc}", s['BulletItem']))
        story.append(Spacer(1, 3))

    # ── Geographic Rollout Model
    story.append(PageBreak())
    story.append(Paragraph("Geographic Rollout Model", s['SectionHeader']))
    story.append(divider())
    story.append(Paragraph(
        "MedGuard360 is built for phased, state-by-state deployment. The platform is state-agnostic at "
        "the code level and state-configurable at the rules level. Every state signs onto the same "
        "platform but operates within its own configured environment.",
        s['BodyText2']))

    phases = [
        ("Phase 1 — Anchor States (Months 1–12)",
         "Launch with 2–3 early adopter states. North Carolina is the logical first given proximity to TRG TechLink "
         "operations and existing NCTracks familiarity. Possibly Georgia and Virginia as southeastern complements. "
         "Early adopters bear a portion of customization cost but gain first-mover advantages in fraud savings."),
        ("Phase 2 — Southeastern Expansion (Months 12–24)",
         "Onboard remaining southeastern states: South Carolina, Tennessee, Florida, Alabama, Mississippi. "
         "Each state is onboarded using the standardized configuration package developed in Phase 1. "
         "Timeline per state drops from 12 months to 6–8 weeks."),
        ("Phase 3 — National Rollout (Months 24–48)",
         "Open the platform to all remaining states. Automated configuration templates accelerate onboarding "
         "further. Target 35+ states active within 48 months of launch."),
        ("Phase 4 — Federal Integration (Month 36+)",
         "Pursue formal CMS recognition as a certified clearinghouse and program integrity partner. "
         "Establish direct data exchange with CMS for PERM audit reporting, LEIE cross-referencing, "
         "and national fraud pattern sharing."),
    ]

    for phase, desc in phases:
        section_box(story, phase, s, color='#EBF5FB')
        story.append(Paragraph(desc, s['BodyText2']))
        story.append(Spacer(1, 4))

    # ── Revenue Model
    story.append(Paragraph("Revenue Model", s['SectionHeader']))
    story.append(divider())

    revenue = [
        ("Provider User Fees", "Monthly or annual subscription per provider user on the platform. Tiered by organization size."),
        ("State Platform Licensing", "Annual licensing fee per state for access to the unified credentialing, billing, and compliance infrastructure."),
        ("Billing Clearinghouse Commission", "Small percentage of all successful Medicaid and Medicare claims processed through the platform."),
        ("Credentialing Processing Fees", "Per-provider credentialing application fee covering primary source verification and multi-state enrollment."),
        ("MCO Integration Fees", "Annual fee per MCO for credentialing coordination and claim adjudication integration."),
        ("Analytics and Reporting Subscriptions", "Premium reporting and analytics access for state agencies, MCOs, and compliance organizations."),
        ("Crisis Plan and Emergency Responder Integration", "Per-agency licensing for 911 integration and emergency responder biometric access."),
        ("AI Compliance Engine Subscriptions", "Premium tier access to AI fraud detection, anomaly scoring, and predictive risk analytics."),
    ]

    data = [["Revenue Stream", "Description"]]
    for stream, desc in revenue:
        data.append([stream, desc])

    t = Table(data, colWidths=[2.2*inch, 4.3*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0B2E5F')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F2F3F4')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#FDFEFE'), colors.HexColor('#EAF2FB')]),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#BDC3C7')),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t)

    # Footer note
    story.append(Spacer(1, 20))
    story.append(divider('#BDC3C7'))
    story.append(Paragraph("MedGuard360 — TRG TechLink Proprietary | Document 1 of 3 | What It Looks Like | 2026", s['Caption']))

    doc.build(story)
    print(f"Doc 1 built: {path}")
    return path


# ══════════════════════════════════════════════════════════════════════════════
# DOCUMENT 2 — WHAT IT CAN DO
# ══════════════════════════════════════════════════════════════════════════════

def build_doc2():
    path = '/mnt/user-data/outputs/MedGuard360_What_It_Can_Do.pdf'
    doc = SimpleDocTemplate(path, pagesize=letter,
                            rightMargin=0.85*inch, leftMargin=0.85*inch,
                            topMargin=0.9*inch, bottomMargin=0.8*inch)
    s = base_styles()
    story = []

    # Cover
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph("MedGuard360", s['DocTitle']))
    story.append(Paragraph("Unified Medicaid & Medicare Fraud Prevention Platform", s['DocSubtitle']))
    story.append(Spacer(1, 6))
    story.append(Paragraph("DOCUMENT 2 OF 3 — WHAT IT CAN DO", s['TagLine']))
    story.append(divider())
    story.append(Paragraph("Prepared by: TRG TechLink  |  Classification: Proprietary  |  Version 1.0  |  2026", s['DocMeta']))
    story.append(Spacer(1, 0.3*inch))

    story.append(Paragraph(
        "This document defines the full functional capability set of MedGuard360 across all twelve core modules. "
        "Each module operates independently but shares a unified data layer, ensuring complete interoperability "
        "across all service categories, user types, and state configurations.",
        s['BodyText2']))

    # ── MODULE 1: Real-Time Clinical Documentation
    story.append(Paragraph("Module 1: Real-Time Clinical Documentation Engine", s['SectionHeader']))
    story.append(divider())
    caps = [
        "Captures live audio of clinical encounters using built-in or external microphone — provider speech is transcribed in real time via speech-to-text AI engine.",
        "Video recording of encounters for community-based services delivered in clients' homes — stored encrypted with immutable timestamps.",
        "AI-powered Natural Language Processing extracts clinical facts from transcribed notes: chief complaint, diagnosis, treatment plan, medications prescribed, outcomes.",
        "Auto-populates structured clinical note fields from spoken content — provider reviews and approves before finalization.",
        "Flags missing documentation elements based on the patient's diagnosis code and service type — prompts provider to complete before note closure.",
        "Generates ICD-10-CM diagnosis codes, CPT procedure codes, and billing modifiers automatically from clinical content.",
        "Locks notes after provider digital signature — no backdating, no retroactive alteration without full audit trail.",
        "Supports structured and unstructured note entry: SOAP notes, DAP notes, progress notes, discharge summaries, operative reports.",
        "Crisis notation: detects crisis-related language in documentation and flags for crisis plan update and supervisor notification.",
        "Documentation score: every note receives a completeness and compliance score before the provider can submit the associated claim.",
    ]
    for cap in caps:
        story.append(Paragraph(f"\u2022 {cap}", s['BulletItem']))

    # ── MODULE 2: Identity and Biometric Verification
    story.append(Paragraph("Module 2: Identity and Biometric Verification", s['SectionHeader']))
    story.append(divider())
    caps = [
        "Facial recognition authentication for providers, staff, and patients at point of service.",
        "Fingerprint / thumbprint verification as primary or secondary authentication method.",
        "Client-specific login credentials with multi-factor authentication for remote access.",
        "Emergency responder biometric lookup: scan patient face or fingerprint in the field and retrieve read-only emergency profile.",
        "Biometric identity is linked permanently to the patient's Medicaid ID, NPI, and crisis plan record.",
        "Liveness detection prevents spoofing — system verifies the scan is from a live person, not a photo.",
        "All biometric data stored encrypted at rest using AES-256 encryption and never transmitted in raw form.",
        "Identity verification events are logged with timestamp, location, device ID, and user role in the immutable audit trail.",
        "Failed verification attempts trigger escalation alerts and temporary service hold.",
        "Supports integration with state ID systems and drivers license verification APIs for initial onboarding.",
    ]
    for cap in caps:
        story.append(Paragraph(f"\u2022 {cap}", s['BulletItem']))

    # ── MODULE 3: Provider Credentialing
    story.append(PageBreak())
    story.append(Paragraph("Module 3: Provider Credentialing and Enrollment", s['SectionHeader']))
    story.append(divider())
    caps = [
        "Unified provider application accepted once for all 50 states — provider enters data one time.",
        "AI-powered OCR scans and digitizes uploaded documents: diplomas, licenses, certifications, malpractice insurance, DEA registration.",
        "NLP extracts key data from documents: license numbers, expiration dates, issuing authority, disciplinary notations.",
        "Automated primary source verification queries all 50 state medical boards, pharmacy boards, nursing boards, and specialty boards simultaneously.",
        "PECOS screening: every provider is cross-referenced against the CMS Provider Enrollment Chain and Ownership System.",
        "OIG LEIE exclusion check: every provider screened against the federal exclusion list — flagged immediately if excluded.",
        "SAM.gov debarment check: verifies no federal contracting exclusions.",
        "Risk-based categorization applied automatically: Limited, Moderate, or High risk based on provider taxonomy code.",
        "High-risk providers trigger site visit scheduling and fingerprint-based background check workflows.",
        "NPI and taxonomy code assignment verified against NPPES — mismatches flagged for human review.",
        "Parallel credentialing across state FFS enrollment and all MCOs the provider wants to participate in.",
        "Human credentialing specialist reviews AI-extracted and verified data before final approval.",
        "Approved providers are automatically pushed to state MMIS systems via API — no rekeying required.",
        "Credentialing completed in 3–5 days for clean applications versus industry standard of 60–120 days.",
        "Automated revalidation reminders at 60, 30, and 7 days before expiration.",
        "Continuous monthly monitoring: license status, exclusion status, disciplinary actions — alerts sent immediately on changes.",
    ]
    for cap in caps:
        story.append(Paragraph(f"\u2022 {cap}", s['BulletItem']))

    # ── MODULE 4: Claim Generation and Submission
    story.append(Paragraph("Module 4: Claim Generation and Submission", s['SectionHeader']))
    story.append(divider())
    caps = [
        "Generates EDI 837P professional claims for individual provider services.",
        "Generates EDI 837I institutional claims for hospital, facility, and home health services.",
        "Generates NCPDP D.0 pharmacy claims for retail and mail-order pharmacy.",
        "Generates HCPCS-coded claims for DMEPOS and NEMT services.",
        "Real-time eligibility verification against state Medicaid systems before every claim submission.",
        "Third-party liability check: determines primary and secondary payer order automatically.",
        "Claim scrubbing: checks for coding errors, missing fields, modifier conflicts before submission.",
        "Prior authorization status verified — claims requiring PA are held until authorization number is obtained.",
        "Electronic remittance advice (EDI 835) received and processed automatically — payments posted to provider accounts.",
        "Claim status tracking: real-time visibility into accepted, pending, denied, or paid status for every claim.",
        "Timely filing rules enforced: system tracks submission deadlines per payer and alerts on approaching deadlines.",
        "Home health Notice of Admission generated and submitted within 5-day window automatically.",
        "School-based Medicaid claims generated under school LEA provider entity with IEP service linkage.",
        "Cross-state claim coordination for dually eligible Medicare/Medicaid beneficiaries.",
        "Batch submission capability for high-volume facilities submitting hundreds of claims simultaneously.",
    ]
    for cap in caps:
        story.append(Paragraph(f"\u2022 {cap}", s['BulletItem']))

    # ── MODULE 5: Fraud Prevention Engine
    story.append(PageBreak())
    story.append(Paragraph("Module 5: AI-Assisted Fraud Prevention Engine", s['SectionHeader']))
    story.append(divider())
    story.append(Paragraph(
        "The fraud prevention engine operates in two modes: preventive validation before claims are submitted, "
        "and continuous surveillance of claims after payment. The goal is to eliminate fraud at the source "
        "rather than recovering money after it is lost.",
        s['BodyText2']))
    caps = [
        "Pre-submission validation: every claim is cross-checked against clinical documentation before it leaves the system.",
        "Service confirmation: if a service is documented, it must be verifiable — biometric provider presence, GPS location, timestamped notes.",
        "AI anomaly detection: machine learning models identify unusual billing patterns — sudden spikes, unusual code combinations, geographic mismatches.",
        "Peer comparison analysis: each provider's billing profile is compared against peers in the same specialty, geography, and patient population.",
        "Upcoding detection: AI flags claims where billed service complexity exceeds what documentation supports.",
        "Duplicate billing detection: identifies duplicate claims for the same service, same patient, same date across all payers.",
        "Ghost patient detection: flags claims for patients who show no other system activity, verifying identity before payment.",
        "Transportation fraud: GPS routing verification — if mileage billed doesn't match actual route, claim is flagged.",
        "Prescription fraud: prescriptions cross-referenced against the clinical encounter — no encounter, no prescription claim.",
        "DME fraud: equipment delivery confirmed with patient signature and biometric before claim is submitted.",
        "Risk scoring: every claim receives a fraud risk score from 1–100. Score determines routing: auto-approve, human review, or hold.",
        "Post-payment surveillance: AI continues to monitor paid claims for patterns that suggest systematic fraud.",
        "Network analysis using Graph Neural Networks: identifies fraud rings where multiple providers and patients are connected in suspicious billing webs.",
        "Human investigator review: only medium and high-risk flags reach a human — routine low-risk claims auto-process.",
        "All fraud flags are logged with explanation — AI decisions are explainable and auditable.",
    ]
    for cap in caps:
        story.append(Paragraph(f"\u2022 {cap}", s['BulletItem']))

    # ── MODULE 6: Prior Authorization
    story.append(Paragraph("Module 6: Prior Authorization Management", s['SectionHeader']))
    story.append(divider())
    caps = [
        "Real-time PA requirement check: system queries payer rules to determine if a service requires prior authorization before it is rendered.",
        "AI-assisted PA request generation: clinical documentation is used to auto-draft the PA justification narrative.",
        "NLP matches clinical facts against payer's approval criteria — generates a preliminary approval recommendation.",
        "PA requests submitted electronically via payer APIs — compliant with CMS interoperability mandate effective January 2027.",
        "Standard PA decisions tracked within 7-day deadline. Expedited/urgent PA tracked within 72-hour deadline.",
        "Drug prior authorization tracked within 24-hour deadline per CMS 2026 proposed rule.",
        "Human PA specialist reviews AI recommendation before submission — approves or overrides.",
        "Approved PA numbers automatically attached to associated claims.",
        "PA denial triggers appeal workflow — AI drafts appeal with supporting clinical evidence.",
        "PA status dashboard: real-time visibility into all pending, approved, and denied authorizations.",
    ]
    for cap in caps:
        story.append(Paragraph(f"\u2022 {cap}", s['BulletItem']))

    # ── MODULE 7: Denial Management and Appeals
    story.append(PageBreak())
    story.append(Paragraph("Module 7: Denial Management and Appeals", s['SectionHeader']))
    story.append(divider())
    caps = [
        "All claim denials captured automatically from EDI 835 remittance advice files.",
        "AI categorizes denial reason by code: eligibility, authorization, documentation, coding error, timely filing.",
        "AI suggests specific corrective action for each denial type based on payer rules.",
        "Human appeals specialist reviews AI suggestion and approves correction or overrides.",
        "Corrected claims auto-populated with suggested changes — one-click resubmission.",
        "Appeal letters auto-drafted with clinical evidence attached.",
        "Appeal deadlines tracked per payer — alerts at 30, 14, and 7 days before deadline.",
        "Denial trend analysis: identifies systematic denial patterns by payer, provider, or service type.",
        "Revenue recovery tracking: measures dollars recovered through successful appeals.",
    ]
    for cap in caps:
        story.append(Paragraph(f"\u2022 {cap}", s['BulletItem']))

    # ── MODULE 8: Crisis Plan Management
    story.append(Paragraph("Module 8: Crisis Plan and Emergency Response Integration", s['SectionHeader']))
    story.append(divider())
    caps = [
        "Every Medicaid beneficiary with a behavioral health diagnosis has a crisis plan stored in the platform.",
        "Crisis plans include: triggers, de-escalation strategies, emergency contacts, preferred hospital, medications, and do-not-resuscitate status.",
        "Plans are updated every clinical encounter where crisis-related documentation is detected.",
        "Machine-readable format: structured data fields for rapid retrieval by emergency responders.",
        "Emergency responder portal: scan patient biometric at any scene — retrieve crisis plan in under 3 seconds.",
        "911 dispatch integration: upon dispatch, relevant patient records can be pushed to responding unit before arrival.",
        "Post-crisis follow-up: system auto-generates follow-up appointment request and notifies primary care provider.",
        "Crisis billing integration: mobile crisis and crisis stabilization services billed automatically from crisis encounter documentation.",
        "Supervisory alerts: when a crisis notation is detected in documentation, the provider's supervisor is notified immediately.",
        "Cross-referencing with community resources: crisis plans link to local crisis stabilization units, mobile crisis teams, and peer support resources.",
    ]
    for cap in caps:
        story.append(Paragraph(f"\u2022 {cap}", s['BulletItem']))

    # ── MODULE 9: Eligibility Verification
    story.append(Paragraph("Module 9: Real-Time Eligibility Verification", s['SectionHeader']))
    story.append(divider())
    caps = [
        "Queries state Medicaid eligibility systems in real time at point of service.",
        "Verifies active enrollment, plan type (FFS vs managed care), MCO assignment, and coverage effective dates.",
        "Checks CHIP eligibility for pediatric patients.",
        "Medicare primary/secondary coverage check for dually eligible beneficiaries.",
        "Commercial insurance check for coordination of benefits — determines billing order.",
        "Eligibility result stored in claim record — full audit trail of verification event.",
        "Failed eligibility prompts patient status resolution workflow rather than denial.",
        "Batch eligibility checks for high-volume facilities — verify entire patient roster nightly.",
    ]
    for cap in caps:
        story.append(Paragraph(f"\u2022 {cap}", s['BulletItem']))

    # ── MODULE 10: Compliance and Reporting
    story.append(PageBreak())
    story.append(Paragraph("Module 10: Compliance, Reporting, and Analytics", s['SectionHeader']))
    story.append(divider())
    caps = [
        "PERM audit data: generates CMS-formatted improper payment data for all states.",
        "Medicaid and CHIP Program Integrity Reporting Portal submissions automated.",
        "Provider performance dashboards: claims submitted, approval rates, denial rates, fraud flags per provider.",
        "State-level dashboards: claim volumes, service type distribution, improper payment rates, credentialing pipeline status.",
        "MCO performance tracking: medical loss ratios, prior authorization approval rates, network adequacy metrics.",
        "Fraud trend reporting: monthly fraud prevention reports showing claims stopped, dollars saved, risk flags resolved.",
        "HIPAA audit logs: complete access logs for all PHI — who accessed what, when, from where.",
        "OIG compliance reporting: seven core compliance program component tracking.",
        "Continuous monitoring reports: license expiration alerts, exclusion status changes, credentialing gaps.",
        "Custom report builder: state agencies and compliance officers can build ad-hoc reports from any data in the platform.",
        "Exportable in CMS-required formats: XML, CSV, EDI — for direct submission to state or federal systems.",
    ]
    for cap in caps:
        story.append(Paragraph(f"\u2022 {cap}", s['BulletItem']))

    # ── MODULE 11: State Configuration Engine
    story.append(Paragraph("Module 11: State Configuration and Integration Engine", s['SectionHeader']))
    story.append(divider())
    caps = [
        "Each state operates within its own configured environment on a shared platform infrastructure.",
        "State configuration package includes: MMIS API connection credentials, MCO list with credentialing requirements, prior authorization rules, telehealth policies, pharmacy formulary rules, school-based Medicaid rules, claim timely filing limits.",
        "New state onboarding completed in 6–8 weeks using standardized configuration template after Phase 1.",
        "Rules engine applies state-specific business logic to every claim, credentialing event, and eligibility check.",
        "MMIS integration adapters handle both modern REST APIs and legacy mainframe-based state systems.",
        "EDI trading partner agreements managed per state — each state's MMIS has its own EDI setup.",
        "State-specific reporting templates pre-built and auto-submitted on required schedules.",
        "Configuration version control: every change to a state's rules is tracked with effective date and approval log.",
    ]
    for cap in caps:
        story.append(Paragraph(f"\u2022 {cap}", s['BulletItem']))

    # ── MODULE 12: AI Governance
    story.append(Paragraph("Module 12: AI Governance and Human Oversight Framework", s['SectionHeader']))
    story.append(divider())
    story.append(Paragraph(
        "MedGuard360 is AI-assisted, not AI-autonomous. Every consequential decision — credentialing approval, "
        "fraud flag escalation, prior authorization decision — requires human review and sign-off. AI accelerates "
        "the process and reduces manual workload. Humans retain authority over outcomes.",
        s['BodyText2']))
    caps = [
        "Low-risk claims: AI auto-processes with no human intervention required.",
        "Medium-risk items: AI flags with explanation and suggested action — routed to human specialist for review.",
        "High-risk items: AI flags with full evidence package — human investigator makes final determination.",
        "All AI decisions are explainable: every flag, score, and suggestion includes a plain-language explanation.",
        "AI model performance is monitored continuously — accuracy, false positive rate, false negative rate tracked.",
        "Human overrides are logged: when a human disagrees with AI, the override is captured and used to retrain models.",
        "Bias monitoring: AI models are audited quarterly for disparate impact across provider demographics and geographies.",
        "No AI model makes a final credentialing, fraud, or denial decision without human sign-off.",
        "State regulators can audit AI decision logic — full transparency into how the system scores claims.",
        "Human staffing model: AI reduces the volume of manual work by an estimated 70–80%, but does not eliminate human roles — it transforms them.",
    ]
    for cap in caps:
        story.append(Paragraph(f"\u2022 {cap}", s['BulletItem']))

    story.append(Spacer(1, 20))
    story.append(divider('#BDC3C7'))
    story.append(Paragraph("MedGuard360 — TRG TechLink Proprietary | Document 2 of 3 | What It Can Do | 2026", s['Caption']))

    doc.build(story)
    print(f"Doc 2 built: {path}")
    return path


# ══════════════════════════════════════════════════════════════════════════════
# DOCUMENT 3 — THE BUILD BLUEPRINT
# ══════════════════════════════════════════════════════════════════════════════

def build_doc3():
    path = '/mnt/user-data/outputs/MedGuard360_Build_Blueprint.pdf'
    doc = SimpleDocTemplate(path, pagesize=letter,
                            rightMargin=0.85*inch, leftMargin=0.85*inch,
                            topMargin=0.9*inch, bottomMargin=0.8*inch)
    s = base_styles()
    story = []

    # Cover
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph("MedGuard360", s['DocTitle']))
    story.append(Paragraph("Unified Medicaid & Medicare Fraud Prevention Platform", s['DocSubtitle']))
    story.append(Spacer(1, 6))
    story.append(Paragraph("DOCUMENT 3 OF 3 — BUILD BLUEPRINT", s['TagLine']))
    story.append(divider())
    story.append(Paragraph("Prepared by: TRG TechLink  |  Classification: Proprietary  |  Version 1.0  |  2026", s['DocMeta']))
    story.append(Spacer(1, 0.3*inch))

    story.append(Paragraph(
        "This document defines the complete technical specification, infrastructure architecture, AI engine "
        "configuration, phased build strategy, and regulatory compliance requirements for building MedGuard360 "
        "on top of TRG TechLink's existing self-hosted enterprise stack. This is the engineering and product "
        "blueprint that drives development from Day 1.",
        s['BodyText2']))

    # ── SECTION 1: Core Architecture
    story.append(Paragraph("Section 1: Core System Architecture", s['SectionHeader']))
    story.append(divider())

    story.append(Paragraph("1.1 Architectural Principles", s['SubHeader']))
    principles = [
        "State-agnostic core, state-configurable rules: One codebase serves all 50 states. Business logic is externalized into a rules engine that reads state configuration packages.",
        "Event-driven architecture: Every clinical event, claim event, credentialing event, and identity event emits a message to the event bus, triggering downstream workflows asynchronously.",
        "Microservices with bounded contexts: Each module (credentialing, billing, fraud, clinical docs, etc.) is a separate service with its own database schema, communicating via internal APIs.",
        "API-first design: Every service exposes versioned REST APIs. All external integrations — state MMIS systems, MCOs, pharmacy switches — connect via standardized APIs.",
        "Zero-trust security: Every internal service-to-service call is authenticated. No implicit trust within the network perimeter.",
        "Full auditability: Every data mutation is logged to an append-only audit log with timestamp, user, IP, and change delta.",
    ]
    for p in principles:
        story.append(Paragraph(f"\u2022 {p}", s['BulletItem']))

    story.append(Paragraph("1.2 Technology Stack", s['SubHeader']))
    stack_data = [
        ["Layer", "Technology", "Purpose"],
        ["Frontend", "Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui", "All 20 role-based portals"],
        ["Mobile", "React Native / Expo", "iOS and Android apps for field clinicians and NEMT"],
        ["Real-time", "Socket.IO", "Live documentation, claim status updates, alerts"],
        ["Video", "LiveKit", "Clinical encounter video capture and storage"],
        ["Auth", "Clerk + JWT + Biometric SDK", "Multi-factor, biometric, role-based authentication"],
        ["Backend Services", "Node.js v25.9.0 + Express.js", "28+ microservices (PM2 managed)"],
        ["AI/ML", "Python 3.10+ (FastAPI)", "NLP engine, fraud detection, OCR, risk scoring"],
        ["Primary DB", "PostgreSQL (primary + 2 replicas)", "All transactional data — claims, providers, patients"],
        ["Cache", "Redis (3-node cluster)", "Eligibility cache, session state, rate limiting"],
        ["Search/Analytics", "Elasticsearch (ELK Stack)", "Claims analytics, audit log search, fraud pattern search"],
        ["Message Queue", "Apache Kafka", "Event streaming between microservices"],
        ["EDI Processing", "Custom Node.js EDI engine", "837P, 837I, 835, 270/271, NCPDP D.0"],
        ["Storage", "Self-hosted S3-compatible (MinIO)", "Encrypted clinical documents, audio, video"],
        ["Reverse Proxy", "nginx (TLS 1.3)", "Multi-portal routing, rate limiting, security headers"],
        ["Monitoring", "Prometheus + Grafana + AlertManager", "20+ scrape targets, 41 alert rules"],
        ["Logging", "ELK Stack", "Centralized logging, HIPAA audit trails"],
        ["Process Mgmt", "PM2", "Auto-restart, cluster mode for all Node services"],
        ["Security", "iptables + fail2ban + AES-256", "Network rules, intrusion prevention, encryption"],
        ["Secrets", "/opt/credential-vault/", "API keys, MMIS credentials, never hardcoded"],
    ]
    t = Table(stack_data, colWidths=[1.3*inch, 2.7*inch, 2.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0B2E5F')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#FDFEFE'), colors.HexColor('#EAF2FB')]),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor('#BDC3C7')),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t)

    # ── SECTION 2: Microservices Map
    story.append(PageBreak())
    story.append(Paragraph("Section 2: Microservices Architecture Map", s['SectionHeader']))
    story.append(divider())

    services = [
        ("auth-service", "JWT issuance, Clerk integration, biometric token validation, session management, role-based access control enforcement."),
        ("provider-service", "Provider profile management, NPI lookup, taxonomy code validation, provider search and enrollment status."),
        ("credentialing-service", "Credentialing application processing, document storage, primary source verification orchestration, PECOS/LEIE checks, approval workflows."),
        ("patient-service", "Patient demographics, Medicaid ID management, crisis plan storage, emergency profile, biometric identity linkage."),
        ("eligibility-service", "Real-time Medicaid eligibility queries to all state systems, Medicare eligibility, commercial insurance verification, COB determination."),
        ("prior-auth-service", "PA request generation, payer API submission, status tracking, approval/denial workflows, appeal initiation."),
        ("clinical-doc-service", "Real-time audio transcription, NLP note analysis, coding suggestion, documentation completeness scoring, note locking."),
        ("claims-service", "EDI 837P/837I/NCPDP claim generation, scrubbing, submission, status tracking, 835 remittance processing, payment posting."),
        ("fraud-engine-service", "ML anomaly detection, risk scoring, peer comparison analysis, duplicate detection, network fraud analysis, flag routing."),
        ("denial-service", "Denial capture, categorization, appeal drafting, resubmission, deadline tracking, recovery reporting."),
        ("pharmacy-service", "NCPDP D.0 claim processing, formulary management, controlled substance verification, MTM billing."),
        ("dme-service", "DMEPOS order validation, face-to-face confirmation, delivery tracking, accreditation verification, HCPCS billing."),
        ("nemt-service", "Trip scheduling, GPS route tracking, driver credentialing, mileage verification, HCPCS claim generation."),
        ("crisis-service", "Crisis plan creation and updates, 911 integration, emergency responder API, post-crisis follow-up workflows."),
        ("reporting-service", "PERM data generation, state compliance reports, provider dashboards, MCO analytics, CMS submission formatting."),
        ("notification-service", "Email, SMS, and in-app alerts for credentialing expiry, claim status, fraud flags, PA decisions, license changes."),
        ("state-config-service", "State configuration packages, rules engine management, MMIS connection parameters, MCO registry per state."),
        ("audit-log-service", "Append-only event logging, HIPAA access logs, AI decision logs, human override logs, exportable audit packages."),
        ("hie-service", "FHIR R4 data exchange, patient consent management, referral workflows, clinical data sharing with state HIEs."),
        ("billing-admin-service", "User fee management, state licensing billing, clearinghouse commission tracking, revenue reporting."),
    ]

    story.append(Paragraph("Each service is deployed independently via PM2, with dedicated PostgreSQL schema, Redis namespace, and Prometheus metrics endpoint:", s['BodyText2']))
    story.append(Spacer(1, 6))

    svc_data = [["Service", "Core Responsibility"]]
    for svc, desc in services:
        svc_data.append([svc, desc])

    t = Table(svc_data, colWidths=[2.0*inch, 4.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1A5276')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#FDFEFE'), colors.HexColor('#EAF2FB')]),
        ('GRID', (0,0), (-1,-1), 0.4, colors.HexColor('#BDC3C7')),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('FONTNAME', (0,1), (0,-1), 'Helvetica-BoldOblique'),
        ('TEXTCOLOR', (0,1), (0,-1), colors.HexColor('#0B2E5F')),
    ]))
    story.append(t)

    # ── SECTION 3: AI Engine Configuration
    story.append(PageBreak())
    story.append(Paragraph("Section 3: AI Engine Architecture and Configuration", s['SectionHeader']))
    story.append(divider())

    story.append(Paragraph(
        "All AI engines run as Python 3.10+ FastAPI services, separate from the Node.js microservices layer. "
        "They are called by the relevant Node services via internal REST APIs. All AI engines operate under "
        "the Human Oversight Framework — no autonomous decisions on consequential items.",
        s['BodyText2']))

    ai_engines = [
        ("AI Engine 1: Speech-to-Text Transcription",
         "Model: Whisper (OpenAI, self-hosted) or Deepgram API. Input: audio stream from clinical encounter. "
         "Output: real-time text transcript with speaker diarization (identifies provider vs patient speech). "
         "Runs as streaming service — transcription available within 2 seconds of speech.",
         "clinical-doc-service"),
        ("AI Engine 2: Clinical NLP and Code Suggestion",
         "Model: Fine-tuned LLM (Llama 3 or similar, self-hosted) + medical NLP libraries (scispaCy, MedSpaCy). "
         "Input: transcribed clinical note text. Output: extracted clinical entities (diagnoses, symptoms, medications, procedures), "
         "suggested ICD-10-CM codes, CPT procedure codes, billing modifiers. Human coder reviews all suggestions before claim submission.",
         "clinical-doc-service, claims-service"),
        ("AI Engine 3: OCR and Document Intelligence",
         "Model: Tesseract OCR + deep learning document classifier. Input: scanned provider credentials (PDFs, images). "
         "Output: extracted structured fields (license number, expiration date, issuing authority, disciplinary flag). "
         "Human credentialing specialist reviews extraction before verification proceeds.",
         "credentialing-service"),
        ("AI Engine 4: Fraud Anomaly Detection",
         "Model: Isolation Forest (unsupervised anomaly detection) + XGBoost classifier (supervised fraud labels). "
         "Input: claim features (provider, codes, dates, amounts, patient profile, location, frequency). "
         "Output: fraud risk score 1-100 with top contributing factors. Low (<30): auto-approve. Medium (30-70): human review. High (>70): hold and investigate. "
         "Retrained monthly on new claim data.",
         "fraud-engine-service"),
        ("AI Engine 5: Graph Neural Network — Fraud Ring Detection",
         "Model: Graph Neural Network (PyTorch Geometric). Input: provider-patient-claim network graph. "
         "Output: identifies clusters of providers and patients with unusual billing relationships — detects organized fraud rings. "
         "Runs nightly batch analysis. Flags to human fraud investigators for review.",
         "fraud-engine-service"),
        ("AI Engine 6: Prior Authorization NLP Matching",
         "Model: BERT-based semantic similarity model. Input: clinical documentation text + payer PA criteria text. "
         "Output: match score between clinical justification and approval criteria. Human PA specialist reviews "
         "recommendation before submission to payer.",
         "prior-auth-service"),
        ("AI Engine 7: Denial Prediction and Appeal Drafting",
         "Model: Gradient Boosted Trees classifier for denial prediction + GPT-style model for appeal letter drafting. "
         "Input: claim features, payer, denial code. Output: predicted denial probability and suggested correction. "
         "For denials received: auto-draft appeal letter with clinical evidence. Human appeals specialist reviews before submission.",
         "denial-service"),
        ("AI Engine 8: Continuous Provider Monitoring",
         "Model: Rules-based + ML anomaly detector. Input: daily license board queries, LEIE checks, SAM.gov checks, "
         "disciplinary database queries. Output: change alerts with risk classification. Low-risk changes auto-logged. "
         "High-risk changes (exclusion, license revocation) trigger immediate hold and human notification.",
         "credentialing-service, notification-service"),
        ("AI Engine 9: Crisis Detection in Documentation",
         "Model: Fine-tuned text classifier trained on behavioral health crisis language. Input: clinical note text. "
         "Output: crisis flag with severity level (low/medium/high). High severity triggers supervisor notification and "
         "crisis plan review. Human clinician always makes clinical determination.",
         "clinical-doc-service, crisis-service"),
        ("AI Engine 10: Eligibility and Benefits Intelligence",
         "Model: Rules-based + ML. Input: patient demographics, state, income data, coverage dates. Output: "
         "predicted eligibility status, plan assignment, benefits summary. Queries live state systems to confirm. "
         "Human eligibility specialist resolves mismatches.",
         "eligibility-service"),
    ]

    for engine, desc, services_used in ai_engines:
        section_box(story, engine, s, color='#F0F4FF')
        story.append(Paragraph(desc, s['BodyText2']))
        story.append(Paragraph(f"<b>Services:</b> {services_used}", s['Label']))
        story.append(Spacer(1, 4))

    # ── SECTION 4: Data Architecture
    story.append(PageBreak())
    story.append(Paragraph("Section 4: Data Architecture", s['SectionHeader']))
    story.append(divider())

    story.append(Paragraph("4.1 Database Schema Overview", s['SubHeader']))
    schemas = [
        ("providers", "NPI, taxonomy, license numbers, credential status, risk category, enrollment status per state, MCO relationships."),
        ("patients", "Medicaid ID, demographics, crisis plan, biometric hash, enrollment history, payer assignments."),
        ("claims", "Claim ID, provider NPI, patient ID, service date, codes, amounts, payer, status, fraud score, audit trail."),
        ("encounters", "Clinical encounter records linked to claims — audio transcript, video reference, note text, biometric confirmation."),
        ("credentialing_events", "All credentialing actions with timestamp, AI extraction results, human review outcomes, verification sources."),
        ("prior_authorizations", "PA requests, clinical justification, payer response, approval numbers, linked claim IDs."),
        ("denials", "Denial records, reason codes, AI suggestions, appeal records, resubmission outcomes."),
        ("eligibility_checks", "Every eligibility verification event — patient, provider, service, result, timestamp."),
        ("state_configurations", "Per-state rules, MMIS connection configs, MCO registries, telehealth policies, PA rules."),
        ("audit_logs", "Append-only — every system event, user action, AI decision, human override."),
        ("crisis_plans", "Patient crisis plans, update history, emergency responder access log."),
        ("fraud_flags", "AI-generated flags, risk scores, evidence, investigator notes, resolution outcomes."),
    ]

    for table, desc in schemas:
        story.append(Paragraph(f"<b>{table}:</b> {desc}", s['BulletItem']))

    story.append(Paragraph("4.2 Data Security", s['SubHeader']))
    security = [
        "All PHI encrypted at rest using AES-256.",
        "All data in transit protected by TLS 1.3 via nginx.",
        "Biometric data stored as irreversible hashes — raw biometric data is never stored.",
        "Database access controlled by row-level security — users only see data within their role and state scope.",
        "Secrets stored in /opt/credential-vault/ — never hardcoded in source code.",
        "Automated backups with AES-256 encryption — daily full backup, hourly incremental.",
        "fail2ban active on SSH, nginx, and database ports.",
        "iptables enforcing 65 firewall rules — least-privilege network access.",
        "HIPAA Business Associate Agreements executed with all third-party integrations.",
        "Annual HIPAA security risk assessments — results logged and remediation tracked.",
    ]
    for item in security:
        story.append(Paragraph(f"\u2022 {item}", s['BulletItem']))

    # ── SECTION 5: External Integrations
    story.append(PageBreak())
    story.append(Paragraph("Section 5: External System Integrations", s['SectionHeader']))
    story.append(divider())

    integrations = [
        ("State MMIS Systems (All 50 States)", "SFTP + REST API adapters per state. NCTracks (NC), GAMMIS (GA), Medi-Cal (CA), etc. EDI trading partner agreements per state. Handles both legacy mainframe and modern REST architectures."),
        ("CMS PECOS", "Provider Enrollment Chain and Ownership System API — provider exclusion and enrollment status queries."),
        ("OIG LEIE", "List of Excluded Individuals and Entities — monthly full file download + real-time query API."),
        ("SAM.gov", "Federal debarment and exclusion database — automated queries for all providers."),
        ("NPPES", "National Plan and Provider Enumeration System — NPI lookup and validation API."),
        ("State Medical Boards (All 50)", "Primary source verification — license status, expiration, disciplinary actions. Mix of APIs and structured web queries."),
        ("Pharmacy Switch Networks", "Relay Health, Emdeon, NDC Health — NCPDP D.0 pharmacy claim submission routing."),
        ("MCO APIs (Per State)", "Prior authorization APIs, eligibility APIs, claim submission APIs — configured per MCO per state."),
        ("CMS Prior Authorization APIs", "Compliant with CMS Interoperability and Prior Authorization Final Rule — mandatory implementation by January 2027."),
        ("State HIEs", "FHIR R4 compliant data exchange — clinical data sharing, referral workflows, patient consent management."),
        ("911 / Emergency Dispatch Systems", "CAD (Computer Aided Dispatch) integration — push patient emergency profile to responding units."),
        ("IRS / SSA", "Tax ID and Social Security Number verification for provider enrollment identity confirmation."),
        ("Drug Enforcement Administration", "DEA registration verification for controlled substance prescribing providers."),
        ("Joint Commission / NCQA", "Facility accreditation status verification for institutional provider credentialing."),
        ("Medicare PECOS and MAC Systems", "Medicare provider enrollment and claim submission for dually eligible billing coordination."),
    ]

    for integration, desc in integrations:
        story.append(Paragraph(f"<b>{integration}:</b> {desc}", s['BulletItem']))
        story.append(Spacer(1, 3))

    # ── SECTION 6: Phased Build Plan
    story.append(PageBreak())
    story.append(Paragraph("Section 6: Phased Build and Deployment Plan", s['SectionHeader']))
    story.append(divider())

    phases = [
        ("Phase 1 — Foundation (Months 1–6)",
         [
             "Build auth-service with biometric authentication, Clerk integration, 20 role types.",
             "Build provider-service and patient-service with core data models.",
             "Build credentialing-service: document upload, AI OCR engine, primary source verification automation for NC, GA, VA.",
             "Build eligibility-service: NC Medicaid eligibility API integration.",
             "Build clinical-doc-service: audio transcription, NLP note analysis, basic code suggestion.",
             "Build claims-service: 837P/837I generation, EDI scrubbing, NCTracks submission integration.",
             "Build basic fraud-engine-service: rule-based fraud checks + anomaly scoring.",
             "Build state-config-service with NC configuration package.",
             "Build audit-log-service: append-only event logging.",
             "Deploy all services via PM2 on TRG TechLink infrastructure.",
             "Set up Prometheus, Grafana, AlertManager monitoring for all services.",
             "Launch credentialing portal and provider portal in North Carolina.",
         ]),
        ("Phase 2 — Expansion (Months 7–12)",
         [
             "Add GA and VA state configuration packages — MMIS integrations for both states.",
             "Build pharmacy-service: NCPDP D.0 integration with pharmacy switch networks.",
             "Build dme-service: DMEPOS validation and HCPCS billing.",
             "Build nemt-service: GPS tracking, trip verification, HCPCS billing.",
             "Build prior-auth-service: PA workflow, payer API integrations for NC/GA/VA MCOs.",
             "Build denial-service: denial capture, AI appeal drafting, resubmission.",
             "Build crisis-service: crisis plan management, emergency responder API.",
             "Upgrade fraud-engine-service: add ML anomaly detection, Graph Neural Network fraud ring detection.",
             "Add AI Engine 4 and 5 (fraud scoring and GNN) to fraud engine.",
             "Launch patient portal with biometric identity and crisis plan access.",
             "Launch state agency portal for NC, GA, VA.",
             "Onboard first 500 providers across three states.",
         ]),
        ("Phase 3 — AI and MCO Integration (Months 13–18)",
         [
             "Integrate all MCOs in NC, GA, VA: parallel credentialing, PA APIs, claim adjudication.",
             "Build hie-service: FHIR R4 integration with state HIEs.",
             "Build school-based billing module within claims-service for LEA providers.",
             "Build home health billing module: PDGM, HIPPS codes, NOA submission.",
             "Add telehealth modifier logic to claims-service: state-specific telehealth rules.",
             "Add behavioral health routing: LME/MCO pathways, supervision relationships.",
             "Build reporting-service: PERM audit data, state compliance reports, CMS submissions.",
             "Launch MCO portal.",
             "Onboard 5 southeastern states using standardized configuration package.",
             "Begin CMS clearinghouse certification process.",
         ]),
        ("Phase 4 — National Scale (Months 19–36)",
         [
             "Open platform to all remaining states — configuration package per state in 6–8 week cycles.",
             "Build billing-admin-service: user fee management, clearinghouse commission tracking.",
             "Complete CMS certification as approved EDI submitter and program integrity partner.",
             "Integrate 911/CAD dispatch systems in participating states.",
             "Launch AI Engine 6 (PA NLP matching) and Engine 7 (denial prediction and appeal drafting) in production.",
             "Establish direct CMS PERM data submission pipeline.",
             "Target 35+ states active. 10,000+ credentialed providers. 1M+ claims processed monthly.",
             "Begin federal contracting discussions for CMS-level program integrity partnership.",
         ]),
    ]

    for phase_title, tasks in phases:
        section_box(story, phase_title, s, color='#EAF2FB')
        for task in tasks:
            story.append(Paragraph(f"\u2022 {task}", s['BulletItem']))
        story.append(Spacer(1, 8))

    # ── SECTION 7: Compliance and Regulatory Requirements
    story.append(PageBreak())
    story.append(Paragraph("Section 7: Regulatory and Compliance Requirements", s['SectionHeader']))
    story.append(divider())

    reqs = [
        ("HIPAA Privacy and Security Rules", "All PHI handling must comply with 45 CFR Parts 160 and 164. Annual risk assessments. BAAs with all covered business associates."),
        ("HITECH Act", "Breach notification within 60 days. Enhanced penalties for willful neglect. EHR incentive program compliance for meaningful use standards."),
        ("42 CFR Part 455", "Medicaid provider enrollment and screening requirements — risk-based screening, site visits, background checks, exclusion list checks."),
        ("42 CFR Part 456", "Utilization control requirements — medical necessity documentation, prior authorization standards."),
        ("MITA Framework", "Medicaid Information Technology Architecture — system design must align with MITA standards for interoperability and modularity."),
        ("CMS Interoperability Final Rule", "FHIR R4 APIs for patient data access, provider directory, and prior authorization. PA API compliance mandatory by January 2027."),
        ("EDI Standards (45 CFR Part 162)", "HIPAA-mandated EDI transactions: 837P, 837I, 835, 270/271, 276/277, NCPDP D.0. All transactions must use ASC X12 N and NCPDP standards."),
        ("NCQA Credentialing Standards", "Credentialing processes must meet NCQA standards for primary source verification, revalidation cycles, and continuous monitoring."),
        ("OIG Compliance Program Guidance", "Seven core compliance program elements must be tracked and documented for all provider organizations on the platform."),
        ("Social Security Act Section 1936", "CMS must procure audit contractors — platform data must be audit-ready for MIC and UPIC audit requests."),
        ("IDEA / School-Based Medicaid", "34 CFR 300.154 interagency agreement requirements for school-based Medicaid billing."),
        ("42 CFR Part 2", "Substance use disorder records have additional confidentiality protections — separate consent requirements for data sharing."),
        ("State-Specific Requirements", "Each state configuration package includes: state privacy laws, additional credentialing requirements, state-specific claim timely filing limits, MCO contract requirements."),
    ]

    for req, desc in reqs:
        story.append(Paragraph(f"<b>{req}:</b> {desc}", s['BulletItem']))
        story.append(Spacer(1, 3))

    # ── SECTION 8: Monitoring and Infrastructure
    story.append(Paragraph("Section 8: Monitoring, Infrastructure, and Operations", s['SectionHeader']))
    story.append(divider())

    ops = [
        "Prometheus scrapes metrics from all 20+ microservices every 15 seconds.",
        "Grafana dashboards: one per major service plus cross-service aggregate views.",
        "AlertManager: 41 alert rules covering service downtime, error rate spikes, EDI submission failures, AI model degradation, and security events. Alerts route to info@geniuseye.ai.",
        "ELK Stack: centralized logging with 5+ Kibana dashboards for claim processing, credentialing, fraud engine, audit events, and API performance.",
        "PM2: auto-restart on crash, cluster mode for high-availability on all Node services.",
        "PostgreSQL: primary + 2 read replicas. Failover handled automatically. ACID compliance maintained.",
        "Redis: 3-node cluster for session management, eligibility cache (TTL 15 minutes), rate limiting.",
        "nginx: TLS 1.3 termination, multi-portal reverse proxy routing by subdomain, rate limiting per IP and per user role.",
        "Backup schedule: AES-256 encrypted full backup nightly, incremental hourly. Retention: 90 days full, 365 days incremental.",
        "Disaster recovery: documented RTO (Recovery Time Objective) of 4 hours, RPO (Recovery Point Objective) of 1 hour.",
        "Penetration testing: quarterly third-party penetration test. Findings tracked to remediation.",
        "Uptime SLA: 99.95% for all production services. Maintenance windows pre-scheduled with state notification.",
    ]
    for item in ops:
        story.append(Paragraph(f"\u2022 {item}", s['BulletItem']))

    # Footer
    story.append(Spacer(1, 20))
    story.append(divider('#BDC3C7'))
    story.append(Paragraph("MedGuard360 — TRG TechLink Proprietary | Document 3 of 3 | Build Blueprint | 2026", s['Caption']))

    doc.build(story)
    print(f"Doc 3 built: {path}")
    return path


# ── RUN ALL THREE
p1 = build_doc1()
p2 = build_doc2()
p3 = build_doc3()
print("All three PDFs generated successfully.")
