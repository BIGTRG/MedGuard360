# MedGuard360 — NC DHHS Demo Script

**Audience:** NC DHHS / Division of Health Benefits (DHB) / Office of Compliance & Program Integrity (OCPI) leadership
**Duration:** 15 minutes presentation + 15 minutes Q&A
**Goal:** Earn a follow-up meeting with NCTracks Trading Partner intake + Compliance Review

## Pre-meeting (5 min before)

- Browser at http://localhost/ (nginx) or http://localhost:3080/ (portals direct)
- Stack verified (`powershell -ExecutionPolicy Bypass -File deploy\demo-preflight.ps1` then `deploy\smoke-demo.ps1` + `deploy\demo-flow.ps1`, or full `deploy\demo-up.ps1`)
- Sign in at `/login` (one-click role buttons) or use header role dropdown after first login
- **Role switching:** login quick-buttons or header dropdown re-authenticate with seeded demo accounts
- Backup: PROJECT-STATUS.md open in second tab

## Quick links (seeded demo IDs)

| Stop | URL |
|------|-----|
| Admin pilot states | http://localhost/admin/pilot-states |
| Federal CMS dashboard | http://localhost/federal-cms |
| MCO admin | http://localhost/state/mco-admin |
| PA evidence | http://localhost/pa-queue/40000000-0000-0000-0000-000000000001/evidence |
| PA decided history | http://localhost/pa-queue/decided |
| Fraud case (89/100) | http://localhost/fraud/cases/60000000-0000-0000-0000-000000000002 |
| Fraud rings scan | http://localhost/fraud/rings |
| Denial + AI appeal | http://localhost/denials/70000000-0000-0000-0000-000000000001 |
| Provider PA list | http://localhost/provider/pa |
| Provider encounters | http://localhost/provider/encounters |
| Provider EHR chart | http://localhost/provider/chart/10000000-0000-0000-0000-000000000001 |
| Provider workflow | http://localhost/provider/workflow |
| Credentialing queue | http://localhost/credentialing |
| Credentialing workflow | http://localhost/credentialing/workflow |
| DME orders | http://localhost/dme |
| DME workflow | http://localhost/dme/workflow |
| NEMT trips | http://localhost/nemt |
| NEMT workflow | http://localhost/nemt/workflow |
| Crisis responder | http://localhost/responder |
| Pharmacy formulary | http://localhost/pharmacy |
| Pharmacy workflow | http://localhost/pharmacy/workflow |
| Drug PA queue | http://localhost/pharmacy/drug-pa |
| Denials workflow | http://localhost/denials/workflow |
| HIE consents | http://localhost/hie |
| HETS compliance | http://localhost/compliance/hets |
| State engagement | http://localhost/state/engagement |
| School Medicaid home | http://localhost/school |
| School students (IEP roster) | http://localhost/school/students |
| School services log | http://localhost/school/services |
| LEA interagency agreement | http://localhost/school/lea-agreement |
| School claims batch | http://localhost/school/claims |
| Billing / RCM | http://localhost/billing |
| Patient engagement | http://localhost/patient/engagement |
| Member crisis plan | http://localhost/responder/patient/00000000-0000-0000-0000-000000000004 |
| Provider home | http://localhost/provider |
| Member portal | http://localhost/patient |
| Compliance | http://localhost/compliance |
| State dashboard | http://localhost/state |
| Reporting | http://localhost/reporting |
| Admin users | http://localhost/admin/users |

## Opening (60 seconds)

> Good morning. I'm Sainté Robinson, founder of MedGuard360. We've built the first
> Medicaid fraud-prevention platform that catches improper billing *before* a claim is
> paid — not after. In the next 15 minutes I'll show you the platform live, walk you
> through a real fraud case the AI caught, and tell you exactly what we need from NC
> DHHS to pilot in Wake County in Q3.
>
> Three things you should know up front:
>
> 1. We're piloting in NC and GA — your data, your state, your providers.
> 2. AI never makes the final decision — every fraud flag, every PA denial, every
>    appeal goes to a human reviewer. That's not negotiable in our architecture.
> 3. We're SOC 2, HITRUST, and HIPAA SRA in active observation — final reports
>    issue November 2026.

## Demo flow (12 minutes)

### Stop 1 — Platform Administration (1 min)
Page: `/admin`
- Point out 20 services / 10 AI engines / **46 SQL migrations**
- "This is what runs the platform. **Eight vendor adapters** on `/admin/integrations` — NCTracks, MTM, ModivCare, CGS DMEPOS, Da Vinci PAS, and more — all currently in stub mode, all flip to live with credential rotation."

