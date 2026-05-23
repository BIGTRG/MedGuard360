# MedGuard360 — 26-Week Compliance Execution Plan
**Start:** 2026-05-23 (Saturday) — **BAA-Signable Target:** 2026-11-23 (Monday, Week 26)
**Tracks (parallel):** HIPAA SRA · SOC 2 Type II · HITRUST CSF i1 · Engineering controls · Vendor onboarding · Pen test · BAA negotiations
**Plan owner:** CISO (Maria Chen) — weekly standup Mondays 9:00 ET. Status reported to CEO/CFO Fridays.

---

## 0. Vendor & assessor shortlist (with rough cost estimates)

| Workstream | Recommended firm | Why | Rough cost (2026) | Reference |
|---|---|---|---|---|
| HIPAA SRA | **Coalfire** (primary) — alt: Clearwater Compliance | Strong Medicaid/state-payer track record; NIST 800-66r2 methodology | **$45–75K** for a single-product SRA | https://coalfire.com/services/risk-and-compliance/hipaa |
| SOC 2 Type II + HITRUST i1 | **A-LIGN** (one firm = one project plan) | Top-3 HITRUST assessor by validated reports; SOC + HITRUST bundle pricing | SOC 2 Type II **$55–95K**; HITRUST i1 **$60–110K** (often bundled $130–170K) | https://www.a-lign.com/articles/everything-you-need-to-know-about-hitrust-certification , https://soc2auditors.org/soc-2-audit-cost/ |
| Backup HITRUST | **BARR Advisory** or **Schellman** | If A-LIGN bandwidth is constrained Q3 | similar | https://www.barradvisory.com/resource/hitrust-assessments/ |
| Penetration test | **Bishop Fox** (primary) — alt: NetSPI, TrustedSec | App + cloud + external; OSCP/OSCE staff | **$45–80K** for 3-week engagement | https://bishopfox.com/services |
| Compliance GRC tooling | **Vanta** or **Drata** | Auto-evidence collection for SOC 2 + HITRUST; cuts assessor time ~30% | **$30–60K/yr** for ~50 employees | https://www.vanta.com/products/hitrust , https://drata.com/pricing |
| Outside counsel — privacy | **Womble Bond Dickinson** (NC) + **Alston & Bird** (GA) | Both have HIPAA + Medicaid practices | **$650–950/hr**, budget $40K for BAA negotiations | — |
| Cyber insurance broker | **Marsh** or **Woodruff Sawyer** | $10M cyber tower placement | premium est. **$60–110K/yr** | — |
| Identity (NCID) | NC DIT — NCID program | Required for NC DHHS access | No license fee; integration cost internal | https://it.nc.gov/services/identity-access-management/ncid |
| Identity (Clerk Pro upgrade) | Clerk | SAML + SCIM + advanced MFA features needed for state SSO | **~$25K/yr** Pro tier at our scale | https://clerk.com/pricing |
| EDI gateway (NCTracks TPA) | NC DHHS Provider Services | Required for 837/835 exchange | No license fee; bond + testing window | https://www.nctracks.nc.gov/content/public/providers/trading-partners.html |
| Contact center | Twilio Flex (HIPAA-eligible) | Investigator outreach with BAA | **~$150/seat/mo** + usage | https://www.twilio.com/en-us/flex/pricing |
| Cloud (HIPAA-eligible, government workloads) | AWS GovCloud (US) | Required for many state contracts; FedRAMP High | ~**20–30% premium** vs commercial AWS | https://aws.amazon.com/govcloud-us/pricing/ |

**Total external spend estimate, 26 weeks:** **$380K–$620K** (audits + tools + counsel + insurance + cloud delta).

---

## 1. Phase overview

| Phase | Weeks | Headline outcome |
|---|---|---|
| Foundation | 1–4 | Assessors engaged, GRC tool live, SOC 2 observation period **starts Week 1** |
| Control build-out | 5–12 | Close all Partial → Implemented; CloudHSM live; GovCloud cutover plan signed |
| HITRUST i1 readiness | 9–18 | All 182 i1 reqs evidenced in MyCSF |
| External validation | 13–22 | Pen test, HIPAA SRA report, vendor SIG-Lite sweep |
| Audit fieldwork | 23–26 | SOC 2 Type II fieldwork + HITRUST i1 validated assessment + first signed BAA |

