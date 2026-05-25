# MedGuard360 — FL Enterprise Landscape

> Reference document for **Florida** Medicaid, Medicare, and the statewide billing ecosystem, mapping where MedGuard360 fits as a fraud-prevention + billing platform. Phase-3 pilot state.
>
> Last verified: 2026-05-23. Where information is fluid, items are tagged `[Confirm via …]`.

---

## 1. Florida Medicaid Agency & Structure

- **Single State Agency:** **Agency for Health Care Administration (AHCA)** ([AHCA Home](https://ahca.myflorida.com/)). AHCA is the Florida agency designated under 42 CFR 431.10 as the single state Medicaid agency.
- **Secretary:** Jason Weida `[Confirm via [AHCA Leadership](https://ahca.myflorida.com/about-ahca)]`.
- **Sister agencies in the Medicaid ecosystem:**
  - **Department of Children and Families (DCF)** — Medicaid **eligibility determination** via the ACCESS Florida system ([DCF ACCESS](https://www.myflfamilies.com/services/public-assistance/access)).
  - **Department of Health (DOH)** — Children's Medical Services (CMS) plan, public health, vital records.
  - **Department of Elder Affairs (DOEA)** — CARES program (LTC level-of-care), SHINE Medicare counseling.
  - **Agency for Persons with Disabilities (APD)** — operates the iBudget Florida 1915(c) HCBS waiver for I/DD.
  - **Department of Health — Children's Medical Services** — CMS Health Plan, a specialty plan within SMMC.
- **AHCA divisions of operational interest to MedGuard360:**
  - **Division of Medicaid** — policy, plan management, FFS operations.
  - **Bureau of Medicaid Program Integrity (MPI)** — fraud and abuse, recoupments, sanctions ([MPI](https://ahca.myflorida.com/medicaid/medicaid-program-integrity)).
  - **Bureau of Medicaid Quality** — HEDIS/CAHPS, plan oversight.
  - **Division of Health Quality Assurance (HQA)** — facility licensure (the FL analog to NC DHSR).

---

## 2. Programs & Populations

### Enrollment

- **~4.3M** Medicaid + CHIP enrollees (Oct 2025) `[Confirm via [CMS Oct 2025 Enrollment Highlights](https://www.medicaid.gov/medicaid/national-medicaid-chip-program-information/medicaid-chip-enrollment-data/october-2025-medicaid-chip-enrollment-data-highlights)]`. FL saw a large unwinding-related decline from a 2023 peak of ~5.7M.
- **Expansion status: NOT EXPANDED.** Florida has not adopted ACA Medicaid expansion ([KFF Expansion Status](https://www.kff.org/medicaid/status-of-state-medicaid-expansion-decisions/)).

### Programs / sub-populations

| Population | Description | Eligibility Hook |
|---|---|---|
| **TANF / Family & Children** | Parents/caretakers + dependent children; very low income thresholds (FL parent FPL ~31%) | MAGI via DCF |
| **SSI-related / ABD** | Aged 65+, Blind, Disabled | Categorical + asset-tested |
| **Pregnant Women** | Up to 196% FPL pregnancy + 12-month postpartum (extended PPV adopted) | MAGI |
| **Florida KidCare / CHIP** | Children up to 215% FPL; umbrella includes **MediKids** (1–4), **Florida Healthy Kids** (5–18), **CMS Health Plan** (special-needs children), and **Medicaid for Children** ([Florida KidCare](https://www.floridakidcare.org/)) |
| **Family Planning Waiver** | Limited-benefit family planning |
| **Medically Needy** | Spend-down program (FL is a Medically-Needy state) |
| **Dual Eligibles** | Medicare + Medicaid; FL has the 2nd-largest dual population in the US |

### Dual eligibles

FL operates an integrated dual-special-needs structure under **Statewide Medicaid Managed Care (SMMC)** with Long-Term Care (LTC) component for full-benefit duals; many full duals are aligned to companion D-SNPs run by their SMMC MMA plan ([SMMC LTC](https://ahca.myflorida.com/medicaid/statewide-medicaid-managed-care)).

### Waivers

| Waiver | Authority | Population | Operator | Notes |
|---|---|---|---|---|
| **SMMC §1115** | 1115 demo | Statewide MMA + LTC + Dental | AHCA + contracted plans | Renewed; current term runs through 2030 `[Confirm via [Medicaid.gov FL 1115](https://www.medicaid.gov/medicaid/section-1115-demonstrations/state/florida/index.html)]` |
| **iBudget Florida** | 1915(c) HCBS | I/DD | **APD** | Capped slots; long waitlist |
| **Model Waiver** | 1915(c) | Medically fragile children (ages 0–20) requiring NF/hospital alternative | DOH CMS | |
| **Familial Dysautonomia** | 1915(c) | Specific dx | DOH | |
| **PACE** | 1934 | Frail elders | Multiple PACE orgs | |

### Health Plans — Statewide Medicaid Managed Care (SMMC)

Florida runs a **statewide capitated managed-care program** with three integrated components:

1. **MMA (Managed Medical Assistance)** — acute care
2. **LTC (Long-Term Care)** — HCBS + nursing facility for elders/disabled
3. **Dental** — statewide dental prepaid plans (DentaQuest, Liberty Dental, MCNA)

**Current SMMC contract (2024–2030 procurement):** AHCA awarded contracts in 2024 to ~9 plans by region; operational lineup as of May 2026 ([AHCA SMMC Plans](https://ahca.myflorida.com/medicaid/statewide-medicaid-managed-care/recipients)):

- **Aetna Better Health of Florida** (CVS Health)
- **Humana Medical Plan / Humana Healthy Horizons in Florida**
- **Molina Healthcare of Florida**
- **Simply Healthcare Plans** (Elevance/Anthem)
- **Sunshine State Health Plan** (Centene)
- **UnitedHealthcare of Florida**
- **Community Care Plan (CCP)** — provider-sponsored
- **South Florida Community Care Network / Florida Community Care** — provider-sponsored, regional
- **AmeriHealth Caritas Florida** `[Confirm post-2024 award scope](https://ahca.myflorida.com/medicaid/statewide-medicaid-managed-care/recipients)`

**Specialty plans within SMMC:**
- **CMS (Children's Medical Services) Health Plan** — operated by Sunshine State Health Plan/Centene under DOH stewardship for medically-complex children
- **Specialty serious-mental-illness plan** — Magellan Complete Care of FL (historical) `[Confirm current SMI specialty plan]`
- **HIV/AIDS specialty plan** — Clear Health Alliance (subsidiary of Simply Healthcare) `[Confirm]`
- **Child welfare specialty plan** — Sunshine State Health Plan (for children in DCF custody) `[Confirm]`

**Dental prepaid plans (statewide, all regions):** DentaQuest, Liberty Dental, MCNA Dental.

---

## 3. Medicare in Florida

| Metric | Value | Source |
|---|---|---|
| Total Medicare beneficiaries (FL) | **~5.0M** (2nd-largest state) | [KFF Total Medicare Beneficiaries](https://www.kff.org/medicare/state-indicator/total-medicare-beneficiaries/) `[Confirm exact count]` |
| Medicare Advantage share | **~55–60%** | [healthinsurance.org FL](https://www.healthinsurance.org/medicare/florida/) `[Confirm]` |
| Total dual eligibles | ~1M+ (2nd-largest dual population nationally) | `[Confirm via [CMS dual data](https://www.cms.gov/medicare-medicaid-coordination/medicare-and-medicaid-coordination/medicare-medicaid-coordination-office)]` |

**MAC assignments (FL):**

- **A/B MAC: First Coast Service Options, Jurisdiction N (JN)** — covers FL, PR, USVI ([First Coast](https://medicare.fcso.com/), [CMS JN page](https://www.cms.gov/medicare/coding-billing/medicare-administrative-contractors-macs/whos-mac)).
- **DME MAC: CGS Administrators, Jurisdiction C (JC)** — same JC as NC/SC/GA/AL/MS/TN/VA/WV. ([CGS JC](https://www.cgsmedicare.com/jc/)).
- **HH+H MAC:** Palmetto GBA serves the Southeast region including FL `[Confirm]`.

**Crossover (COBA):** AHCA receives Medicare-paid claims for full-benefit duals via CMS BCRC under the COBA. Crossover routing goes into the Florida MMIS (Gainwell-operated) or directly to the dual's aligned SMMC plan for cost-share adjudication.

---

## 4. Statewide Billing Entities

| # | Entity Type | Typical Workflow | Primary Payer Path |
|---|---|---|---|
| 1 | Individual practitioners (MD/DO/PA/NP/CRNA/CNM) | 837P → SMMC plan or FFS (Gainwell MMIS); Medicare via First Coast B | Both |
| 2 | Hospitals — acute / CAH / LTACH / IRF / psych | 837I → SMMC plan or First Coast A | Both |
| 3 | FQHC + RHC | All-inclusive PPS rate; Medicare wrap; UDS reporting | Both |
| 4 | Behavioral health (CMHCs, LCSWs, LMHCs, LMFTs) + Statewide Inpatient Psychiatric Program (SIPP) | 837P/I to SMMC plan; SIPP child facilities have specific reporting | Both |
| 5 | Nursing facilities (SNF/NF), ALFs | UB-04/837I monthly; **LTC component of SMMC since 2014 statewide** | Both |
| 6 | Home health | OASIS + 837I to Palmetto HH; SMMC for Medicaid | Both |
| 7 | Hospice | Per-diem; NOE/NOTR via Palmetto | Both |
| 8 | Pharmacy | NCPDP D.0 — **FL Medicaid FFS PBM is Magellan Medicaid Administration** `[Confirm current PBM]`; SMMC plans use plan PBMs | Both |
| 9 | DMEPOS suppliers | 837P to CGS JC (Medicare DME); to FL MMIS or SMMC plan for Medicaid | Both |
| 10 | NEMT brokers | SMMC plans contract their own (LogistiCare/ModivCare, MTM, Access2Care, etc.) | Medicaid |
| 11 | Dental | 837D to **DentaQuest / Liberty Dental / MCNA** (statewide dental plans) | Mostly Medicaid |
| 12 | Vision (OD / optician) | 837P; eyewear vendor for materials | Both |
| 13 | School-based services (LEAs) | Medicaid Certified School Match Program | FL Medicaid only |
| 14 | iBudget Florida HCBS providers | Through APD provider system; 837P to FFS | Medicaid only |
| 15 | ICF/IID | Per-diem to FFS | Medicaid only |
| 16 | Statewide Inpatient Psychiatric Program (SIPP) | Child residential BH | Medicaid (managed) |
| 17 | County health departments | Hybrid clinical + grant | Hybrid |
| 18 | PACE programs | Capitated 1934 | Both (dual) |

---

## 5. Florida MMIS

- **System:** **Florida Medicaid Management Information System (FMMIS)**.
- **Fiscal Agent / Operator:** **Gainwell Technologies** (since the DXC → Gainwell spinoff in 2020; succeeded HP/DXC) ([Florida Medicaid Web Portal](https://portal.flmmis.com/flpublic/)). `[Confirm current operator term via [AHCA Procurement](https://ahca.myflorida.com/medicaid)]`.
- **Provider Portal:** [https://portal.flmmis.com/flpublic/](https://portal.flmmis.com/flpublic/) — provider enrollment, claims, eligibility, RAs, EVV.
- **EDI Gateway:** SFTP + PGP for 837/270/271/276/277/278/835; trading-partner enrollment via FMMIS.

### What FMMIS DOES handle
- **FFS claim adjudication** for residual non-SMMC populations (some duals, certain waiver services, retro-eligibility windows).
- **Encounter ingestion** from SMMC MMA + LTC + Dental plans (X12 837 encounters).
- **Provider Enrollment** — all FL Medicaid providers (FFS *and* managed-care network) per 42 CFR 438.602(b).
- **Pharmacy POS** for FFS (via Magellan PBM contract).
- **270/271 eligibility** — returns SMMC plan assignment.
- **EVV aggregation** under FL's federally compliant EVV vendor (HHAeXchange is the **state aggregator** for Medicaid EVV) `[Confirm via [AHCA EVV](https://ahca.myflorida.com/medicaid/electronic-visit-verification-evv)]`.

### What FMMIS DOES NOT handle
- **SMMC PA workflows** — each plan runs its own UM.
- **SMMC claim adjudication** — plans pay; encounters flow back to FMMIS.
- **MA / Part D** — out of scope.
- **APD iBudget service authorizations** — APD operates its own iConnect system.

---

## 6. SMMC Plans / Contract Terms

- **Procurement cycle:** AHCA's SMMC contracts run on a multi-year cycle. The **2024 reprocurement** awarded contracts in 11 SMMC regions for terms generally effective **February 2025 – 2030** with renewal options ([2024 ITN](https://ahca.myflorida.com/medicaid/statewide-medicaid-managed-care)) `[Confirm exact effective date + term length]`.
- **Plans operate by region** — 11 SMMC regions; not every plan is in every region.
- **MLR floor:** 85% per ACA + state contract.
- **Encounter-submission SLA:** typically within 30 days of payment, X12 837 to FMMIS.
- **Capitation:** PMPM by rate cell, certified by actuary; LTC has separate capitation tied to level-of-care (CARES) determination.
- **Network adequacy:** AHCA enforces time/distance + specialty network standards.

---

## 7. Compliance / Regulatory Surface

### Federal — same baseline as NC (HIPAA, 42 CFR 455/456, 42 CFR Part 2, ACA, ONC HTI-1/2/3, CMS-0057-F, HITECH, FCA, AKS, Stark).

### Florida State

| Statute | Subject |
|---|---|
| **Fla. Stat. Ch. 409 (Part III & IV)** | Medicaid program (administration, FFS, SMMC) |
| **Fla. Stat. Ch. 400** | Nursing homes, ALFs, hospices, home health licensure |
| **Fla. Stat. Ch. 408** | Health Quality Assurance (HQA) licensure umbrella |
| **Fla. Stat. § 409.913** | **Oversight of Medicaid integrity** — AHCA MPI authority |
| **Fla. Stat. § 409.920–409.9201** | **Medicaid provider fraud (criminal)** |
| **Fla. Stat. Ch. 68 (§ 68.081–68.092)** | **Florida False Claims Act** (state qui tam analog) |
| **Fla. Stat. Ch. 893** | Controlled substances + E-FORCSE PDMP |
| **Fla. Stat. Ch. 456 / 458 / 459** | Professional licensure (general / MD / DO) |
| **Fla. Stat. Ch. 627** | Insurance Code; HMOs at § 641 |
| **Fla. Stat. Ch. 641** | HMOs (most SMMC plans operate under 641 certificate) |

### Enforcement bodies

- **AHCA Bureau of Medicaid Program Integrity (MPI)** — pre/post-pay reviews, RAC, data analytics, recoupments, sanctions ([MPI](https://ahca.myflorida.com/medicaid/medicaid-program-integrity)).
- **FL Office of the Attorney General — Medicaid Fraud Control Unit (MFCU)** — criminal and civil prosecution of provider fraud; **historically one of the largest MFCUs in the nation, recovering hundreds of millions annually** ([FL AG MFCU](https://myfloridalegal.com/medicaid-fraud)). MFCU is housed in the **Office of Statewide Prosecution / Medicaid Fraud Control Unit** under the AG.
- **AHCA Office of Inspector General (OIG)** — internal audits.
- **CMS / HHS-OIG** — federal Program Integrity Reviews.
- **DCF Public Assistance Fraud / DFS Division of Investigative & Forensic Services** — recipient fraud + general insurance fraud.

**Fraud referral flow:** AHCA MPI triage → if credible provider fraud → referral to **FL AG MFCU** → criminal/civil prosecution + recoupment. CMS-required parallel reporting via T-MSIS + UPIC (SafeGuard Services for the Southeast `[Confirm zone]`).

---

## 8. MedGuard360 Integration Plan (Florida)

### 8.1 Connector inventory

| # | Counterparty | Direction | Transport | Identity | Use case |
|---|---|---|---|---|---|
| 1 | FMMIS (FFS + encounters + PES) | Bi-directional | X12 837P/I/D, 270/271, 276/277, 278, 835 via SFTP/PGP | Trading-partner ID + cert | FFS claim, encounter submission, provider directory sync |
| 2 | SMMC MMA plans (9+) | Bi-directional | FHIR R4 + X12 | OAuth2 per-plan | Claims, PA, eligibility, encounter |
| 3 | SMMC LTC plans | Bi-directional | FHIR R4 + X12 + CARES LOC | OAuth2 | LTC claims + level-of-care |
| 4 | SMMC Dental (DentaQuest, Liberty, MCNA) | Bi-directional | 837D + FHIR | OAuth2 | Dental claims |
| 5 | CMS Health Plan (Sunshine/Centene + DOH) | Bi-directional | FHIR R4 + X12 | OAuth2 | Children's specialty plan |
| 6 | First Coast Service Options JN (Medicare A/B) | Outbound | X12 837 via First Coast EDI Gateway | Submitter ID + cert | Medicare primary for duals |
| 7 | CGS JC (DME MAC) | Outbound | X12 837P + CMN | Submitter ID | DMEPOS (reused from NC/SC/GA/AL/MS connector) ♻️ |
| 8 | Magellan Medicaid Administration (FFS PBM) `[Confirm]` | Outbound | NCPDP D.0 | BIN/PCN | Pharmacy POS FFS |
| 9 | Florida HIE / FHIN | Bi-directional | FHIR R4 + ENS + Direct | OAuth2 / Direct Trust | HIE query, ENS, eCR/ELR |
| 10 | APD iConnect (iBudget) | Bi-directional | REST + flat-file | API key | I/DD waiver service auth + claims |
| 11 | DCF ACCESS Florida | Inbound (eligibility) | flat-file / web service | mTLS | Eligibility verification |
| 12 | AHCA HQA Licensure | Inbound | CSV / REST | API key | Facility license verification |
| 13 | HHAeXchange (state EVV aggregator) `[Confirm]` | Bi-directional | REST + flat-file | API key | EVV visit data for PCS/HHCS |
| 14 | E-FORCSE PDMP (Fla. Stat. Ch. 893) | Inbound (queries) | NIEM XML or PMIX | mTLS + cert | Controlled-substance dispensation history |
| 15 | NEMT brokers (per-plan) | Bi-directional | REST + 837P | OAuth2 | Trip auth + claim |
| 16 | T-MSIS extract | Outbound | flat-file via state | n/a | Federal Medicaid reporting |
| 17 | AHCA MPI fraud alerts | Outbound | REST webhook + secure email | mTLS + OAuth2 | Fraud-engine alert forwarding |
| 18 | FL DOH vital records (Bureau of Vital Statistics) | Inbound | SFTP + PGP | cert | Death-match decedent-claim suppression |
| 19 | CMS Interop APIs (CMS-0057-F) | Bi-directional | FHIR R4 (Patient/Provider/P2P/PA APIs) | SMART-on-FHIR | Compliance |
| 20 | Biometric device gateway | Inbound | proprietary + REST | device cert + mTLS | Identity verification |

### 8.2 `state-config-service` package (FL)

- MMIS endpoint = FMMIS Gainwell SFTP + portal
- Plan catalog = 9+ SMMC MMA plans (regional matrix) + LTC plans + 3 dental + CMS specialty
- PA timelines per CMS-0057-F + Fla. Stat. § 409.912 (statutory PA constraints) `[Confirm]`
- EVV aggregator = HHAeXchange `[Confirm]`
- PBM = Magellan (FFS) `[Confirm]`
- Fraud-engine alert endpoint = AHCA MPI ingest URL `[Confirm]`
- MFCU endpoint = FL AG MFCU evidence-bundle template

---

## 9. Florida HIE

- **State-Designated Entity:** **Florida Health Information Exchange (Florida HIE)** — operated under AHCA contract with vendor **Audacious Inquiry / PointClickCare** for the Encounter Notification Service component `[Confirm current vendor mix](https://www.florida-hie.net/)`.
- **Services:**
  - **Patient Look-Up (PLU)** — query-based.
  - **Event Notification Service (ENS)** — ADT-based.
  - **Direct Secure Messaging** — via certified HISPs.
  - **eHealth Exchange / TEFCA QHIN connection** `[Confirm via [eHealth Exchange](https://ehealthexchange.org/)]`.
- **Mandate:** Voluntary participation; no statutory mandate analogous to NCGS 90-414.4. AHCA encourages SMMC plans to use ENS.
- **MedGuard360 `hie-service` integration:**
  - Subscribes to ENS for in-network member ADT events → fraud anomaly checks.
  - Queries PLU for documentation supporting PA decisions.
  - Submits MedGuard-aggregated encounter summaries per BAA.

---

## 10. Florida Medicaid Program Integrity Workflow

### 10.1 Lifecycle

1. **Detection** — AHCA MPI algorithmic + tips (1-888-419-3456 MPI fraud hotline) + UPIC + MedGuard360 fraud-engine alert.
2. **Triage** at MPI: clinical review, statistical sampling.
3. **Pre-payment review hold** or **post-payment recoupment** under Fla. Stat. § 409.913.
4. **Credible allegation of fraud (CAF)** under 42 CFR 455.23 → payment suspension.
5. **Referral** to **FL AG MFCU** for criminal/civil prosecution.
6. **Sanction** — termination, FCA action (federal + state Ch. 68), exclusion, restitution.
7. **Recovery** booked to state + federal share per FMAP.

### 10.2 Scale notes

- FL Medicaid is the **3rd-largest state Medicaid program** by enrollment; correspondingly large MPI footprint.
- FL AG MFCU has historically been a **top-5 MFCU nationally** for civil recoveries `[Confirm via [HHS-OIG MFCU FY2024 Annual Report](https://oig.hhs.gov/reports/all/2025/medicaid-fraud-control-units-annual-report-fiscal-year-2024/)]`.

### 10.3 MedGuard360 fraud-engine → MPI handoff

- Alert payload: provider NPI, claim batch IDs, statistical confidence, scheme classification, evidence bundle.
- Transport: signed JSON over mTLS REST to AHCA MPI ingestion endpoint `[Confirm endpoint spec via AHCA IT]`.
- SLA: high-severity within 4h; routine daily batch.
- `audit-service` retains immutable case file (WORM) for 10y per Fla. Stat. retention.

---

## 11. Funding & FY2026 FMAP

- **FL traditional FMAP FY2026:** **~58–59%** — FL is one of the lower-FMAP states (close to 50% floor in some prior periods, but recent years 56–61%) `[Confirm via [KFF FMAP](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/) and [MACPAC Exhibit 6](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)]`.
- **FL E-FMAP (CHIP) FY2026:** ~70–72% `[Confirm via MACPAC Exhibit 6]`.
- **Expansion FMAP:** **N/A — FL has not expanded.** No 90% match population.
- **Administrative match:** 50% federal baseline; MMIS O&M 75%; MMIS DDI 90%; fraud detection systems 75% per 42 CFR 433.111 categories.
- **OBBB Act (HR 1) impact:** Work-reporting requirements do **not** apply to FL because FL has no expansion population; non-expansion-state effects (provider tax constraints, eligibility procedural changes) still apply.

---

## 12. Key Differences from NC + Onboarding Effort

### Key differences vs. NC primary

| Axis | NC | FL | Implication for MedGuard360 |
|---|---|---|---|
| Agency model | NC DHHS / DHB (multi-division) | **AHCA single-purpose health-finance agency** | Cleaner single-point integration; less DHHS-style inter-division coordination |
| Expansion | YES (Dec 2023) | **NO** | No 90% FMAP recovery boost for fraud savings |
| Managed-care brand | PHP + Tailored + CFSP + EBCI (~11 products) | **SMMC (MMA + LTC + Dental)** — ~9 MMA plans + 3 dental + specialty | Different carve structure; LTC fully capitated since 2014 |
| MMIS vendor | Gainwell (NCTracks) | **Gainwell (FMMIS)** | ♻️ Strong reuse — same vendor family, similar X12 patterns |
| MAC (A/B) | Palmetto JM | **First Coast Service Options JN** | **NEW MAC connector** — JN is distinct from JM/JJ; FL+PR+USVI only |
| DME MAC | CGS JC | **CGS JC** | ♻️ Reuse |
| HIE | NC HealthConnex (SAS) — mandatory but suspended | Florida HIE — voluntary, vendor mix | Strategy-pattern adapter |
| State qui tam | NCGS Ch. 14 + 108A | **Fla. Stat. Ch. 68 FCA (active state qui tam pipeline)** | Build FL-specific evidence-bundle template |
| BH carve-out | Tailored Plans (4 LME/MCOs) | **Integrated within SMMC** | NC outlier; FL standard |
| Scale | ~3.1M enrollees | **~4.3M enrollees + 5M Medicare** | Highest dual-eligible volume of any pilot state |
| PDMP integration | NC CSRS | **E-FORCSE (Fla. Stat. Ch. 893)** mandatory query | New PDMP adapter |
| Special agencies | APD doesn't exist in NC | **APD iConnect (iBudget)** for I/DD | Separate iConnect connector for I/DD waiver |
| Foster-care | CFSP (Healthy Blue Care Together) | **Child Welfare specialty plan (Sunshine/Centene)** `[Confirm]` | Different carrier |

### Estimated onboarding effort

**~85 person-weeks** (~15% lighter than the NC primary buildout, but **~30% heavier than SC** due to FL's scale, dental carve-out, APD iConnect, E-FORCSE, the new First Coast JN MAC connector, and an active state FCA evidence-bundle variant). Major reuse: ♻️ Gainwell MMIS pattern, ♻️ CGS JC DME, ♻️ CMS Interop API stack, ♻️ MedGuard fraud-engine + AI engines.

**Highest-risk integration items:**
1. First Coast JN Medicare connector — first MedGuard pilot in JN territory; build new submitter-registration + EDI Gateway adapter.
2. APD iConnect — proprietary; coordinate with APD IT.
3. SMMC regional plan matrix — 11 regions × 9+ plans means up to 50+ region-plan pairs in `state-config-service`.
4. Florida's high dual-eligible volume amplifies COBA crossover correctness requirements.

---

## Appendix — Primary Florida Sources

- [AHCA](https://ahca.myflorida.com/) · [AHCA Medicaid](https://ahca.myflorida.com/medicaid) · [SMMC](https://ahca.myflorida.com/medicaid/statewide-medicaid-managed-care) · [MPI](https://ahca.myflorida.com/medicaid/medicaid-program-integrity)
- [Florida Medicaid Web Portal (FMMIS)](https://portal.flmmis.com/flpublic/)
- [DCF ACCESS Florida](https://www.myflfamilies.com/services/public-assistance/access)
- [APD iBudget](https://apd.myflorida.com/ibudget/)
- [Florida KidCare](https://www.floridakidcare.org/)
- [First Coast Service Options (MAC JN)](https://medicare.fcso.com/) · [CMS MAC Directory](https://www.cms.gov/medicare/coding-billing/medicare-administrative-contractors-macs/whos-mac)
- [CGS JC (DME MAC)](https://www.cgsmedicare.com/jc/)
- [Florida HIE](https://www.florida-hie.net/)
- [FL AG MFCU](https://myfloridalegal.com/medicaid-fraud)
- [E-FORCSE PDMP](https://e-forcse.flhealth.gov/)
- [Medicaid.gov FL 1115 Demonstrations](https://www.medicaid.gov/medicaid/section-1115-demonstrations/state/florida/index.html)
- [Fla. Stat. Ch. 409 (Online Sunshine)](http://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0400-0499/0409/0409.html)
- [Fla. Stat. Ch. 68 FCA](http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0068/0068.html)
- [KFF FMAP](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/) · [MACPAC Exhibit 6](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)
- [healthinsurance.org FL Medicare](https://www.healthinsurance.org/medicare/florida/)

---

*Document owner: MedGuard360 Enterprise Integrations. File: `integrations/fl-enterprise/README.md`. Companion: `integrations/PILOT-STATES-COMPARISON.md`.*
