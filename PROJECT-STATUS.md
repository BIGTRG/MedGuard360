# MedGuard360 — Project Status as of 2026-06-12

## NC laptop demo (tag `v1.0-demo`)

| Check | Status |
|-------|--------|
| `deploy/demo-up.ps1` | One-command Windows bring-up |
| `deploy/demo-preflight.ps1` | Fast pre-meeting health check |
| `deploy/verify-demo.ps1` | Preflight + smoke + demo-flow (`-UnitTests` runs CI parity) |
| `deploy/run-service-tests.ps1` | All 20 Node service Jest suites (matches GitHub CI) |
| `deploy/run-engine-tests.ps1` | Demo AI engine pytest (fraud, PA NLP, denial, crisis) |
| `deploy/smoke-demo.ps1` | 68 HTTP/API/portal checks |
| `deploy/demo-flow.ps1` | Full role workflow API + portal checks |
| GitHub CI (`main`) | Green — shared build, 20 Node services, 4 demo AI engines, Next.js, pytest |
| GitHub Security scan | Green — npm audit, gitleaks, semgrep, Trivy (GHCR images) |
| GitHub Release | Green — 31 images at `ghcr.io/bigtrg/medguard360/*` |
| Demo password (all 16 users) | `demo-Password!1` |
| Portal | http://localhost/ |

**Bring-up:** `powershell -ExecutionPolicy Bypass -File deploy\demo-up.ps1`  
**Preflight:** `powershell -ExecutionPolicy Bypass -File deploy\demo-preflight.ps1`  
**Walkthrough:** `sales/NC-DHHS-DEMO-SCRIPT.md`  
**Release:** https://github.com/BIGTRG/MedGuard360/releases/tag/v1.0-demo

## What's complete

### Platform code
- **20 Node.js microservices** — auth, provider, credentialing, patient, eligibility, prior-auth, clinical-doc, claims, fraud-engine, denial, pharmacy, dme, nemt, crisis, hub, reporting, notification, state-config, audit-log, hie
- **10 Python AI engines** — speech-to-text (Whisper), clinical-nlp, ocr-engine, fraud-detection, fraud-ring-gnn, pa-nlp-matcher, denial-predictor, provider-monitor, crisis-detector, eligibility-intel
- **Next.js 14 portal** — 16 seeded demo roles, live API-backed dashboards (login quick-buttons at `/login`)
- **React Native mobile** — offline-first SQLite cache, biometric login, MemberHomeScreen
- **46 SQL migrations** including: base schema, RLS, EHR core, MA directory, HIE, HETS, notifications, pilot state plans
- **5 vendor adapter stubs** — NCTracks, MTM, ModivCare, CGS, Da Vinci PAS (env-var toggled)
- **Hub AI tier** — `liveLookup.ts` answers eligibility/PA/claims queries directly from DB after identity verify

### Portals built (role-specific depth)
| Role | Page(s) |
|---|---|
| Provider | `/provider` + `/provider/workflow` (9-step pipeline animation) |
| Patient | `/patient` (6-tab: overview, coverage, claims, crisis, appointments, messages) |
| Fraud Investigator | `/fraud`, `/fraud/rings`, `/fraud/cases/[id]` (live timeline with server-side persistence) |
| PA Specialist | `/pa-queue`, `/pa-queue/[id]/evidence` (criterion-by-criterion AI evidence + override) |
| Pharmacy | `/pharmacy/workflow` |
| DME | `/dme/workflow` |
| NEMT | `/nemt/workflow` |
| Credentialing | `/credentialing/workflow` (8 PSV checks) |
| Denials | `/denials/workflow` (8 CARC templates) |
| MCO Admin | `/state/mco-admin` |
| Federal CMS | `/federal-cms` |
| Billing Manager | `/billing` |
| Compliance Officer | `/compliance` |
| Platform Admin | `/admin`, `/admin/integrations`, `/admin/pilot-states`, `/admin/nc-enterprise` |
| School / LEA | `/school`, `/school/students`, `/school/services`, `/school/lea-agreement`, `/school/claims` |
| HIE / Responder / QA Auditor | existing pages |

### Mobile screens
LoginScreen, DashboardScreen, PatientsScreen (offline fallback), CrisisScreen (biometric-gated), EncounterScreen, ClaimsScreen, BiometricScreen, AudioCaptureScreen, PatientDetailScreen, SettingsScreen, **MemberHomeScreen** (new)

### Integration research docs (8 states + federal)
- `integrations/nctracks/` (Phase 1)
- `integrations/cms/` (federal — Da Vinci, NPPES, LEIE, SAM, Blue Button)
- `integrations/nc-dhsr/` (facility licensure)
- `integrations/nemt-brokers/` (MTM + ModivCare)
- `integrations/nc-enterprise/` (DHHS divisions, all billing entities)
- `integrations/sc-enterprise/`
- `integrations/ga-enterprise/` + `PROCUREMENT-STATUS.md` (2026-07-01 CMO cutover)
- `integrations/va-enterprise/` (Cardinal Care, CCMC 5 MCOs + 1 FCSP)
- `integrations/wv-enterprise/` (Mountain Health Trust 4 MCOs)
- `integrations/tn-enterprise/` (managed-care-only since 1994, 3 MCCs)
- `integrations/PILOT-STATES-COMPARISON.md` (NC/SC/GA + VA/WV/TN)