> **Why SOC 2 observation starts Week 1, not later:** SOC 2 Type II requires a minimum 3-month observation window for an opinion (auditor preference: 6 months). We are accepting the **3-month minimum** to make the Nov 23 target — confirm with A-LIGN that a 3-month period is acceptable for the pilot opinion; plan to extend to 12 months for the FY27 renewal.

---

## 2. Week-by-week plan

### Week 1 — 2026-05-23 → 2026-05-29 · "Engagement & observation start"

- **HIPAA SRA:** Sign Coalfire SOW; kickoff call Thursday. Coalfire provides 800-66r2 data request list.
- **SOC 2:** Sign A-LIGN SOW for **SOC 2 Type II + HITRUST i1 bundle**. **Observation period begins 2026-05-25.**
- **HITRUST:** Provision MyCSF subscription ($16K). Assessor (A-LIGN) initiates Readiness Assessment scoping.
- **Engineering:** Stand up Vanta tenant; connect AWS, GitHub, Clerk, Datadog, Jira, Jamf, Intune.
- **Vendors:** File NCTracks Trading Partner Agreement application (4–8 wk approval); submit NCID integration request to NC DIT.
- **Pen test:** Issue RFP to Bishop Fox / NetSPI / TrustedSec — target signature by Week 5.
- **BAA:** Outside counsel kickoff (Womble + Alston) on BAA template (this repo, `BAA-template.md`); draft Underlying Services Agreement v1.

### Week 2 — 2026-05-30 → 2026-06-05 · "Scoping & evidence inventory"

- **SRA:** Coalfire on-site (or virtual) workshops — asset inventory, data flow, threat modeling.
- **SOC 2:** A-LIGN issues PBC list (~250 items); we tag in Vanta.
- **HITRUST:** Confirm i1 scope = MedGuard360 SaaS + supporting GovCloud infra (single boundary). Lock the scope memo.
- **Engineering:** Close CM-7 — Calico egress allowlist merged. Falco deployment to staging (SI-4 prep).
- **Vendors:** Clerk Pro upgrade contract signed (~$25K/yr); SAML/SCIM enabled in dev.
- **BAA:** First state-side feedback: send template to NC DHHS Privacy Office for informal review.

### Week 3 — 2026-06-06 → 2026-06-12 · "Risk register stand-up"

- **SRA:** Threats × vulnerabilities × likelihood × impact matrix in `compliance/risk-register.xlsx`. Coalfire validates methodology.
- **SOC 2:** Org chart, board minutes, sanction policy uploaded (CC1.x).
- **HITRUST:** Begin scoring 01.x (Access Control) requirements in MyCSF.
- **Engineering:** RA-3/RA-5 procedure docs finalized; Tenable.io authenticated scan baseline.
- **Vendors:** NCTracks application acknowledged — testing slot tentatively Week 14–16.
- **Pen test:** Pick Bishop Fox; sign $65K SOW for Weeks 20–22.
- **BAA:** Outside counsel returns redlines on template v1.1.

### Week 4 — 2026-06-13 → 2026-06-19 · "SRA report delivered (draft)"

- **SRA:** Coalfire delivers **draft HIPAA SRA report** — corrective action plan (CAP) created.
- **SOC 2:** First A-LIGN check-in. Confirm control inventory matches scope.
- **HITRUST:** Score 02.x (HR Security) and 04.x (Policy).
- **Engineering:** Close AC-6 break-glass automation (PagerDuty 2-person approval). Vanta hits 70% coverage.
- **Vendors:** AWS GovCloud account vended via AWS Control Tower. Migration plan v1 (lift-and-shift via DRS).
- **BAA:** Template v1.2 ready; share with first 3 provider design partners (NC: Atrium, ECU; GA: Grady) for friendly review.

### Week 5 — 2026-06-20 → 2026-06-26 · "Control build sprint #1"

- **SRA:** CAP items begin — assign owners + due dates.
- **HITRUST:** Score 05.x and 07.x (Asset Management).
- **Engineering:** **SI-4 Falco prod rollout complete** with k8s admission webhook. UEBA rules in Datadog for AU-6.
- **Vendors:** Twilio Flex pilot in dev w/ BAA. SendGrid PHI-safe templates approved.
- **Pen test:** Bishop Fox kickoff call — rules of engagement.