### Stop 2 — Pilot States live data (1 min)
Page: `/admin/pilot-states`
- "11 NC plans seeded (5 Standard + 4 Tailored + Foster Care + EBCI Tribal Option)"
- "We've coded the 2026-04-01 WellCare/Carolina Complete absorption already. And the 2026-07-01 GA CMO procurement cutover is in migration 0021."
- "The MAC routing is correct — Palmetto JM for NC Part A/B and CGS Jurisdiction C for DMEPOS, not Noridian as some legacy systems mis-route."

### Stop 3 — A fraud case in flight (3 min)
Switch role → **Fraud Investigator** (login quick-button or header dropdown). Page: `/fraud`
- Show the queue. Click claim with score 89/100.
- Open `/fraud/cases/[id]` — show the timeline:
  - AI scored the claim
  - Investigator pulled 30-day provider history
  - GPS confirmed patient location
- "This is a real workflow. The investigator's notes are persisted to `fraud_case_events` (an append-only audit table). Every action is logged for OIG / OCPI / MFCU subpoena response."
- Show "Escalate to OCPI / MFCU / CMS UPIC / State OIG" button. "When we say human-in-the-loop, this is what we mean. AI flags, human escalates."
- Optional: `/fraud/rings` — click **Run ring detection** to show GNN cluster scoring on shared provider/patient attributes.

### Stop 4 — Prior Auth evidence matcher (2 min)
Switch role → **PA Specialist** (quick-button or dropdown). Page: `/pa-queue/[id]/evidence`
- Show 5 criteria with AI evidence (4 met, 1 indeterminate on the flagship PA)
- "BERT model matched the patient's chart notes against payer policy. For each criterion, AI gave an outcome — met / not met / unclear — with confidence and a quote from the chart."
- Click a criterion's override button. "Specialist disagrees with AI? One click. Their override is persisted, used to retrain quarterly."
- "Decision requires a plain-language explanation — not optional. The patient and provider both get this back."
- Show `/pa-queue/decided` — approved/denied history with decision dates from seed data.

### Stop 5 — Provider end-to-end workflow (2 min)
Switch role → **Provider** (quick-button or dropdown). Page: `/provider/workflow`
- Click "Run pipeline"
- Walk through the 9 steps: encounter start → voice capture → Whisper transcription → clinical NLP → ICD-10/CPT suggestions → Da Vinci CRD PA pre-check → 837P draft → fraud pre-scan → NCTracks submit
- "Total time from end of visit to submitted claim: about 4 minutes today. Manual today is 20-40 minutes."
- Show `/provider/pa` — provider's own PA requests (active + historical) from live API.
- Show `/provider/encounters` — live signed + in-progress encounters from clinical-doc-service (open detail to edit note on in-progress visit).
- Show `/provider/chart/[patientId]` — live EHR chart with active problems; optional CDS fire from API (`POST /clinical-doc/ehr/{id}/cds-fire`).
- Optional: switch to **DME** (`dme@demo.medguard360.com`) → `/dme` live orders; **NEMT** (`nemt@demo.medguard360.com`) → `/nemt` scheduled trips with GPS billing.

### Stop 6 — Member experience (1 min)
Switch role → **Patient** (quick-button or dropdown). Page: `/patient`
- 6 tabs: Overview, Coverage, **Claims (live from DB)**, Crisis Plan, Appointments, Messages
- "This is what your members see. Mobile app has the same surface — offline-first SQLite cache, biometric login, crisis plan accessible in 3 seconds even with no signal."
- Optional: switch to **Responder** (`responder@demo.medguard360.com`) → `/responder` live alert queue; `/responder/patient/[id]` shows biometric-gated crisis plan (click through `/biometric` in demo).
- Member portal **Messages** tab — live from `GET /patients/me/messages` (secure messaging surface).
- **Federal CMS** (`/federal-cms`) — pilot state count from live `state-config/plans` (NC · SC · GA).

### Stop 6b — School-based Medicaid (1 min)
Switch role → **School administrator** (`school@demo.medguard360.com`). Pages: `/school` → `/school/students`, `/school/services`, `/school/lea-agreement`, `/school/claims`
- Wake County LEA demo roster — IEP/504 students, service logs, LEA interagency agreement (34 CFR 300.154)
- "School-based Medicaid is payor of last resort — we document primary responsibility before batching claims to NC Medicaid."

