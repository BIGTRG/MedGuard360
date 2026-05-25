# MedGuard360 — MS Enterprise Landscape

> Reference document for **Mississippi** Medicaid, Medicare, and the statewide billing ecosystem, mapping where MedGuard360 fits as a fraud-prevention + billing platform. Phase-3 pilot state.
>
> Last verified: 2026-05-23. Where information is fluid, items are tagged `[Confirm via …]`.

---

## 1. Mississippi Medicaid Agency & Structure

- **Single State Agency:** **Mississippi Division of Medicaid (DOM)** — a stand-alone executive agency under the Governor (Miss. Code § 43-13-101 et seq.) ([MS DOM](https://medicaid.ms.gov/)).
- **Executive Director:** Drew L. Snyder `[Confirm via [DOM About](https://medicaid.ms.gov/about/)]`.
- **Key adjacent agencies:**
  - **Mississippi State Department of Health (MSDH)** — public health, vital records, facility licensure (the MS analog to NC DHSR).
  - **Mississippi Department of Mental Health (DMH)** — operates I/DD waivers (ID/DD Waiver) and state psychiatric facilities.
  - **Mississippi Department of Human Services (MDHS)** — TANF, SNAP, child welfare; **some Medicaid eligibility intake at MDHS county offices** (alongside DOM regional offices).
  - **Mississippi Department of Rehabilitation Services (MDRS)** — VR + IL.
- **Internal DOM divisions of MedGuard360 interest:**
  - **Office of the Director**
  - **Office of Medicaid Program Integrity (OPI)**
  - **Office of Coordinated Care** (MississippiCAN + CHIP plan oversight)
  - **Office of LTSS**
  - **Office of Eligibility**
  - **Office of Information Technology**

---

## 2. Programs & Populations

### Enrollment

- **~720K–760K** Medicaid enrollees + **~50–60K** CHIP enrollees (Oct 2025) `[Confirm via [CMS Oct 2025 Enrollment Highlights](https://www.medicaid.gov/medicaid/national-medicaid-chip-program-information/medicaid-chip-enrollment-data/october-2025-medicaid-chip-enrollment-data-highlights)]`.
- **Expansion status: NOT EXPANDED** ([KFF Expansion Status](https://www.kff.org/medicaid/status-of-state-medicaid-expansion-decisions/)). 2024 expansion legislation failed in the Mississippi Legislature.

### Programs / sub-populations

| Population | Description | Eligibility Hook |
|---|---|---|
| **TANF / Family & Children** | Parents/caretakers + dependent children — very low income (MS parent FPL ~27%) | MAGI |
| **SSI-related / ABD** | Aged 65+, Blind, Disabled | Categorical |
| **Pregnant Women** | Up to 194% FPL; **12-month postpartum extended** (HB 539 / 2023) ([DOM PPV](https://medicaid.ms.gov/)) `[Confirm]` |
| **Mississippi CHIP** | Separate CHIP for children up to 209% FPL; operated by DOM via contracted MCOs (Magnolia Health & Molina); branded **Mississippi CHIP** ([Mississippi CHIP](https://medicaid.ms.gov/programs/chip/)) |
| **Family Planning Waiver** | Limited-benefit family planning |
| **Healthier Mississippi Waiver (HMW)** | Limited 1115 waiver — adults 19–64 below ~22% FPL who would otherwise be uninsured `[Confirm scope](https://www.medicaid.gov/medicaid/section-1115-demonstrations/state/mississippi/index.html)` |
| **Dual Eligibles** | Medicare + Medicaid |

### Dual eligibles

DOM operates standard COBA crossover; full-benefit duals receive Medicaid wrap through FFS (Gainwell-operated MMIS). Aligned D-SNPs operate but **no MMP-style integrated demonstration is active** in MS.

### Waivers

| Waiver | Authority | Population | Operator | Notes |
|---|---|---|---|---|
| **Elderly & Disabled (E&D) Waiver** | 1915(c) HCBS | Elders 65+ / disabled adults | DOM | NF alternative |
| **Independent Living (IL) Waiver** | 1915(c) HCBS | Adults w/ significant disabilities | MDRS | |
| **Traumatic Brain Injury / Spinal Cord Injury (TBI/SCI) Waiver** | 1915(c) HCBS | TBI/SCI | MDRS | |
| **Intellectual Disabilities / Developmental Disabilities (ID/DD) Waiver** | 1915(c) HCBS | I/DD | **DMH** | |
| **Assisted Living (AL) Waiver** | 1915(c) HCBS | ABD residents of contracted AL facilities | DOM | |
| **Healthier Mississippi 1115** | §1115 demo | Limited adult coverage | DOM | Current term `[Confirm via [Medicaid.gov MS 1115](https://www.medicaid.gov/medicaid/section-1115-demonstrations/state/mississippi/index.html)]` |

### Health Plans — MississippiCAN + Mississippi CHIP

**MississippiCAN (Mississippi Coordinated Access Network)** — DOM's statewide risk-based managed-care program, operating since 2011 under §1932(a). Covers most Medicaid populations except duals, some institutional, and select waiver members ([MississippiCAN](https://medicaid.ms.gov/programs/mississippican/)).

**MississippiCAN MCOs (operational as of May 2026 — 3 plans):**

1. **Magnolia Health Plan** (Centene)
2. **Molina Healthcare of Mississippi**
3. **UnitedHealthcare Community Plan of Mississippi**

`[Confirm current 3 MCOs and any post-2025 procurement changes via [DOM MCOs](https://medicaid.ms.gov/programs/mississippican/)]`.

**Mississippi CHIP plans (separate CHIP, 2 plans):**

1. **Magnolia Health (Centene)**
2. **Molina Healthcare** `[Confirm](https://medicaid.ms.gov/programs/chip/)`

**Carve-outs (NOT in MississippiCAN — remain FFS):**
- Most dental services (handled via DentaQuest or per-MCO dental subcontract `[Confirm statewide dental admin]`)
- Some I/DD waiver services (DMH-administered)
- LTC NF services (largely FFS, though increasing coordination)
- Non-emergency transportation: **MTM** is the statewide NEMT broker for FFS `[Confirm via [DOM NEMT](https://medicaid.ms.gov/transportation-resources/)]`

---

## 3. Medicare in Mississippi

| Metric | Value | Source |
|---|---|---|
| Total Medicare beneficiaries (MS) | **~650K** | [KFF Total Medicare Beneficiaries](https://www.kff.org/medicare/state-indicator/total-medicare-beneficiaries/) `[Confirm exact count]` |
| Medicare Advantage share | **~55%** | [healthinsurance.org MS](https://www.healthinsurance.org/medicare/mississippi/) `[Confirm]` |

**MAC assignments (MS):**

- **A/B MAC: Novitas Solutions, Jurisdiction JH** — covers AR, CO, LA, MS, NM, OK, TX, plus Indian Health, VA Health ([Novitas JH](https://www.novitas-solutions.com/), [CMS JH page](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/Who-are-the-MACs-A-B-MAC-Jurisdiction-H-JH)). **NEW MAC connector for MedGuard360 — JH is distinct from Palmetto JM/JJ and First Coast JN.**
- **DME MAC: CGS Administrators, Jurisdiction C (JC)** — same JC as NC/SC/GA/FL/AL/TN/VA/WV. ♻️ Reuse.
- **HH+H MAC:** Palmetto GBA serves the Southeast region including MS `[Confirm]`.

**Crossover (COBA):** DOM receives Medicare-paid claims for duals via CMS BCRC. Crossover lands in MS Envision/Gainwell MMIS for cost-share adjudication per state plan.

---

## 4. Statewide Billing Entities

| # | Entity Type | Typical Workflow | Primary Payer Path |
|---|---|---|---|
| 1 | Individual practitioners (MD/DO/PA/NP/CRNA/CNM) | 837P → MississippiCAN MCO or DOM FFS; Medicare via Novitas B | Both |
| 2 | Hospitals — acute / CAH / LTACH / IRF / psych | 837I → MCO or DOM FFS or Novitas A | Both |
| 3 | FQHC + RHC | All-inclusive PPS rate; Medicare wrap | Both |
| 4 | Behavioral health / SUD / CMHCs (15 regional CMHCs) | 837P/I to MCO (BH integrated in MississippiCAN); DMH coordination | Both |
| 5 | Nursing facilities (SNF/NF), ICF/IID | UB-04/837I monthly; **largely FFS** | Both |
| 6 | Home health | OASIS + 837I to Palmetto HH; MCO or DOM FFS for Medicaid | Both |
| 7 | Hospice | Per-diem; NOE/NOTR via Palmetto | Both |
| 8 | Pharmacy | NCPDP D.0 — DOM FFS PBM is **Conduent (Magellan-heritage) or Gainwell**, MCO plans use plan PBMs `[Confirm current FFS PBM via [DOM Pharmacy](https://medicaid.ms.gov/pharmacy/)]` | Both |
| 9 | DMEPOS suppliers | 837P to CGS JC; to MCO or DOM for Medicaid | Both |
| 10 | NEMT brokers | **MTM statewide for FFS** `[Confirm]`; MCOs contract their own | Medicaid |
| 11 | Dental | 837D — statewide dental admin `[Confirm]` | Mostly Medicaid |
| 12 | Vision (OD / optician) | 837P; eyewear vendor | Both |
| 13 | School-based services (LEAs) | MS Medicaid School Based Services | MS Medicaid only |
| 14 | I/DD waiver providers | DMH network → 837P to DOM FFS | Medicaid only |
| 15 | E&D waiver providers | Case mgmt + 837P to DOM FFS | Medicaid only |
| 16 | County health departments | Hybrid clinical + grant | Hybrid |

---

## 5. Mississippi MMIS

- **System:** **Mississippi Envision Web Portal** (Medicaid Enterprise System).
- **Fiscal Agent / Operator:** **Gainwell Technologies** (post DXC → Gainwell 2020 spinoff; successor to historical HP/DXC contract). Conduent has historically supported some component services `[Confirm prime + sub-vendors via [DOM Procurement](https://medicaid.ms.gov/)]`.
- **Provider Portal:** [https://www.ms-medicaid.com/](https://www.ms-medicaid.com/) — provider enrollment, claims, eligibility, RAs, PA, EVV.
- **EDI Gateway:** SFTP + PGP for 837/270/271/276/277/278/835.

### What MS MMIS DOES handle
- **FFS claim adjudication** for residual non-MississippiCAN populations + carve-outs (duals, NF, some waivers).
- **Encounter ingestion** from MississippiCAN MCOs + Mississippi CHIP plans.
- **Provider Enrollment** — all MS Medicaid providers (FFS *and* MCO network).
- **Pharmacy POS** for FFS (PBM contractor).
- **270/271 eligibility** — returns MCO assignment.
- **EVV aggregation** — MS uses **HHAeXchange** as state EVV aggregator `[Confirm via [DOM EVV](https://medicaid.ms.gov/electronic-visit-verification-evv/)]`.

### What MS MMIS DOES NOT handle
- MCO PA workflows.
- MCO claim adjudication.
- MA / Part D.
- DMH I/DD waiver service authorizations (DMH operates its own system).

---

## 6. MississippiCAN / CHIP Contract Terms

- **MississippiCAN** has operated continuously since 2011. **Current contract term effective July 2024–2028** with renewal options `[Confirm exact term via [DOM Procurement](https://medicaid.ms.gov/)]`.
- 3 MCOs (Magnolia/Centene, Molina, UHC) statewide.
- **MLR floor:** 85% per ACA.
- **Encounter-submission SLA:** typically within 30 days of payment, X12 837 to Envision.
- **Capitation:** PMPM by rate cell, actuary-certified.
- **Network adequacy:** DOM enforces time/distance + specialty standards.
- **Mississippi CHIP** is separately procured (Magnolia + Molina).

---

## 7. Compliance / Regulatory Surface

### Federal — same baseline as NC (HIPAA, 42 CFR 455/456, 42 CFR Part 2, ACA, ONC HTI-1/2/3, CMS-0057-F, HITECH, FCA, AKS, Stark).

### Mississippi State

| Statute | Subject |
|---|---|
| **Miss. Code § 43-13-101 et seq.** | Medical Assistance Program (DOM enabling statute) |
| **Miss. Code § 43-13-201 et seq.** | Medicaid fraud, false claims (criminal) |
| **Miss. Code § 41** | Public Health & DOH licensure |
| **Miss. Code § 41-7-173 et seq.** | Healthcare facility licensure (Certificate of Need) |
| **Miss. Code § 41-29** | Controlled substances + MS PMP |
| **Miss. Code § 73** | Professional licensing |
| **Miss. Code § 83** | Insurance Code |

**Mississippi DOES have a state false-claims statute** (Miss. Code § 43-13-225 et seq. — Medicaid Fraud Control Act). It is **not** a private-attorney-general qui tam statute on the federal-FCA model; civil actions are state-led `[Confirm via [MS AG MFCU](https://www.ago.state.ms.us/divisions/medicaid-fraud-control/)]`.

### Enforcement bodies

- **DOM Office of Program Integrity (OPI)** — pre/post-pay reviews, RAC, data analytics, recoupments.
- **Mississippi Office of the Attorney General — Medicaid Fraud Control Unit (MFCU)** — criminal/civil prosecution of provider fraud, plus elder abuse in Medicaid-funded facilities ([MS AG MFCU](https://www.ago.state.ms.us/divisions/medicaid-fraud-control/)).
- **DOM Office of Internal Audit** `[Confirm name]`.
- **MS State Auditor (OSA)** — state-government auditor with active Medicaid fraud focus ([MS OSA](https://www.osa.ms.gov/)).
- **CMS / HHS-OIG** — federal Program Integrity Reviews.

**Fraud referral flow:** DOM OPI triage → if credible criminal allegation → referral to **MS AG MFCU** (or MS OSA for certain matters) → prosecution + recoupment. CMS-required parallel reporting via T-MSIS + UPIC.

---

## 8. MedGuard360 Integration Plan (Mississippi)

### 8.1 Connector inventory

| # | Counterparty | Direction | Transport | Identity | Use case |
|---|---|---|---|---|---|
| 1 | MS Envision MMIS (Gainwell — FFS + encounters + PES) | Bi-directional | X12 837P/I/D, 270/271, 276/277, 278, 835 via SFTP/PGP | Trading-partner ID + cert | FFS claim, encounter submission, provider directory sync |
| 2 | MississippiCAN MCOs (Magnolia, Molina, UHC) | Bi-directional | FHIR R4 + X12 | OAuth2 per-plan | Claims, PA, eligibility, encounter |
| 3 | Mississippi CHIP MCOs (Magnolia, Molina) | Bi-directional | FHIR R4 + X12 | OAuth2 | CHIP claims |
| 4 | Statewide dental admin `[Confirm]` | Bi-directional | 837D + FHIR | OAuth2 | Dental claims + PA |
| 5 | DOM FFS PBM `[Confirm contractor]` | Outbound | NCPDP D.0 | BIN/PCN | Pharmacy POS FFS |
| 6 | Novitas Solutions JH (Medicare A/B) | Outbound | X12 837 via Novitas EDI Gateway | Submitter ID + cert | **NEW MAC connector — JH** — Medicare primary for duals |
| 7 | CGS JC (DME MAC) | Outbound | X12 837P + CMN | Submitter ID | ♻️ Reuse from NC/SC/GA/AL/FL/TN/VA/WV |
| 8 | MTM (NEMT statewide broker, FFS) `[Confirm]` + per-MCO brokers | Bi-directional | REST + 837P | OAuth2 | Trip auth + claim |
| 9 | Mississippi HIE (MS-HIN) | Bi-directional | FHIR R4 + ENS + Direct | OAuth2 / Direct Trust | HIE query, ENS |
| 10 | MSDH Vital Records | Inbound | SFTP + PGP | cert | Death-match suppression |
| 11 | MS DMH I/DD provider data | Bi-directional | REST | API key | ID/DD waiver service auth + claims |
| 12 | MDRS waiver data (IL, TBI/SCI) | Bi-directional | REST + flat-file | API key | IL + TBI/SCI waiver |
| 13 | Mississippi PMP (Prescription Monitoring Program) | Inbound queries | NIEM XML / PMIX | mTLS + cert | Controlled-substance queries |
| 14 | HHAeXchange (state EVV aggregator) `[Confirm]` | Bi-directional | REST + flat-file | API key | EVV |
| 15 | T-MSIS extract | Outbound | flat-file via state | n/a | Federal Medicaid reporting |
| 16 | DOM OPI fraud alerts | Outbound | REST webhook + secure email | mTLS + OAuth2 | Fraud-engine alert forwarding |
| 17 | CMS Interop APIs (CMS-0057-F) | Bi-directional | FHIR R4 (Patient/Provider/P2P/PA APIs) | SMART-on-FHIR | Compliance |
| 18 | Biometric device gateway | Inbound | proprietary + REST | device cert + mTLS | Identity verification |

### 8.2 `state-config-service` package (MS)

- MMIS endpoint = MS Envision Gainwell SFTP + portal
- MCO catalog = 3 MississippiCAN MCOs + 2 CHIP MCOs
- PA timelines per CMS-0057-F + DOM Administrative Code
- EVV aggregator = HHAeXchange `[Confirm]`
- PBM = DOM-contracted FFS PBM `[Confirm]`
- Fraud-engine alert endpoint = DOM OPI ingest URL `[Confirm]`
- MFCU endpoint = MS AG MFCU evidence-bundle template
- State FCA template = Miss. Code § 43-13-225 variant (state-led action only, not private qui tam)

---

## 9. Mississippi HIE

- **State-Designated Entity:** **Mississippi Health Information Network (MS-HIN)** — non-profit operating Mississippi's statewide HIE ([MS-HIN](https://www.mshin.net/)).
- **Services:**
  - Patient query (Master Patient Index)
  - Direct Secure Messaging
  - ADT-based ENS (limited subscribers) `[Confirm]`
- **Mandate:** Voluntary; no statutory mandate analogous to NCGS 90-414.4.
- **TEFCA/QHIN:** Status `[Confirm via [eHealth Exchange](https://ehealthexchange.org/)]`.
- **MedGuard360 `hie-service` integration:**
  - Query HIE for documentation supporting PA decisions.
  - Subscribe to ENS where available.
  - Submit MedGuard-aggregated summaries per BAA.

---

## 10. Mississippi Medicaid Program Integrity Workflow

### 10.1 Lifecycle

1. **Detection** — DOM OPI algorithmic + tips (DOM fraud hotline) + UPIC + MedGuard360 fraud-engine alert.
2. **Triage** at OPI: clinical review, statistical sampling.
3. **Pre-payment review hold** or **post-payment recoupment** under Miss. Code § 43-13-225.
4. **Credible allegation of fraud (CAF)** under 42 CFR 455.23 → payment suspension.
5. **Referral** to **MS AG MFCU** for criminal/civil prosecution.
6. **Sanction** — termination, federal FCA, exclusion, restitution.
7. **Recovery** booked to state + federal share per FMAP.

### 10.2 Scale notes

- MS Medicaid is mid-sized (~760K enrollees).
- MS AG MFCU operates at proportional scale to AL/SC — mid-tier MFCU recovery profile `[Confirm via [HHS-OIG MFCU FY2024 Annual Report](https://oig.hhs.gov/reports/all/2025/medicaid-fraud-control-units-annual-report-fiscal-year-2024/)]`.
- MS State Auditor has been notably active in Medicaid fraud matters in 2023–2025.

### 10.3 MedGuard360 fraud-engine → OPI handoff

- Alert payload: provider NPI, claim batch IDs, statistical confidence, scheme classification, evidence bundle.
- Transport: signed JSON over mTLS REST to DOM OPI ingestion endpoint `[Confirm endpoint spec via DOM IT]`.
- SLA: high-severity within 4h; routine daily batch.
- `audit-service` retains immutable case file (WORM) for 10y per MS retention rules.

---

## 11. Funding & FY2026 FMAP

- **MS traditional FMAP FY2026:** **~77%** — Mississippi is consistently the **highest-FMAP state** in the nation due to lowest per-capita income `[Confirm via [KFF FMAP](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/) and [MACPAC Exhibit 6](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)]`.
- **MS E-FMAP (CHIP) FY2026:** ~84% `[Confirm via MACPAC Exhibit 6]`.
- **Expansion FMAP:** **N/A — MS has not expanded.**
- **Administrative match:** 50% federal baseline; MMIS O&M 75%; MMIS DDI 90%; fraud detection systems 75% per 42 CFR 433.111.
- **OBBB Act (HR 1) impact:** Work-reporting does **not** apply to MS (no expansion population). Non-expansion-state effects apply.

**Economic significance:** With ~77% FMAP (highest in the nation), federal funds carry ~77¢ of every Medicaid dollar in Mississippi. **State cost-share for federally-matched MedGuard360 functions (75–90% federal share on MMIS DDI/O&M and fraud detection) is the lowest of any Phase-3 state.** This makes MS the most price-favorable state procurement environment for federally-matched MedGuard360 line items.

---

## 12. Key Differences from NC + Onboarding Effort

### Key differences vs. NC primary

| Axis | NC | MS | Implication for MedGuard360 |
|---|---|---|---|
| Agency model | NC DHHS / DHB (multi-division) | **DOM stand-alone executive agency** | Cleaner single-point integration |
| Expansion | YES (Dec 2023) | **NO** (failed 2024 leg) | No 90% FMAP boost |
| Managed-care brand | PHP + Tailored + CFSP + EBCI (~11 plan products) | **MississippiCAN (3 MCOs) + CHIP (2 MCOs)** | Smallest MCO roster of any Phase-3 state |
| MMIS vendor | Gainwell (NCTracks) | **Gainwell (MS Envision)** | ♻️ Strong reuse |
| MAC (A/B) | Palmetto JM | **Novitas Solutions JH** | **NEW MAC connector — JH** (also covers AR/CO/LA/NM/OK/TX so connector becomes basis for future Phase-3 rollout to those states) |
| DME MAC | CGS JC | **CGS JC** | ♻️ Reuse |
| HIE | NC HealthConnex (SAS) | **MS-HIN** | Strategy-pattern adapter |
| State FCA | NCGS Ch. 14 + 108A | **Miss. Code § 43-13-225 (state-led, no private qui tam)** | State-led variant — simpler than VA VFATA/TN FCA |
| BH carve-out | Tailored Plans (4 LME/MCOs) | **Integrated in MississippiCAN** | NC outlier; MS standard |
| Scale | ~3.1M enrollees | **~760K + 60K CHIP** | ~¼ the volume |
| FMAP | ~65% | **~77% (highest in nation)** | Most federally-favorable cost-share of any pilot |
| EVV vendor | NCTracks aggregator | **HHAeXchange** `[Confirm]` | New EVV adapter |
| CHIP model | Largely merged into Medicaid | **Separate CHIP (Mississippi CHIP) via dedicated MCO contracts** | CHIP plan connectors needed separately |

### Estimated onboarding effort

**~55 person-weeks** — **~37% lighter than the NC primary buildout.** Major efficiency drivers:

1. ♻️ Gainwell MMIS pattern reuse from NC/GA/AL/WV.
2. ♻️ CGS JC reuse.
3. Only 3 MississippiCAN MCOs + 2 CHIP MCOs = 5 plan connectors total (vs. NC's 11).
4. Single-agency DOM = simpler political surface.
5. No state qui tam private-action variant needed (simpler evidence template than VA/TN/FL).

**Net-new build items:**
1. **Novitas JH Medicare A/B connector** — **first MedGuard pilot in JH territory**; significant net-new submitter-registration + EDI Gateway adapter (but **highly reusable** for future Phase-3 expansion into AR/CO/LA/NM/OK/TX).
2. MS-HIN HIE adapter.
3. Mississippi PMP query adapter.
4. DOM-specific FFS PBM POS profile `[Confirm contractor]`.
5. HHAeXchange EVV adapter `[Confirm]`.
6. Separate Mississippi CHIP connector layer (CHIP and MississippiCAN are procured separately, even with overlapping carriers).

**Strategic value:** Mississippi delivers the **Novitas JH connector beachhead** — a single buildout that unlocks Phase-3 expansion across the entire JH footprint (AR, CO, LA, NM, OK, TX, plus IHS/VA). Combined with the **highest FMAP in the nation**, MS is the most strategically leveraged Phase-3 state for federally-matched ROI.

---

## Appendix — Primary Mississippi Sources

- [MS Division of Medicaid (DOM)](https://medicaid.ms.gov/) · [DOM MississippiCAN](https://medicaid.ms.gov/programs/mississippican/) · [DOM Mississippi CHIP](https://medicaid.ms.gov/programs/chip/)
- [MS Envision Provider Portal](https://www.ms-medicaid.com/)
- [Mississippi Department of Health (MSDH)](https://msdh.ms.gov/)
- [Mississippi Department of Mental Health (DMH)](https://www.dmh.ms.gov/)
- [Mississippi Department of Rehabilitation Services (MDRS)](https://www.mdrs.ms.gov/)
- [MS Health Information Network (MS-HIN)](https://www.mshin.net/)
- [MS AG Medicaid Fraud Control Unit](https://www.ago.state.ms.us/divisions/medicaid-fraud-control/)
- [MS State Auditor](https://www.osa.ms.gov/)
- [Novitas Solutions (MAC JH)](https://www.novitas-solutions.com/) · [CMS A/B MAC JH](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/Who-are-the-MACs-A-B-MAC-Jurisdiction-H-JH)
- [CGS JC (DME MAC)](https://www.cgsmedicare.com/jc/)
- [Miss. Code (online)](https://law.justia.com/codes/mississippi/)
- [Medicaid.gov MS 1115](https://www.medicaid.gov/medicaid/section-1115-demonstrations/state/mississippi/index.html)
- [KFF FMAP](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/) · [MACPAC Exhibit 6](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)

---

*Document owner: MedGuard360 Enterprise Integrations. File: `integrations/ms-enterprise/README.md`. Companion: `integrations/PILOT-STATES-COMPARISON.md`.*