### Week 6 — 2026-06-27 → 2026-07-03 · "Identity federation"

- **HITRUST:** Score 06.x (Compliance).
- **Engineering:** NCID SAML integration in staging; e2e test with NC DIT sandbox account. IA-8 evidenced.
- **Vendors:** GovCloud subnet/VPC build-out complete; KMS keys created with FIPS 140-3 endpoints.
- **BAA:** Receive consolidated redlines from Atrium counsel; triage. Compare against template's playbook (acceptable, gray, dealbreaker).

### Week 7 — 2026-07-04 → 2026-07-10 · "Supply-chain integrity"

- **HITRUST:** Score 08.x (Physical) — inheriting from AWS GovCloud SOC report.
- **Engineering:** **SI-7 Sigstore/Cosign signing of all container images**; admission controller blocks unsigned in staging. SBOM (CycloneDX) per build.
- **Vendors:** Datadog HIPAA mode enabled (PHI scrubbing, dedicated US region); execute Datadog BAA.

### Week 8 — 2026-07-11 → 2026-07-17 · "Incident response polish"

- **SRA:** CAP 30% complete.
- **HITRUST:** Score 11.x (Incident) and 12.x (BCM). Tabletop exercise with Coalfire observing (counts as 11.d evidence).
- **Engineering:** State breach-notification matrix complete (NC AG, GA AG, HHS OCR, CISA). IR-6 closed.
- **BAA:** Counter-redline to Atrium returned. Initiate parallel BAA conversations with ECU Health and Grady.

### Week 9 — 2026-07-18 → 2026-07-24 · "HITRUST i1 sprint kickoff"

- **HITRUST:** Score 09.x (Comms & Ops) — largest domain (~53 reqs); split across 3 engineering pods.
- **SOC 2:** Mid-observation A-LIGN check-in. Pull control samples; auditor flags 2 logging gaps.
- **Engineering:** Address logging gaps within 5 days (AU-6 enhancements).
- **Vendors:** AWS GovCloud — start staging environment cutover dry-run.

### Week 10 — 2026-07-25 → 2026-07-31 · "Encryption & key mgmt"

- **HITRUST:** Continue 09.x scoring (network controls, exchange, monitoring).
- **Engineering:** Enable per-tenant CMK in RDS + S3; envelope-encryption pattern documented.
- **Vendors:** **CloudHSM cluster `medguard-hsm-1` provisioned** in GovCloud (2 HSM minimum for HA).

### Week 11 — 2026-08-01 → 2026-08-07 · "FIPS 140-3 milestone"

- **HITRUST:** Finish 09.x; begin 10.x (SDLC, crypto, vuln mgmt).
- **Engineering:** **SC-13 CloudHSM-backed KMS keys cut over for prod-equivalent workloads in GovCloud.** Validate via `aws kms describe-key` showing `Origin=AWS_CLOUDHSM`.
- **Vendors:** NCTracks TPA testing slot confirmed — Week 15. Submit 837 test files.

### Week 12 — 2026-08-08 → 2026-08-14 · "Policy & training sweep"

- **HITRUST:** Score 10.x.
- **Engineering:** Annual HIPAA training cycle in KnowBe4 for all staff — 100% completion target by Week 14.
- **SOC 2:** A-LIGN interim — observation period **3 months complete on 2026-08-25**. Begin sample testing.
- **BAA:** Atrium signs **MOU to execute BAA upon SOC 2 Type II issuance** (forward commitment).

### Week 13 — 2026-08-15 → 2026-08-21 · "GovCloud production cutover prep"

- **HITRUST:** Score 13.x (Privacy Practices).
- **SRA:** CAP 60% complete; Coalfire mid-engagement review.
- **Engineering:** Production cutover runbook to GovCloud; change freeze window scheduled for Week 17.
- **Pen test:** Bishop Fox pre-test kickoff; environment access provisioned (read-only PHI in scrubbed staging).

### Week 14 — 2026-08-22 → 2026-08-28 · "GA SSO & state expansion"

