# MedGuard360 — AL Enterprise Landscape

> Reference document for **Alabama** Medicaid, Medicare, and the statewide billing ecosystem, mapping where MedGuard360 fits as a fraud-prevention + billing platform. Phase-3 pilot state.
>
> Last verified: 2026-05-23. Where information is fluid, items are tagged `[Confirm via …]`.

---

## 1. Alabama Medicaid Agency & Structure

- **Single State Agency:** **Alabama Medicaid Agency (AMA)** — a cabinet-level agency reporting directly to the Governor under Code of Alabama § 22-6-1 et seq. ([Alabama Medicaid Agency](https://medicaid.alabama.gov/)).
- **Commissioner:** Stephanie McGee Azar `[Confirm via [AMA Leadership](https://medicaid.alabama.gov/news_detail.aspx?ID=15820)]`.
- **Key adjacent agencies:**
  - **Alabama Department of Public Health (ADPH)** — public health, vital records, ALL Kids CHIP administrator.
  - **Alabama Department of Mental Health (ADMH)** — operates the I/DD waiver provider network and state psychiatric facilities.
  - **Department of Senior Services (ADSS)** — Aged & Disabled waiver case management.
  - **Department of Human Resources (DHR)** — child welfare; some Medicaid eligibility intake.
- **Internal AMA divisions of MedGuard360 interest:**
  - **Beneficiary Services**
  - **Provider Services**
  - **Health Systems** (FFS rate-setting + cost reports)
  - **LTC**
  - **Program Integrity (PI) Division** — pre/post-pay reviews, recoupments
  - **Office of General Counsel**

---

## 2. Programs & Populations

### Enrollment

- **~960K–1.05M** Medicaid + ALL Kids CHIP enrollees (Oct 2025) `[Confirm via [CMS Oct 2025 Enrollment Highlights](https://www.medicaid.gov/medicaid/national-medicaid-chip-program-information/medicaid-chip-enrollment-data/october-2025-medicaid-chip-enrollment-data-highlights)]`.
- **Expansion status: NOT EXPANDED** ([KFF Expansion Status](https://www.kff.org/medicaid/status-of-state-medicaid-expansion-decisions/)). Alabama is one of 10 non-expansion states as of May 2026.

### Programs / sub-populations

| Population | Description | Eligibility Hook |
|---|---|---|
| **TANF / Family & Children** | Parents/caretakers + dependent children — extremely low income thresholds (AL parent FPL ~18%, **lowest in nation**) | MAGI |
| **SSI-related / ABD** | Aged 65+, Blind, Disabled | Categorical |
| **Pregnant Women** | Up to 146% FPL; **12-month postpartum extended** `[Confirm via [AMA SPA](https://medicaid.alabama.gov/)]` |
| **ALL Kids (CHIP)** | Separate CHIP at ADPH; children up to ~317% FPL ([ALL Kids](http://www.allkids.org/)) |
| **Plan First (Family Planning)** | Limited-benefit family planning waiver |
| **Breast & Cervical Cancer Treatment** | Limited-benefit waiver |
| **Dual Eligibles** | Medicare + Medicaid |

### Dual eligibles

AMA operates **standard COBA crossover**; **no integrated D-SNP/MMP demonstration** is in place. Companion D-SNPs are aligned but Medicaid wrap is FFS through Gainwell.

### Waivers

| Waiver | Authority | Population | Operator | Notes |
|---|---|---|---|---|
| **Elderly & Disabled (E&D) Waiver** | 1915(c) HCBS | Elders 65+ / disabled adults | ADSS area agencies | NF alternative |
| **State of Alabama Independent Living (SAIL)** | 1915(c) HCBS | Adults w/ specific medically-related conditions | AMA | |
| **Technology Assisted (TA) Waiver** | 1915(c) HCBS | Medically fragile children dependent on tech | AMA | |
| **HIV/AIDS Waiver** | 1915(c) HCBS | Adults living w/ HIV/AIDS | AMA | |
| **Intellectual Disabilities (ID) Waiver** | 1915(c) HCBS | I/DD | **ADMH** | |
| **Living at Home (LAH) Waiver** | 1915(c) HCBS | I/DD adults living at home | ADMH | |
| **Community Waiver Program (CWP)** | 1915(c) HCBS — newer | I/DD | ADMH | Recent addition `[Confirm](https://mh.alabama.gov/)` |
| **Alabama Coordinated Health Network (ACHN)** | Care-coordination program (NOT a full risk-bearing MCO) | Most Medicaid populations (esp. maternity, children) | 7 regional **PCCM-Entity** networks | See below |

### Health Plans — Alabama is FFS-DOMINATED

**Alabama does NOT operate statewide risk-bearing managed care for the general Medicaid population.** This is the single most important architectural fact about Alabama.

- Earlier this decade Alabama designed a managed-care framework called **Regional Care Organizations (RCOs)**, which were **never implemented at full risk** — the RCO program collapsed in 2017 over rate and financing concerns ([RCO history](https://medicaid.alabama.gov/content/9.0_Resources/9.5_Reports/9.5_RCOs.aspx)) `[Confirm via [AMA RCO archives]`.
- In place of risk-bearing MCOs, Alabama operates the **Alabama Coordinated Health Network (ACHN)** since **October 2019** — a **PCCM-Entity (Primary Care Case Management) model** under 1932(a) authority. Seven regional ACHN entities provide care coordination + maternity care coordination, paid on a PMPM care-coordination fee with FFS underlying ([ACHN](https://medicaid.alabama.gov/content/3.0_Apply/3.10_Alabama_Coordinated_Health_Network.aspx)).
- **The 7 ACHN regions** are organized geographically; entity names are state-contracted regional networks (often hospital-led or community-led collaboratives) `[Confirm current 7 ACHN entity legal names via [AMA ACHN](https://medicaid.alabama.gov/content/3.0_Apply/3.10_Alabama_Coordinated_Health_Network.aspx)]`.
- **All claims still adjudicate FFS at Gainwell-operated Alabama Medicaid Interchange.**
- **Dental:** AMA contracts with **DentaQuest** as the statewide dental benefit administrator `[Confirm via [AMA Dental](https://medicaid.alabama.gov/content/2.0_Newsroom/2.1_Featured/2.1.5_Dental.aspx)]`.
- **Pharmacy:** AMA operates a state-direct PBM-style model with the **Alabama Medicaid Pharmacy Program** using Magellan/Gainwell `[Confirm current PBM contractor]`.
- **NEMT:** **Medical Transportation Management (MTM)** statewide broker `[Confirm via [AMA NEMT](https://medicaid.alabama.gov/content/3.0_Apply/3.3_Transportation.aspx)]`.

---

## 3. Medicare in Alabama

| Metric | Value | Source |
|---|---|---|
| Total Medicare beneficiaries (AL) | **~1.05M** | [KFF Total Medicare Beneficiaries](https://www.kff.org/medicare/state-indicator/total-medicare-beneficiaries/) `[Confirm exact count]` |
| Medicare Advantage share | **~55%** (high MA-penetration state) | [healthinsurance.org AL](https://www.healthinsurance.org/medicare/alabama/) `[Confirm]` |

**MAC assignments (AL):**

- **A/B MAC: Palmetto GBA, Jurisdiction JJ** — covers AL, GA, TN ([Palmetto JJ](https://palmettogba.com/jja), [CMS JJ page](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/Who-are-the-MACs-A-B-MAC-Jurisdiction-J-JJ)). ♻️ **Same JJ already in scope from GA + TN.**
- **DME MAC: CGS Administrators, Jurisdiction C (JC)** — same JC as NC/SC/GA/FL/MS/TN/VA/WV. ♻️ Reuse.
- **HH+H MAC:** Palmetto GBA serves the Southeast region including AL `[Confirm]`.

**Crossover (COBA):** AMA receives Medicare-paid claims for duals via CMS BCRC. Crossover lands in Alabama Medicaid Interchange (Gainwell-operated) for cost-share adjudication per state plan.

---

## 4. Statewide Billing Entities

| # | Entity Type | Typical Workflow | Primary Payer Path |
|---|---|---|---|
| 1 | Individual practitioners (MD/DO/PA/NP/CRNA/CNM) | 837P → **Gainwell AL Medicaid FFS** (no risk MCO to route to); Medicare via Palmetto B | Both |
| 2 | Hospitals — acute / CAH / LTACH / IRF / psych | 837I → AMA FFS or Palmetto A | Both |
| 3 | FQHC + RHC | All-inclusive PPS rate; Medicare wrap; UDS reporting | Both |
| 4 | Behavioral health / SUD / community MH centers | 837P/I FFS to AMA; ADMH provider network coordination | Mostly AMA |
| 5 | Nursing facilities (SNF/NF), ICF/IID | UB-04/837I monthly; **fully FFS** | Both |
| 6 | Home health | OASIS + 837I to Palmetto HH; FFS to AMA for Medicaid | Both |
| 7 | Hospice | Per-diem; NOE/NOTR via Palmetto | Both |
| 8 | Pharmacy | NCPDP D.0 — **AMA Pharmacy Program** state-direct | Both |
| 9 | DMEPOS suppliers | 837P to CGS JC; to AMA for Medicaid | Both |
| 10 | NEMT brokers | **MTM statewide** `[Confirm]` | Medicaid |
| 11 | Dental | 837D to **DentaQuest** statewide | Mostly Medicaid |
| 12 | Vision (OD / optician) | 837P; eyewear vendor | Both |
| 13 | School-based services (LEAs) | Medicaid in Schools | AL Medicaid only |
| 14 | I/DD waiver providers | ADMH network → 837P to AMA FFS | Medicaid only |
| 15 | E&D + SAIL + TA + HIV waivers | Case management + 837P to AMA FFS | Medicaid only |
| 16 | ACHN regional networks | PMPM care-coordination fee, not claim-based | AMA only |
| 17 | County health departments | Hybrid clinical + grant | Hybrid |

---

## 5. Alabama MMIS

- **System:** **Alabama Medicaid Management Information System (Alabama Medicaid Interchange)**.
- **Fiscal Agent / Operator:** **Gainwell Technologies** (post DXC → Gainwell 2020 spinoff; succeeded HP/DXC heritage) `[Confirm current contract term via [AMA Procurement](https://medicaid.alabama.gov/)]`.
- **Provider Portal:** [https://www.medicaid.alabamaservices.org/](https://www.medicaid.alabamaservices.org/) — provider enrollment, claims, eligibility, RAs, prior auth.
- **EDI Gateway:** SFTP + PGP for 837/270/271/276/277/278/835; trading-partner enrollment via the portal.

### What Alabama MMIS DOES handle (much broader than other states because AL is FFS-dominated)

- **FFS claim adjudication for ALL populations** — no risk MCOs to bypass.
- **Provider Enrollment** — all AL Medicaid providers.
- **Prior Authorization** — most FFS PAs through Gainwell PA workflows (some carve-outs to vendor partners).
- **Pharmacy POS** — AMA Pharmacy Program.
- **270/271 eligibility.**
- **EVV aggregation** under AL's chosen EVV vendor (**Sandata** has historically been the statewide aggregator) `[Confirm via [AMA EVV](https://medicaid.alabama.gov/content/8.0_Providers/8.6_EVV.aspx)]`.
- **ACHN PMPM payment processing.**
- **Cost-settlement (FQHC/RHC/CHC/LEA).**

### What Alabama MMIS DOES NOT handle

- Risk-bearing MCO encounter ingestion (none to ingest).
- MA / Part D.
- DentaQuest dental PA — runs on DentaQuest's UM system.

---

## 6. ACHN — Alabama's Care-Coordination Network (in Lieu of MCOs)

- **Effective:** October 1, 2019.
- **Authority:** §1932(a) State Plan PCCM-Entity option.
- **7 ACHN regions** with regional contracted entities providing:
  - Primary-care case management
  - Maternity care coordination
  - Care management for high-need members
  - Transitional care
- **Payment:** Per-member-per-month care-coordination fee (CMF + MMF for maternity) on top of FFS reimbursement to providers.
- **MLR / risk:** **No financial risk** — ACHN entities are not insurance companies; AMA bears all medical risk via FFS.
- **Encounter data:** ACHN entities submit care-coordination encounter data to AMA; claims data flows through Gainwell FFS rail.

---

## 7. Compliance / Regulatory Surface

### Federal — same baseline as NC (HIPAA, 42 CFR 455/456, 42 CFR Part 2, ACA, ONC HTI-1/2/3, CMS-0057-F, HITECH, FCA, AKS, Stark).

### Alabama State

| Statute | Subject |
|---|---|
| **Code of Alabama § 22-6-1 et seq.** | Medical Assistance Program (AMA enabling statute) |
| **Code of Alabama § 22-1-11** | Medicaid fraud (criminal) — false statements/claims |
| **Code of Alabama § 22-6-150 et seq.** | Medicaid managed care / RCO statutes (mostly dormant post-RCO collapse) |
| **Code of Alabama § 27** | Insurance Code |
| **Code of Alabama § 38-9F** | Adult protective services |
| **Code of Alabama § 22-21** | Hospital + facility licensure |
| **Ala. Admin. Code 560-X** | Medicaid Agency administrative regulations |

**Alabama does NOT have a state False Claims Act** with qui tam private-attorney-general standing comparable to FL Ch. 68, VA VFATA, or TN § 71-5-181. Federal FCA remains the primary civil enforcement vehicle. `[Confirm via [Alabama AG](https://www.alabamaag.gov/)]`.

### Enforcement bodies

- **AMA Program Integrity (PI) Division** — pre/post-pay reviews, RAC, data analytics, recoupments.
- **Alabama Office of the Attorney General — Medicaid Fraud Control Unit (MFCU)** — criminal/civil prosecution of provider fraud ([AL AG MFCU](https://www.alabamaag.gov/medicaid-fraud-unit/)). Smaller MFCU footprint than NC/FL/GA but actively prosecuting.
- **AMA Office of Internal Audit / OIG** `[Confirm exact name]`.
- **CMS / HHS-OIG** — federal Program Integrity Reviews.
- **Alabama Examiners of Public Accounts** — state legislative auditor.

**Fraud referral flow:** AMA PI triage → if credible criminal allegation → referral to **AL AG MFCU** → prosecution + recoupment. CMS-required parallel reporting via T-MSIS + UPIC.

---

## 8. MedGuard360 Integration Plan (Alabama)

### 8.1 Connector inventory

| # | Counterparty | Direction | Transport | Identity | Use case |
|---|---|---|---|---|---|
| 1 | Alabama Medicaid Interchange (Gainwell FFS + PA + PES + encounters) | Bi-directional | X12 837P/I/D, 270/271, 276/277, 278, 835 via SFTP/PGP | Trading-partner ID + cert | **PRIMARY rail — AL is FFS-dominated; almost all claim traffic goes here** |
| 2 | 7 ACHN regional networks | Bi-directional | REST + flat-file (care-coord encounters) | OAuth2 / API key | Care-coordination data submission + reporting |
| 3 | DentaQuest AL (statewide dental) | Bi-directional | 837D + FHIR/REST | OAuth2 | Dental claims + PA |
| 4 | AMA Pharmacy Program (state PBM) | Outbound | NCPDP D.0 | BIN/PCN | Pharmacy POS |
| 5 | Palmetto GBA JJ (Medicare A/B) | Outbound | X12 837 via Palmetto EDI Gateway | Submitter ID + cert | ♻️ Reuse from GA/TN JJ connector — Medicare primary for duals |
| 6 | CGS JC (DME MAC) | Outbound | X12 837P + CMN | Submitter ID | ♻️ Reuse |
| 7 | MTM (NEMT statewide broker) `[Confirm]` | Bi-directional | REST + 837P | OAuth2 | Trip auth + claim |
| 8 | Alabama OneHealth Record (state HIE) | Bi-directional | FHIR R4 + ENS + Direct | OAuth2 / Direct Trust | HIE query, ENS |
| 9 | ADPH Vital Records | Inbound | SFTP + PGP | cert | Death-match suppression |
| 10 | ADMH I/DD provider data | Bi-directional | REST | API key | ID/LAH/CWP waiver service auth + claims |
| 11 | ADSS (E&D waiver case mgmt) | Bi-directional | REST + flat-file | API key | E&D waiver |
| 12 | Alabama PDMP (PDMP-AL) | Inbound queries | NIEM XML / PMIX | mTLS + cert | Controlled-substance dispensation queries |
| 13 | ALL Kids (CHIP) administered by ADPH | Bi-directional | flat-file / REST | mTLS | CHIP eligibility + claims (CHIP runs partly separate) |
| 14 | T-MSIS extract | Outbound | flat-file via state | n/a | Federal Medicaid reporting |
| 15 | AMA PI fraud alerts | Outbound | REST webhook + secure email | mTLS + OAuth2 | Fraud-engine alert forwarding |
| 16 | CMS Interop APIs (CMS-0057-F) | Bi-directional | FHIR R4 (Patient/Provider/P2P/PA APIs) | SMART-on-FHIR | Compliance |
| 17 | Sandata EVV `[Confirm]` | Bi-directional | REST | API key | EVV |
| 18 | Biometric device gateway | Inbound | proprietary + REST | device cert + mTLS | Identity verification |

### 8.2 `state-config-service` package (AL)

- MMIS endpoint = Alabama Medicaid Interchange Gainwell SFTP + portal
- **MCO catalog = EMPTY** — set `managed_care_model = "FFS_with_PCCM_Entity"` and `pccm_entities = [7 ACHN regions]`
- PA timelines per CMS-0057-F + AMA admin code 560-X
- EVV aggregator = Sandata `[Confirm]`
- PBM = state-direct AMA Pharmacy Program
- Fraud-engine alert endpoint = AMA PI ingest URL `[Confirm]`
- MFCU endpoint = AL AG MFCU evidence-bundle template (federal FCA-only template; no state FCA variant needed)
- **No state qui tam evidence-bundle variant required** — Alabama has no analog to fed FCA at the state level

---

## 9. Alabama HIE

- **State-Designated Entity:** **Alabama One Health Record** — Alabama's statewide HIE, operated by ADPH ([Alabama One Health Record](https://www.alabamaonehealthrecord.org/)). `[Confirm operational scope + vendor mix]`.
- **Services:**
  - Patient Look-Up (query)
  - Direct Secure Messaging
  - ADT-based ENS (limited subscribers) `[Confirm]`
- **Mandate:** Voluntary; no statutory mandate analogous to NCGS 90-414.4.
- **TEFCA/QHIN:** Connection status `[Confirm via [eHealth Exchange](https://ehealthexchange.org/)]`.
- **MedGuard360 `hie-service` integration:**
  - Query HIE for documentation supporting PA decisions.
  - Subscribe to ENS where available.
  - Submit MedGuard-aggregated summaries per BAA.

---

## 10. Alabama Medicaid Program Integrity Workflow

### 10.1 Lifecycle

1. **Detection** — AMA PI algorithmic + tips + UPIC + MedGuard360 fraud-engine alert. AMA PI fraud tip line `[Confirm number]`.
2. **Triage** at PI: clinical review, statistical sampling — easier in AL because all claims are FFS in one rail.
3. **Pre-payment review hold** or **post-payment recoupment** under § 22-1-11 + Ala. Admin. Code 560-X.
4. **Credible allegation of fraud (CAF)** under 42 CFR 455.23 → payment suspension.
5. **Referral** to **AL AG MFCU** for criminal/civil prosecution.
6. **Sanction** — termination, federal FCA action, exclusion, restitution.
7. **Recovery** booked to state + federal share per FMAP.

### 10.2 Scale notes

- AL Medicaid is mid-sized; **FFS architecture makes fraud detection technically simpler** (single claims rail, single PA workflow, no MCO encounter latency).
- MFCU recovery volume is correspondingly smaller than NC/FL/GA but per-claim signal-to-noise is higher.

### 10.3 MedGuard360 fraud-engine → PI handoff

- Alert payload: provider NPI, claim batch IDs, statistical confidence, scheme classification, evidence bundle.
- Transport: signed JSON over mTLS REST to AMA PI ingestion endpoint `[Confirm endpoint spec via AMA IT]`.
- SLA: high-severity within 4h; routine daily batch.
- `audit-service` retains immutable case file (WORM) for 10y per AL retention rules.
- **Architectural advantage:** in AL the fraud engine sees 100% of claim traffic because there is no MCO carve. This makes FFS-rail fraud detection in AL among the cleanest pilots.

---

## 11. Funding & FY2026 FMAP

- **AL traditional FMAP FY2026:** **~73%** — Alabama is consistently one of the higher-FMAP states due to lower per-capita income `[Confirm via [KFF FMAP](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/) and [MACPAC Exhibit 6](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)]`.
- **AL E-FMAP (CHIP) FY2026:** ~81% `[Confirm via MACPAC Exhibit 6]`.
- **Expansion FMAP:** **N/A — AL has not expanded.**
- **Administrative match:** 50% federal baseline; MMIS O&M 75%; MMIS DDI 90%; fraud detection systems 75% per 42 CFR 433.111.
- **OBBB Act (HR 1) impact:** Work-reporting does **not** apply to AL (no expansion population). Non-expansion-state effects (provider tax constraints) apply.

**Economic significance:** With ~73% FMAP, federal funds carry ~73¢ of every Medicaid dollar in Alabama. This makes federally-matched MMIS-adjacent functions (where the federal share is 75–90%) particularly attractive — state cost-share for MedGuard360 services structured as MMIS modules under MITA + SMC is among the lowest of the Phase-3 states.

---

## 12. Key Differences from NC + Onboarding Effort

### Key differences vs. NC primary

| Axis | NC | AL | Implication for MedGuard360 |
|---|---|---|---|
| Agency model | NC DHHS / DHB (multi-division) | **AMA single-agency, cabinet-level, narrow scope** | Simplest political integration of any pilot |
| Expansion | YES (Dec 2023) | **NO** | No 90% FMAP boost |
| Managed-care model | PHP + Tailored + CFSP + EBCI (~11 plan products) | **NONE risk-bearing** — only ACHN PCCM-Entity (7 regions) | **HUGE architectural divergence: skip MCO claim-routing entirely; 100% FFS rail through Gainwell** |
| MMIS vendor | Gainwell (NCTracks) | **Gainwell (AL Medicaid Interchange)** | ♻️ Strong reuse — same vendor family, FFS-only profile is simpler |
| MAC (A/B) | Palmetto JM | **Palmetto JJ** | ♻️ Reuse from GA/TN JJ connector |
| DME MAC | CGS JC | **CGS JC** | ♻️ Reuse |
| HIE | NC HealthConnex (SAS) | Alabama One Health Record (ADPH) | Strategy-pattern adapter |
| State FCA | NCGS Ch. 14 + 108A | **NO state qui tam analog** | Federal-FCA-only evidence template; **no per-state variant required** |
| BH carve-out | Tailored Plans (4 LME/MCOs) | **Integrated via FFS + ADMH provider network** | NC outlier; AL standard |
| Scale | ~3.1M enrollees | **~1M enrollees** | ~⅓ the volume — easier scale-up |
| Dental | Per-plan | **DentaQuest statewide single carrier** | Single dental connector |
| NEMT | Per plan | **MTM statewide single broker** `[Confirm]` | Single NEMT connector |
| FMAP | ~65% | **~73%** | Higher federal share = lower state price sensitivity for federally-matched line items |
| EVV vendor | NCTracks aggregator | **Sandata** `[Confirm]` | New EVV adapter |

### Estimated onboarding effort

**~50 person-weeks** — **~40% lighter than the NC primary buildout** and **second-lightest of all Phase 1–3 pilots (after WV).** Major drivers of efficiency:

1. **No MCO connectors** — single FFS rail through Gainwell collapses 5–6 plan connectors to 0.
2. ♻️ Gainwell MMIS pattern reuse from NC/GA/WV.
3. ♻️ Palmetto JJ reuse from GA/TN.
4. ♻️ CGS JC reuse universal.
5. Single statewide dental carrier (DentaQuest) and single NEMT broker (MTM) `[Confirm]`.
6. No state FCA variant needed in evidence-bundle template.

**Net-new build items:**
1. ACHN PMPM care-coordination data feed (7 regional entities) — modest.
2. Alabama One Health Record HIE adapter.
3. AMA Pharmacy Program state-PBM POS profile.
4. Alabama PDMP query adapter.
5. ADMH I/DD waiver provider data integration.
6. Sandata EVV adapter `[Confirm]`.

**Strategic value:** Alabama is the **cleanest proof-of-cookie-cutter for any future FFS-dominant state** in the Phase-3 national rollout. The architectural template developed for AL applies directly to other non-expansion, FFS-heavy southern states.

---

## Appendix — Primary Alabama Sources

- [Alabama Medicaid Agency](https://medicaid.alabama.gov/) · [AL Medicaid Provider Portal (Gainwell)](https://www.medicaid.alabamaservices.org/)
- [Alabama Coordinated Health Network (ACHN)](https://medicaid.alabama.gov/content/3.0_Apply/3.10_Alabama_Coordinated_Health_Network.aspx)
- [Alabama Department of Public Health (ADPH)](https://www.alabamapublichealth.gov/) · [ALL Kids CHIP](http://www.allkids.org/)
- [Alabama Department of Mental Health (ADMH)](https://mh.alabama.gov/)
- [Alabama Department of Senior Services (ADSS)](https://www.alabamaageline.gov/)
- [Alabama One Health Record (HIE)](https://www.alabamaonehealthrecord.org/)
- [Alabama Attorney General MFCU](https://www.alabamaag.gov/medicaid-fraud-unit/)
- [Palmetto GBA JJ](https://palmettogba.com/jja) · [CMS A/B MAC JJ](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/Who-are-the-MACs-A-B-MAC-Jurisdiction-J-JJ)
- [CGS JC (DME MAC)](https://www.cgsmedicare.com/jc/)
- [Code of Alabama (online)](https://alison.legislature.state.al.us/)
- [Ala. Admin. Code 560-X (AMA regs)](https://www.alabamaadministrativecode.state.al.us/agencies/560-X.htm)
- [Medicaid.gov AL 1115 / state-plan info](https://www.medicaid.gov/medicaid/section-1115-demonstrations/state/alabama/index.html)
- [KFF FMAP](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/) · [MACPAC Exhibit 6](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)

---

*Document owner: MedGuard360 Enterprise Integrations. File: `integrations/al-enterprise/README.md`. Companion: `integrations/PILOT-STATES-COMPARISON.md`.*