### Compliance package
- `compliance/controls.md` — NIST 800-53 + HIPAA Security Rule + SOC 2 TSC + HITRUST CSF i1 mapping
- `compliance/BAA-template.md` — 45 CFR 164.504(e) full template + NC/GA addenda
- `compliance/6-MONTH-COMPLIANCE-PLAN.md` — week-by-week to 2026-11-23

### Deployment
- **NC laptop demo** — `docker-compose.demo.yml` + `deploy/demo-up.ps1` (Windows) / `deploy/laptop.sh` (macOS/Linux)
- **Live on Hetzner** 178.105.21.227:8090 (demo only — not StateRAMP-ready)
- **GitHub repo** https://github.com/BIGTRG/MedGuard360 (public)
- **Release tag** `v1.0-demo` — NC DHHS laptop evaluation milestone (GHCR images + GitHub Release)
- **GitHub Actions** — CI + Security scan + Release green on `main`; auto-deploy manual-only until SSH secrets configured

## What's stubbed (intentionally — needs real vendor relationships)
- Clerk auth (using bypass for demo)
- Suprema / NEC biometric vendor
- Twilio SMS / AWS SES email / FCM push
- Change Healthcare / Availity / TriZetto clearinghouse
- NCTracks real SOAP/SFTP transport (adapter typed + 44 unit tests; waiting for TPA)
- MTM Link / ModivCare REST APIs
- CGS DMEPOS real EDI submission
- Da Vinci PAS real FHIR submit (Bundle builder + CRD stub done)

## What's blocked on user/external action
1. **MedGuard360 LLC formation** — Delaware recommended. Stripe Atlas ($500) or Northwest ($300+$125/yr).
2. **HIPAA SRA engagement** — Coalfire ($45–75K) recommended. 6-week engagement.
3. **SOC 2 Type II observation window** — A-LIGN ($130–170K bundled with HITRUST). Start observation week 1.
4. **NCID developer account** — https://ncidsso.its.state.nc.us → Business → Developer access.
5. **NCTracks Trading Partner Agreement** — email NCMMIS_EDI_Support@gdit.com.
6. **GAMMIS provider portal** — email https://dch.georgia.gov.
7. **AWS GovCloud migration** — Week 16 of compliance plan (~$5–8K/mo).
8. **First 3 BAA counterparties** — recommended: Atrium Health, ECU Health, Grady Health + NC DHHS.
9. **Cyber liability insurance** — Marsh ($60–110K/yr premium).
10. **First 5–10 pilot providers + 50–100 consenting patient volunteers** for NC + GA.

## Critical architecture facts (cross-cutting)
- **Phase-1 states (NC/SC/GA)**: all on Palmetto GBA MAC (JM for NC/SC/VA/WV, JJ for GA/TN) + **CGS Jurisdiction C** for DMEPOS
- **Tailored Plans launched 2024-07-01** (NC): Alliance, Partners, Trillium, Vaya (Eastpointe absorbed by Trillium)
- **GA CMO procurement cutover 2026-07-01**: incumbents (Amerigroup/Wellpoint, CareSource, Peach State) sunset; Humana, Molina, UnitedHealthcare go live; foster care GF 360° moves Amerigroup → UnitedHealthcare same day
- **NC Carolina Complete Health absorbs WellCare on 2026-04-01** (Standard Plans drop 5→4)
- **NC HealthConnex enforcement currently suspended** pending NCGA reform (statute still on books)
- **AI Governance Rule (ABSOLUTE)**: AI never auto-decides PAs/credentialing/fraud/denials. Every output requires human review. Plain-language explanations mandatory.

## Next 30 days (recommended sequence)

| Week | Action |
|---|---|
| 1 | Form Delaware LLC, sign A-LIGN engagement (SOC 2 observation starts) |
| 1 | Apply NCID + NCTracks TPA, GAMMIS portal |
| 1-2 | Engage Coalfire for HIPAA SRA |
| 2 | Decide AWS GovCloud account setup (delay actual migration to week 16) |
| 2-4 | Recruit pilot providers (target 3 NC + 2 GA) |
| 3-4 | Cyber insurance through Marsh |
| 4 | Begin platform branding finalization (medguard360.com domain is registered) |

## Two-Claude session coordination warning

This repo has been edited by **two parallel Claude sessions** (one local to user's laptop, one on the Hetzner server via "ginger" agent). Today's session had a merge conflict resolved by accepting server-side versions. Going forward: **use ONE session at a time** OR always `git pull` before any work + commit/push frequently.

## Repo locations
- **GitHub**: https://github.com/BIGTRG/MedGuard360
- **Local (Windows laptop)**: `Documents\medguard360\`
- **Server**: `/opt/medguard360/` on Hetzner 178.105.21.227
- **Live demo**: http://178.105.21.227:8090 (or local: http://localhost/ after `demo-up.ps1`)