- **HITRUST:** Finish all 182 i1 reqs scored; begin remediation of any < Implemented.
- **Engineering:** **IA-8 Georgia SSO live** (OIDC via GeorgiaGov).
- **Vendors:** Submit GA DCH Provider Services application; pre-engage GeorgiaGov SSO admin.
- **BAA:** ECU returns redlines; mostly aligned with Atrium's. Consolidate into template v1.3.

### Week 15 — 2026-08-29 → 2026-09-04 · "NCTracks live testing"

- **HITRUST:** First MyCSF "ready for validation" pass — A-LIGN scoping fieldwork.
- **Engineering:** **NCTracks EDI test files exchanged successfully** (837P, 835, 270/271).
- **Vendors:** Procure cyber-liability policy ($10M tower) via Marsh — binders by Week 18.

### Week 16 — 2026-09-05 → 2026-09-11 · "GovCloud cutover (production)"

- **Engineering:** **Production cutover to AWS GovCloud over the long weekend (Labor Day +1).** Cutover playbook from Week 13. Rollback window 4 hr.
- **HITRUST:** Address any "Not Implemented" reqs surfaced in Week 15.
- **SRA:** Coalfire delivers **final HIPAA SRA report**.

### Week 17 — 2026-09-12 → 2026-09-18 · "Post-cutover stabilization"

- **Engineering:** Cutover hypercare; performance + audit-log verification; QLDB ledger continuity test.
- **HITRUST:** All 182 reqs at "Implemented" by Friday.
- **BAA:** Template v1.4 ratified by counsel; circulate to Grady.

### Week 18 — 2026-09-19 → 2026-09-25 · "Insurance & vendor risk"

- **Vendors:** **Cyber-liability policy bound** ($10M/$20M); insurance certificate ready for §10 of BAA.
- **HITRUST:** A-LIGN starts **i1 validated assessment fieldwork** (typical duration 4–6 weeks).
- **Engineering:** SIG-Lite sweep complete on all sub-BAs (Exhibit B of BAA verified).

### Week 19 — 2026-09-26 → 2026-10-02 · "Pen test launch"

- **Pen test:** **Bishop Fox engagement starts** — external + app + cloud (3 weeks).
- **HITRUST:** A-LIGN fieldwork week 2; pull samples.
- **SOC 2:** A-LIGN parallel SOC 2 fieldwork begins (samples will overlap to reduce burden).

### Week 20 — 2026-10-03 → 2026-10-09 · "Pen test week 2"

- **Pen test:** Bishop Fox in active testing; daily triage call.
- **HITRUST + SOC 2:** Fieldwork continues; engineering on standby for follow-up questions (24-hr SLA).

### Week 21 — 2026-10-10 → 2026-10-16 · "Pen test wrap + remediation"

- **Pen test:** Bishop Fox delivers **draft report** Friday. Triage High/Critical for fix-by-Week-23.
- **HITRUST + SOC 2:** Fieldwork tail; resolve remaining auditor open items.

### Week 22 — 2026-10-17 → 2026-10-23 · "Remediation sprint"

- **Pen test:** All High/Critical findings fixed and retested. Bishop Fox issues **final report**.
- **HITRUST:** A-LIGN final scoring in MyCSF; QA review begins.
- **SOC 2:** Management Representation Letter drafted; system description finalized.

### Week 23 — 2026-10-24 → 2026-10-30 · "Audit closeout #1"

- **SOC 2:** A-LIGN closes fieldwork. Report drafting begins.
- **HITRUST:** A-LIGN submits to HITRUST Alliance QA.
- **BAA:** All three design-partner counsel sessions resolved; final v2.0 template approved.

### Week 24 — 2026-10-31 → 2026-11-06 · "Reports drafted"

- **SOC 2:** **Draft SOC 2 Type II report delivered** (qualified opinion possible — review with A-LIGN).
- **HITRUST:** HITRUST Alliance QA review in progress.
- **BAA:** **Sign first BAA with Atrium Health** (forward commitment from Week 12 honored upon Type II draft).

### Week 25 — 2026-11-07 → 2026-11-13 · "Final SOC 2 + HITRUST"