### Stop 7 — Compliance posture (2 min)
Switch role → **Compliance Officer** (quick-button or dropdown). Page: `/compliance`
- Live audit feed from `audit_log_events` — PHI access, failed logins, PA overrides
- **Notification delivery log** (same page) — seeded PA/crisis/fraud/claim emails + SMS from `notification-service` stub mode
- `/compliance/audit-search` — advanced audit filters + CSV export (live `audit_log_events`)
- Optional: `GET /api/v1/notifications/logs` and `POST /api/v1/notifications/send` (compliance role) — demo-flow verifies both
- **MA provider directory** (state role): `GET /api/v1/providers/directory/export?stateCode=NC` — CMS CY2026 JSON export; compliance can record attestation via API
- Portal: `/state/mco-admin` — MCO plan operations dashboard (network adequacy talking point)
- Open `/admin/integrations` — "Every vendor surface. Status column shows stub vs partial vs live. Real credentials live in `/opt/credential-vault/`, never .env files."
- Show `compliance/controls.md` if asked — NIST 800-53 mapping ready for auditors.

## The Ask (90 seconds)

> What we need from NC DHHS to pilot in Q3:
>
> 1. **A meeting with your NCTracks Trading Partner intake team.** We have the
>    Trading Partner Agreement materials ready to submit. Two weeks of cycle time
>    if it's prioritized.
>
> 2. **A read-only sandbox copy** of NCTracks 270/271 endpoints, so we can
>    verify our adapter against real test data before we touch production.
>
> 3. **An introduction to OCPI.** We want their fraud investigators to evaluate
>    the AI output and tell us what's signal vs noise — that calibration shapes
>    our model retraining.
>
> 4. **A pilot population**. We're targeting 3-5 providers in Wake or Durham
>    counties, ~500 patients across NC Standard + Tailored Plans. Wake CC,
>    Duke Family Medicine, or community health centers are great fits.
>
> 5. **Your timeline**. We're SOC 2 / HITRUST issuance is Nov 23, 2026.
>    We'd like first encounter on a real NC Medicaid member by Dec 15.

## Anticipated Q&A

**Q: What happens if your AI is wrong?**
A: Two things. First, the AI never makes the final call — every consequential decision goes to human review. The investigator/specialist/provider sees the AI explanation but has full authority to override. Second, every override is logged and used to retrain the model quarterly. Wrong AI is not a bug — it's a training signal.

**Q: How do you handle SUD records under 42 CFR Part 2?**
A: Separate consent flow. SUD records require a discrete patient-signed consent before any disclosure — we don't bundle Part 2 disclosures into general HIPAA authorizations. The platform tracks consent expiration and re-prompts.

**Q: Where does PHI live?**
A: Currently on Hetzner in Falkenstein, Germany — demo only, no real PHI. Before any pilot member, we migrate to AWS GovCloud (us-gov-east-1). Already scoped in our 6-month compliance plan.

**Q: What's your tribal coverage story?**
A: We've seeded the EBCI Tribal Option in `mco_registry`. Tribal Medicaid has unique 638 contracting requirements — happy to walk through how the platform routes EBCI member encounters through their tribal health system without leaking PHI to Standard Plans.

**Q: How is this different from Cotiviti / Accenture / SAS / Optum?**
A: Three ways. (1) We're prevention-focused, not recovery-focused. (2) The 10 AI engines are domain-specific and HIPAA-architected from day one, not a horizontal AI bolt-on. (3) We're 100% deployable as one Docker Compose stack — no consulting army to install us.

**Q: What states are you in production?**
A: We're piloting in NC and GA. Phase 2 SC + VA + WV + TN. Production = post-SOC 2 issuance, Q1 2027.

**Q: Cost to the state?**
A: Multiple options — per-claim transaction fee (~$0.25–0.75), per-state platform license ($2M–10M/yr depending on scope), or hybrid. Happy to scope a pilot at no cost in exchange for case-study rights.

## Materials to leave behind

- Printed PROJECT-STATUS.md (one-pager)
- `integrations/nc-enterprise/README.md` (deep architecture)
- `integrations/nctracks/README.md` (TPA-ready)
- `compliance/controls.md` (auditor-ready)
- `compliance/BAA-template.md` (legal-ready)

## Follow-up (within 24 hours)

- Send thank-you email + meeting summary
- Attach the materials list above
- Calendar invite for: NCTracks TPA intake call, OCPI demo, AWS GovCloud architecture review