- **SOC 2:** **Final SOC 2 Type II report issued** by A-LIGN.
- **HITRUST:** **HITRUST CSF i1 certification letter issued** (1-year validity per HITRUST i1 program).
- **BAA:** **Sign BAA with ECU Health**. NC DHHS BAA negotiation enters final round.

### Week 26 — 2026-11-14 → 2026-11-23 · "BAA-signable date"

- **BAA:** **Sign BAA with Grady Health (GA)** + **NC DHHS Division of Health Benefits BAA**. Distribute SOC 2 + HITRUST reports to all signed BAs under NDA.
- **All tracks:** Compliance pack v1.0 published internally: SOC 2 Type II report, HITRUST i1 certificate, HIPAA SRA report, pen test attestation letter, cyber-insurance certificate, BAA template v2.0, Sub-BA register.
- **Plan close-out:** Retrospective; FY27 plan = extend SOC 2 observation to 12 months, schedule HITRUST i1 1-year rapid recertification (~60 core controls per HITRUST Alliance), plan HITRUST r2 evaluation for FY28 enterprise deals.

---

## 3. RACI snapshot

| Workstream | R (Responsible) | A (Accountable) | C (Consulted) | I (Informed) |
|---|---|---|---|---|
| HIPAA SRA | Compliance Lead | CISO | Coalfire, Legal | CEO, CFO |
| SOC 2 Type II | Compliance Lead | CISO | A-LIGN, Engineering Mgrs | CEO, CFO, Board |
| HITRUST i1 | Compliance Lead | CISO | A-LIGN, HITRUST | CEO |
| Engineering controls | Platform Eng Mgr | CTO | SecOps | CISO |
| Vendor onboarding | COO | CFO | Procurement, Legal | CISO |
| Pen test | SecOps Lead | CISO | Bishop Fox | Engineering |
| BAA negotiations | General Counsel | CEO | CISO, Womble, Alston | CFO |

---

## 4. Risk register for the plan itself (top 5)

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | NCTracks TPA approval slips past Week 15 | Med | High | Start Week 1; weekly status; backup is pure HTTP API integration |
| 2 | SOC 2 3-month observation deemed insufficient by some customers | Med | Med | Pre-negotiate forward-commitment BAAs; offer Type I bridge letter |
| 3 | HITRUST i1 fieldwork uncovers >5 "Not Implemented" reqs | Med | High | Vanta evidence collection weekly; A-LIGN check-ins from Week 5 |
| 4 | GovCloud cutover (Week 16) exceeds 4-hr rollback window | Low | High | Two prior dry-runs (Weeks 9 + 13); blue-green via Route 53 weighted records |
| 5 | Pen test surfaces Critical finding < 1 week before BAA target | Med | Med | Buffer Week 22 for remediation; can issue BAA with documented compensating control if non-PHI-exposing |

---

## 5. Authoritative references

- HITRUST i1 program — https://hitrustalliance.net/assessments-and-certifications/i1
- A-LIGN HITRUST overview — https://www.a-lign.com/articles/everything-you-need-to-know-about-hitrust-certification
- SOC 2 cost market data — https://soc2auditors.org/soc-2-audit-cost/ , https://www.brightdefense.com/resources/soc-2-audit-costs/
- Coalfire SOC 2 cost discussion — https://coalfire.com/the-coalfire-blog/the-hidden-costs-of-soc-2-and-how-to-budget-for-them
- NIST SP 800-66r2 (HIPAA implementation) — https://csrc.nist.gov/pubs/sp/800/66/r2/final
- AWS GovCloud pricing — https://aws.amazon.com/govcloud-us/pricing/
- Clerk pricing — https://clerk.com/pricing
- NCTracks Trading Partner — https://www.nctracks.nc.gov/content/public/providers/trading-partners.html
- NCID — https://it.nc.gov/services/identity-access-management/ncid
- Twilio Flex pricing — https://www.twilio.com/en-us/flex/pricing
- Vanta HITRUST — https://www.vanta.com/products/hitrust
- 2026 HIPAA Security Rule NPRM (encryption now mandatory) — https://www.federalregister.gov/documents/2025/01/06/2024-30983/hipaa-security-rule-to-strengthen-the-cybersecurity-of-electronic-protected-health-information
