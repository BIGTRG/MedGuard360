# MedGuard360 — MD Enterprise Landscape

> Reference document for **Maryland** Medicaid, Medicare, and the statewide billing ecosystem, mapping where MedGuard360 fits as a fraud-prevention + billing platform. Phase-3 pilot state.
>
> Last verified: 2026-05-23. Where information is fluid, items are tagged `[Confirm via …]`.

---

## 1. Maryland Medicaid Agency & Structure

- **Single State Agency:** **Maryland Department of Health (MDH)** — specifically the **Medicaid (Medical Care Programs Administration / Office of Health Care Financing — OHCF)** within MDH ([MDH Medicaid](https://health.maryland.gov/mmcp/Pages/Home.aspx)).
- **Secretary of MDH:** Laura Herrera Scott, M.D., M.P.H. `[Confirm via [MDH Leadership](https://health.maryland.gov/Pages/leadership.aspx)]`.
- **Medicaid Deputy Secretary:** Ryan Moran, Dr.P.H. `[Confirm](https://health.maryland.gov/mmcp/Pages/Home.aspx)`.
- **Key adjacent agencies / offices within MDH:**
  - **Office of Health Care Quality (OHCQ)** — licensure + surveys for facilities (the MD analog to NC DHSR / FL HQA).
  - **Behavioral Health Administration (BHA)** — operates the **public BH carve-out** (statewide BH ASO).
  - **Developmental Disabilities Administration (DDA)** — I/DD waivers + LISS.
  - **Maryland Department of Aging (MDoA)** — Senior Care, ombudsman.
  - **Department of Human Services (DHS)** — child welfare; **Medicaid eligibility intake co-administered with MDH for non-MAGI populations**; MAGI eligibility via **Maryland Health Connection / Maryland Health Benefit Exchange (MHBE)**.
- **Unique Maryland feature:** **Health Services Cost Review Commission (HSCRC)** — sets all-payer hospital rates under the **Maryland Total Cost of Care (TCOC) Model** with CMS (only state with all-payer hospital rate-setting) ([HSCRC](https://hscrc.maryland.gov/), [Maryland TCOC](https://hscrc.maryland.gov/Pages/total-cost-of-care.aspx)).

---

## 2. Programs & Populations

### Enrollment

- **~1.66M** Medicaid + MCHP (CHIP) enrollees (Oct 2025) `[Confirm via [CMS Oct 2025 Enrollment Highlights](https://www.medicaid.gov/medicaid/national-medicaid-chip-program-information/medicaid-chip-enrollment-data/october-2025-medicaid-chip-enrollment-data-highlights)]`.
- **Expansion status: YES — full ACA Medicaid expansion** effective 1/1/2014 ([KFF Expansion Status](https://www.kff.org/medicaid/status-of-state-medicaid-expansion-decisions/)). Expansion population (childless adults up to 138% FPL) ~370K+ `[Confirm via MDH dashboards]`.

### Programs / sub-populations

| Population | Description | Eligibility Hook |
|---|---|---|
| **TANF / Family & Children** | Parents/caretakers + dependent children | MAGI via Maryland Health Connection |
| **Medicaid Expansion** | Childless adults 19–64 up to 138% FPL (effective 1/1/2014) | MAGI |
| **SSI-related / ABD** | Aged 65+, Blind, Disabled | Categorical |
| **Pregnant Women** | Up to 264% FPL pregnancy; **12-month postpartum extended** | MAGI |
| **Maryland Children's Health Program (MCHP)** | Children up to 322% FPL — **MCHP** is MD's CHIP, administered via the HealthChoice MCOs ([MCHP](https://health.maryland.gov/mmcp/chp/Pages/home.aspx)) |
| **Family Planning Program** | Limited-benefit family planning |
| **Medically Needy** | Spend-down |
| **Dual Eligibles** | Medicare + Medicaid |

### Dual eligibles

MD has an active **D-SNP alignment program** under HealthChoice with companion D-SNP plans. **No active MMP** as of May 2026; MD ran the Maryland Duals Care Delivery Program through CMS demos but did not adopt a Medicare-Medicaid Plan model `[Confirm via [MDH Duals](https://health.maryland.gov/mmcp/longtermcare/Pages/dual.aspx)]`.

### Waivers

| Waiver | Authority | Population | Operator | Notes |
|---|---|---|---|---|
| **HealthChoice §1115** | §1115 demo | HealthChoice MCO authority + AHCs | MDH | Long-standing — original 1997; renewed; current term through 2028 `[Confirm via [Medicaid.gov MD 1115](https://www.medicaid.gov/medicaid/section-1115-demonstrations/state/maryland/index.html)]` |
| **Community First Choice (CFC)** | §1915(k) state plan option | Adults needing LTSS | MDH | Person-centered services for adults |
| **Community Pathways** | §1915(c) HCBS | I/DD | **DDA** | Largest DDA waiver |
| **Family Supports** | §1915(c) HCBS | I/DD children at home | DDA | |
| **Community Supports** | §1915(c) HCBS | I/DD adults | DDA | |
| **Brain Injury** | §1915(c) HCBS | TBI | MDH | |
| **Medical Day Care** | §1915(c) HCBS | Aged/disabled | MDH | |
| **Model Waiver** | §1915(c) HCBS | Medically fragile children | MDH | |
| **Increased Community Services** | §1915(c) HCBS | NF transition | MDH | |
| **PACE** | 1934 | Frail elders | Multiple PACE orgs | |

### Health Plans — HealthChoice (MD's Medicaid Managed Care)

**HealthChoice** is Maryland's statewide §1115-authorized risk-based Medicaid managed care program, operating continuously since **1997** ([HealthChoice](https://health.maryland.gov/mmcp/healthchoice/Pages/Home.aspx)). 8 contracted MCOs as of May 2026:

1. **Aetna Better Health of Maryland** (CVS Health)
2. **CareFirst Community Health Plan Maryland** (CareFirst BCBS subsidiary)
3. **Jai Medical Systems Managed Care Organization** (Maryland's only Black-physician-led MCO)
4. **Kaiser Permanente of the Mid-Atlantic States** (integrated delivery; restricted geography)
5. **MedStar Family Choice** (MedStar Health system-affiliated)
6. **Priority Partners** (Johns Hopkins HealthCare LLC — JHU faculty/health-system affiliated)
7. **UnitedHealthcare Community Plan of Maryland**
8. **Wellpoint Maryland** (Elevance — rebranded from Amerigroup Community Care of Maryland in 2024)

`[Confirm post-2025 plan changes via [MDH HealthChoice](https://health.maryland.gov/mmcp/healthchoice/Pages/Home.aspx)]`.

**Carve-outs (NOT in HealthChoice — operate parallel):**
- **Public Behavioral Health System (PBHS)** — statewide BH carve-out administered by an **Administrative Services Organization (ASO)**. Current ASO: **Carelon Behavioral Health of Maryland** (formerly Beacon Health Options; ASO contract awarded through current term) ([Maryland PBHS](https://maryland.optum.com/) and [BHA](https://health.maryland.gov/bha/Pages/Index.aspx)) `[Confirm current ASO term and vendor — historically Optum/Beacon/Carelon transitions](https://health.maryland.gov/bha/)`. This is structurally similar to NC's Tailored Plan carve-out but operates as ASO-FFS rather than capitated PIHP.
- **DDA waiver services** (DDA-administered).
- **Pharmacy** — historically carved into MCOs, but a **Medicaid Pharmacy Program (MPP)** operates FFS for certain populations + drug classes; PDL via MDH `[Confirm current pharmacy carve structure via [MDH Pharmacy](https://health.maryland.gov/mmcp/pap/Pages/Home.aspx)]`.
- **Dental** — administered by **DentaQuest** as the statewide dental benefit administrator for **Maryland Healthy Smiles Dental Program** ([Maryland Healthy Smiles](https://www.marylandhealthysmiles.com/)).
- **NEMT** — **county-administered** (Maryland is unusual — NEMT is a **county health department** responsibility, not a statewide broker) `[Confirm via [MDH NEMT](https://health.maryland.gov/mmcp/longtermcare/Pages/Transportation.aspx)]`.

---

## 3. Medicare in Maryland

| Metric | Value | Source |
|---|---|---|
| Total Medicare beneficiaries (MD) | **~1.0M** | [KFF Total Medicare Beneficiaries](https://www.kff.org/medicare/state-indicator/total-medicare-beneficiaries/) `[Confirm exact count]` |
| Medicare Advantage share | **~30%** (notably LOW — Maryland has one of the lowest MA penetrations in the country) | [healthinsurance.org MD](https://www.healthinsurance.org/medicare/maryland/) `[Confirm]` |

**Why MA share is low in MD:** The **Maryland Total Cost of Care (TCOC) Model** sets all-payer hospital rates uniformly under HSCRC, eliminating much of the MA-vs-FFS rate-differential incentive that drives MA growth in other states.

**MAC assignments (MD):**

- **A/B MAC: Novitas Solutions, Jurisdiction JL** — covers DE, DC, MD, NJ, PA ([Novitas JL](https://www.novitas-solutions.com/), [CMS JL page](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/Who-are-the-MACs-A-B-MAC-Jurisdiction-L-JL)). **NEW MAC connector — JL** distinct from JM/JJ/JN/JH.
- **DME MAC: Noridian Healthcare Solutions, Jurisdiction A (JA)** — covers CT, DE, DC, ME, MD, MA, NH, NJ, NY, PA, RI, VT ([Noridian JA](https://med.noridianmedicare.com/web/jadme), [CMS JA page](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/DMEMACs)). **THIS IS DIFFERENT** from every other MedGuard360 pilot state to date — all NC/SC/GA/FL/AL/MS/TN/VA/WV use **CGS JC**. **New DME MAC connector required.**
- **HH+H MAC:** Palmetto GBA serves the Southeast region; MD HH+H is served by **Palmetto GBA HH+H** for the Mid-Atlantic `[Confirm exact HH+H region assignment](https://www.cms.gov/mac-info)`.

**Crossover (COBA):** MDH receives Medicare-paid claims for duals via CMS BCRC. Crossover lands in Maryland MMIS (Conduent-operated) for cost-share adjudication per state plan.

---

## 4. Statewide Billing Entities

| # | Entity Type | Typical Workflow | Primary Payer Path |
|---|---|---|---|
| 1 | Individual practitioners (MD/DO/PA/NP/CRNA/CNM) | 837P → HealthChoice MCO or FFS; Medicare via Novitas B; **rates partly constrained by HSCRC for hospital-based settings** | Both |
| 2 | Hospitals — acute / CAH / LTACH / IRF / psych | 837I → MCO or FFS or Novitas A; **all hospital rates set by HSCRC under TCOC** | Both |
| 3 | FQHC + RHC | All-inclusive PPS rate; Medicare wrap; UDS reporting | Both |
| 4 | Behavioral health / SUD (incl. OTPs, PRPs, residential) | 837P/I to **PBHS ASO (Carelon) FFS** — NOT to HealthChoice MCO; SUD subject to 42 CFR Part 2 | Mostly MD Medicaid (PBHS ASO) |
| 5 | Nursing facilities (SNF/NF), ICF/IID | UB-04/837I monthly; LTSS largely FFS but increasing MCO LTSS pilots `[Confirm]` | Both |
| 6 | Home health | OASIS + 837I to Palmetto HH+H; MCO or FFS for Medicaid | Both |
| 7 | Hospice | Per-diem; NOE/NOTR via Palmetto HH+H | Both |
| 8 | Pharmacy | NCPDP D.0 — MCO PBMs + state MPP for carve-out drugs | Both |
| 9 | DMEPOS suppliers | 837P to **Noridian JA** (Medicare DME); to MCO or FFS for Medicaid | Both |
| 10 | NEMT | **County-administered** (each Maryland county Health Department) | Medicaid |
| 11 | Dental | 837D to **DentaQuest (Maryland Healthy Smiles)** | Mostly Medicaid |
| 12 | Vision (OD / optician) | 837P; eyewear vendor | Both |
| 13 | School-based services (LEAs) | MD Medicaid School-Based Services | MD Medicaid only |
| 14 | DDA waiver providers (Community Pathways, Family Supports, Community Supports) | DDA service authorization (LTSSMaryland); 837P to FFS via Conduent MMIS | Medicaid only |
| 15 | LTSS providers (CFC, MDC, etc.) | LTSSMaryland (statewide LTSS workflow system); 837P to FFS | Medicaid only |
| 16 | County health departments (also NEMT) | Hybrid clinical + grant + NEMT | Hybrid |
| 17 | PACE programs | Capitated | Both (dual) |

---

## 5. Maryland MMIS

- **System:** **Maryland Medicaid Management Information System (MMIS II) / Maryland Medicaid Enterprise System (MES)**.
- **Fiscal Agent / Operator:** **Conduent State Healthcare** — Conduent has held the MD MMIS contract through multiple renewal cycles; MD is in a multi-year transition toward a **modular MES** procurement under MITA 3.0 `[Confirm current operator + module-level vendor mix via [MDH Procurement](https://health.maryland.gov/) and [eMedicaid](https://encrypt.emdhealthchoice.org/)]`.
- **Provider Portal:** **eMedicaid** ([https://encrypt.emdhealthchoice.org/](https://encrypt.emdhealthchoice.org/)) — provider enrollment (ePREP — Electronic Provider Revalidation and Enrollment Portal), claims, eligibility, RAs, EVV.
- **ePREP (Electronic Provider Revalidation and Enrollment Portal):** [https://eprep.health.maryland.gov/](https://eprep.health.maryland.gov/) — handles all provider enrollment and revalidation for MD Medicaid `[Confirm URL]`.
- **EDI Gateway:** SFTP + PGP for 837/270/271/276/277/278/835.
- **LTSSMaryland:** the statewide LTSS workflow system used for service planning and authorizations under CFC and HCBS waivers ([LTSSMaryland](https://ltssmaryland.health.maryland.gov/)).

### What MD MMIS DOES handle
- **FFS claim adjudication** for non-HealthChoice populations + carve-outs (PBHS BH, DDA, LTSS, some duals).
- **Encounter ingestion** from HealthChoice MCOs.
- **Provider Enrollment** via **ePREP**.
- **270/271 eligibility** — returns HealthChoice MCO assignment.
- **EVV aggregation** under MD's chosen vendor (**Sandata** historically) `[Confirm via [MDH EVV](https://health.maryland.gov/mmcp/longtermcare/Pages/EVV.aspx)]`.

### What MD MMIS DOES NOT handle
- HealthChoice MCO PA workflows.
- HealthChoice MCO claim adjudication.
- PBHS BH claim adjudication (handled by Carelon ASO).
- DDA service authorizations (handled by DDA LTSSMaryland).
- MA / Part D.

---

## 6. HealthChoice MCO Contract Terms

- HealthChoice has operated continuously since 1997 under §1115 waiver. Current contract cycle effective in multi-year terms with periodic re-procurements `[Confirm current cycle effective dates via [MDH HealthChoice procurement](https://health.maryland.gov/mmcp/healthchoice/Pages/Home.aspx)]`.
- 8 MCOs (Aetna, CareFirst, Jai Medical, Kaiser, MedStar, Priority Partners, UnitedHealthcare, Wellpoint).
- **MLR floor:** 85% per ACA.
- **Encounter-submission SLA:** typically within 30 days of payment, X12 837 to Conduent MMIS.
- **Capitation:** PMPM by rate cell, actuary-certified. **HSCRC TCOC interaction:** hospital-component rates within capitation are constrained by all-payer hospital rates.
- **Network adequacy:** MDH enforces time/distance + specialty standards; provider directories must integrate with eMedicaid.

---

## 7. Compliance / Regulatory Surface

### Federal — same baseline as NC (HIPAA, 42 CFR 455/456, 42 CFR Part 2, ACA, ONC HTI-1/2/3, CMS-0057-F, HITECH, FCA, AKS, Stark).

### Maryland State

| Statute | Subject |
|---|---|
| **Md. Code Ann., Health-General Article §§ 15-101 et seq.** | Medical Assistance Program (MDH Medicaid enabling) |
| **Md. Code Ann., Health-General § 15-121 et seq.** | HealthChoice authority |
| **Md. Code Ann., Health-General § 15-141 et seq.** | Medicaid fraud and abuse statutes |
| **Md. Code Ann., Health-General Title 19** | Health Care Facilities (incl. HSCRC + facility licensure) |
| **Md. Code Ann., Health-General § 2-1601 et seq.** | **Maryland False Health Claims Act** (state qui tam statute; private-attorney-general standing — Maryland adopted state FCA in 2010) ([Md. AG MMFCU](https://www.marylandattorneygeneral.gov/Pages/MMFCU/default.aspx)) |
| **Md. Code Ann., Insurance Article** | Insurance Code; MCO regulation |
| **Md. Code Ann., Health Occupations** | Professional licensure |
| **COMAR Title 10** | Health regulations (Code of Maryland Regulations) |

### Enforcement bodies

- **MDH Office of the Inspector General (OIG)** — Medicaid program integrity, audits, fraud investigations within MDH ([MDH OIG](https://health.maryland.gov/oig/Pages/Home.aspx)).
- **Maryland Office of the Attorney General — Medicaid Fraud Control Unit (MMFCU)** — criminal and civil prosecution of provider fraud + patient abuse in Medicaid-funded facilities ([Md. AG MMFCU](https://www.marylandattorneygeneral.gov/Pages/MMFCU/default.aspx)). MMFCU is consistently among the higher-performing MFCUs on civil recoveries per capita.
- **Maryland Office of Legislative Audits (OLA)** — legislative auditor.
- **HSCRC** — has separate audit authority for hospital rate-setting / TCOC compliance (unique to MD).
- **CMS / HHS-OIG** — federal Program Integrity Reviews.

**Fraud referral flow:** MDH OIG triage → if credible criminal allegation → referral to **Md. AG MMFCU** → criminal/civil prosecution + recoupment under state and federal FCA. CMS-required parallel reporting via T-MSIS + UPIC.

---

## 8. MedGuard360 Integration Plan (Maryland)

### 8.1 Connector inventory

| # | Counterparty | Direction | Transport | Identity | Use case |
|---|---|---|---|---|---|
| 1 | MD MMIS (Conduent — FFS + encounters) | Bi-directional | X12 837P/I/D, 270/271, 276/277, 278, 835 via SFTP/PGP | Trading-partner ID + cert | FFS claim, encounter submission |
| 2 | ePREP (Electronic Provider Revalidation and Enrollment Portal) | Bi-directional | REST + flat-file | API key + mTLS | Provider directory sync |
| 3 | HealthChoice MCOs (8) | Bi-directional | FHIR R4 + X12 | OAuth2 per-plan | Claims, PA, eligibility, encounter |
| 4 | **Carelon Behavioral Health of MD (PBHS ASO)** | Bi-directional | FHIR R4 + X12 + 42 CFR Part 2 consent | OAuth2 + SMART-on-FHIR | **PBHS BH claims (carve-out)** |
| 5 | DentaQuest (Maryland Healthy Smiles) | Bi-directional | 837D + FHIR | OAuth2 | Dental claims + PA |
| 6 | Maryland Medicaid Pharmacy Program (MPP) + MCO PBMs | Outbound | NCPDP D.0 | BIN/PCN | Pharmacy POS |
| 7 | **Novitas Solutions JL (Medicare A/B)** | Outbound | X12 837 via Novitas EDI Gateway | Submitter ID + cert | **NEW MAC connector — JL** — Medicare primary for duals |
| 8 | **Noridian JA (DME MAC)** | Outbound | X12 837P + CMN via Noridian EDI | Submitter ID | **NEW DME MAC connector — JA** — first MedGuard pilot outside CGS JC |
| 9 | Maryland CRISP (state HIE) | Bi-directional | FHIR R4 + ENS + Direct + IHE | OAuth2 / Direct Trust | HIE query, ENS — **mandatory connection** |
| 10 | DDA + LTSSMaryland | Bi-directional | REST + flat-file | API key | Waiver service auth + PCS PA |
| 11 | County Health Departments (24 jurisdictions) — NEMT + LHD | Bi-directional | REST / SFTP | per-jurisdiction credentials | **NEMT trip auth + claims** — county-by-county |
| 12 | **HSCRC** — all-payer hospital rate data | Inbound | flat-file / API | API key | Hospital-claim repricing/validation under TCOC |
| 13 | MDH OHCQ Licensure | Inbound | CSV / REST | API key | Facility license verification |
| 14 | Maryland PDMP (CRISP-integrated) | Inbound queries | FHIR / PMIX | mTLS + cert | Controlled-substance dispensation history |
| 15 | DHS Eligibility + Maryland Health Connection (MHBE) | Inbound | flat-file / web service | mTLS | Eligibility verification |
| 16 | Sandata EVV `[Confirm]` | Bi-directional | REST | API key | EVV |
| 17 | MDH Vital Records | Inbound | SFTP + PGP | cert | Death-match suppression |
| 18 | T-MSIS extract | Outbound | flat-file via state | n/a | Federal Medicaid reporting |
| 19 | MDH OIG fraud alerts | Outbound | REST webhook + secure email | mTLS + OAuth2 | Fraud-engine alert forwarding |
| 20 | Md. AG MMFCU referral channel | Outbound | secure case-file transfer | mTLS | Criminal/civil case referral |
| 21 | CMS Interop APIs (CMS-0057-F) | Bi-directional | FHIR R4 (Patient/Provider/P2P/PA APIs) | SMART-on-FHIR | Compliance |
| 22 | Biometric device gateway | Inbound | proprietary + REST | device cert + mTLS | Identity verification |

### 8.2 `state-config-service` package (MD)

- MMIS endpoint = MD MMIS Conduent SFTP + eMedicaid + ePREP portal
- MCO catalog = 8 HealthChoice MCOs
- **BH carve-out = Carelon Behavioral Health of MD (ASO-FFS, not capitated)** — special routing
- PA timelines per CMS-0057-F + COMAR Title 10
- EVV aggregator = Sandata `[Confirm]`
- Pharmacy = MCO PBMs + state MPP for carve-out drugs
- **HSCRC TCOC adapter** — hospital-claim repricing/validation under all-payer rate-setting (unique to MD)
- **NEMT = county-administered (24 jurisdictions)** — per-county broker routing
- Fraud-engine alert endpoint = MDH OIG ingest URL `[Confirm]`
- MFCU endpoint = Md. AG MMFCU evidence-bundle template
- State FCA template = **Maryland False Health Claims Act** variant (§ 2-1601 et seq. — private qui tam standing)

---

## 9. Maryland HIE — CRISP

- **State-Designated Entity:** **Chesapeake Regional Information System for our Patients (CRISP)** — Maryland's statewide HIE; also serves DC and West Virginia ([CRISP](https://www.crisphealth.org/)).
- **Mandate:** **MD providers and HealthChoice MCOs are required to connect to CRISP** under state regulation (COMAR + HealthChoice MCO contract terms make CRISP connection effectively mandatory for state-funded providers). `[Confirm scope of mandate via [CRISP](https://www.crisphealth.org/)]`.
- **Services:**
  - Patient query (clinical query portal)
  - Encounter Notification Service (**ENS**) — ADT-based, widely used
  - Image Exchange
  - **Maryland PDMP** (CRISP operates the state PDMP integrated with the HIE)
  - Public health gateway (eCR, ELR via MDH)
  - FHIR R4 + Direct Secure Messaging
  - **TEFCA QHIN designation** — CRISP is a designated QHIN ([CRISP QHIN](https://www.crisphealth.org/qhin/)).
- **MedGuard360 `hie-service` integration:**
  - **Mandatory CRISP connection** — subscribe to ENS for all in-network member ADT events.
  - Query CRISP for documentation supporting PA decisions.
  - Submit MedGuard-aggregated encounter summaries per BAA + DUA.
  - **PDMP integration via CRISP** — single integration covers both HIE and PDMP queries (efficient).

---

## 10. Maryland Medicaid Program Integrity Workflow

### 10.1 Lifecycle

1. **Detection** — MDH OIG algorithmic + tips + UPIC + MedGuard360 fraud-engine alert. MDH OIG fraud hotline `[Confirm number]`.
2. **Triage** at OIG: clinical review, statistical sampling.
3. **Pre-payment review hold** or **post-payment recoupment** under Health-General § 15-141 + COMAR Title 10.
4. **Credible allegation of fraud (CAF)** under 42 CFR 455.23 → payment suspension.
5. **Referral** to **Md. AG MMFCU** for criminal/civil prosecution.
6. **Sanction** — termination, federal + state FCA action, exclusion, restitution.
7. **Recovery** booked to state + federal share per FMAP.

### 10.2 Scale notes

- MD Medicaid is mid-sized (~1.66M enrollees, but high per-capita expenditures driven by HSCRC hospital rates).
- Md. AG MMFCU is a **mid-to-upper-tier MFCU on civil recoveries per capita** `[Confirm via [HHS-OIG MFCU FY2024 Annual Report](https://oig.hhs.gov/reports/all/2025/medicaid-fraud-control-units-annual-report-fiscal-year-2024/)]`.
- **Maryland False Health Claims Act creates an active state qui tam plaintiff bar** — MedGuard360 evidence bundles must satisfy both federal Rule 9(b) and state pleading requirements.

### 10.3 MedGuard360 fraud-engine → OIG handoff

- Alert payload: provider NPI, claim batch IDs, statistical confidence, scheme classification, evidence bundle.
- Transport: signed JSON over mTLS REST to MDH OIG ingestion endpoint `[Confirm endpoint spec via MDH IT]`.
- SLA: high-severity within 4h; routine daily batch.
- `audit-service` retains immutable case file (WORM) for 10y per MD retention rules.
- **HSCRC-specific anomaly class:** because hospital rates are fixed by HSCRC, a unique MD fraud class is "facility rate-spread arbitrage" or "case-mix gaming under TCOC" — MedGuard360 fraud-engine should include MD-specific HSCRC-aware detectors.

---

## 11. Funding & FY2026 FMAP

- **MD traditional FMAP FY2026:** **~50%** — Maryland is at or near the **statutory 50% floor** (one of the higher-income states; FMAP determined by per-capita income formula) `[Confirm exact rate via [KFF FMAP](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/) and [MACPAC Exhibit 6](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)]`.
- **MD E-FMAP (CHIP) FY2026:** ~65% `[Confirm via MACPAC Exhibit 6]`.
- **Expansion FMAP:** **YES — 90% federal match on expansion population (~370K+ enrollees)** under ACA.
- **Administrative match:** 50% federal baseline; MMIS O&M 75%; MMIS DDI 90%; fraud detection systems 75% per 42 CFR 433.111.
- **OBBB Act (HR 1) impact:** Work-reporting requirements **apply to MD expansion population** beginning CY2027 phase-in. MDH will need to operationalize work-reporting verification — relevant connector category for MedGuard360.

**Economic significance:** MD's combination of **low FMAP (50%)** + **expansion 90%** + **high per-capita spend** + **HSCRC all-payer rates** means MD bears the highest state-share burden per Medicaid dollar of any Phase-3 pilot. This **raises** price sensitivity for non-federally-matched components but **lowers** sensitivity for fully-federally-matched (90% expansion + 75/90% MMIS DDI) services. Price model accordingly.

---

## 12. Key Differences from NC + Onboarding Effort

### Key differences vs. NC primary

| Axis | NC | MD | Implication for MedGuard360 |
|---|---|---|---|
| Agency model | NC DHHS / DHB (multi-division) | **MDH single department; Medicaid within OHCF; HSCRC as separate rate-setter** | Different — must coordinate with HSCRC for hospital pricing |
| Expansion | YES (Dec 2023) | **YES (Jan 2014)** | Both get 90% FMAP on expansion; MD has longer-tenured expansion population (~370K+) |
| Managed-care brand | PHP + Tailored + CFSP + EBCI (~11 plan products) | **HealthChoice (8 MCOs)** | More MCOs than any prior pilot; integrated model except for BH carve-out |
| BH carve-out | Tailored Plans (4 LME/MCOs, capitated PIHP) | **PBHS ASO (Carelon — FFS-based, NOT capitated)** | Different carve-out architecture — ASO routes claims FFS through Conduent MMIS; NC routes capitated through Tailored Plans |
| MMIS vendor | Gainwell (NCTracks) | **Conduent (MD MMIS)** | **NEW vendor pattern — not Gainwell**; similar to VA (also Conduent) so future reuse with VA ♻️ |
| MAC (A/B) | Palmetto JM | **Novitas Solutions JL** | **NEW MAC connector — JL** (covers DE/DC/MD/NJ/PA — unlocks future Phase-3 expansion to those states) |
| **DME MAC** | CGS JC | **Noridian JA** | **FIRST MEDGUARD PILOT OUTSIDE CGS JC** — must build entirely new Noridian JA DME connector; JA covers CT/DE/DC/ME/MD/MA/NH/NJ/NY/PA/RI/VT (entire Northeast) so connector unlocks future Northeast expansion |
| HIE | NC HealthConnex (SAS) — mandatory but suspended | **CRISP — TEFCA QHIN; effectively mandatory** | More mature HIE; **CRISP is a designated QHIN** so TEFCA-based interop is real, not aspirational; PDMP integrated with HIE (efficient) |
| State FCA | NCGS Ch. 14 + 108A | **Maryland False Health Claims Act § 2-1601 (private qui tam)** | Active state qui tam pipeline — build MD-specific evidence-bundle template |
| Scale | ~3.1M enrollees | **~1.66M enrollees** | About half of NC by enrollment, but higher per-capita spend |
| Hospital rate-setting | Market | **HSCRC TCOC all-payer** (unique to MD) | **Unique HSCRC integration** — hospital-claim repricing/validation under all-payer rate-setting; no analog in any other state |
| NEMT | Per plan | **County-administered (24 jurisdictions)** | **Most fragmented NEMT model of any pilot** — per-county broker matrix |
| FMAP | ~65% | **~50% (floor)** | Highest state-share burden of any pilot — affects pricing strategy |
| Pharmacy | OptumRx (FFS) + plan PBMs | MCO PBMs + state MPP (mixed carve) | Different carve structure |
| OBBB work-req | Required CY2027 (expansion pop) | **Required CY2027 (expansion pop)** | Work-reporting verification connector needed |

### Estimated onboarding effort

**~90 person-weeks** — **~10% lighter than the NC primary buildout but heaviest of the 4 Phase-3 docs in this batch**, driven by:

**Cost drivers (higher than NC in places):**
1. **Two NEW MAC stacks** — Novitas JL (Medicare A/B) + Noridian JA (DME). Noridian JA is the first non-CGS DME MAC for MedGuard360 — entirely new vendor relationship, submitter registration, EDI Gateway, RACI.
2. **HSCRC TCOC integration** — unique to MD; requires hospital-claim repricing/validation adapter with no reuse from any other state.
3. **8 HealthChoice MCOs** — more plan connectors than any other Phase-3 state in this batch.
4. **County-administered NEMT (24 jurisdictions)** — fragmented routing model.
5. **PBHS ASO carve-out (Carelon)** — different architecture from any prior pilot's BH model (NC capitated PIHP; everyone else integrated). FFS-through-MMIS routing for BH claims with 42 CFR Part 2 consent.
6. **Maryland False Health Claims Act** — state qui tam evidence-bundle template.
7. **Conduent MMIS pattern** — new vendor for MedGuard360 (NC/GA/AL/MS/WV are all Gainwell; MD + VA are Conduent). Build Conduent X12 adapter, with future reuse for VA ♻️.
8. **OBBB work-reporting verification** for expansion population (CY2027 phase-in).

**Cost savers (lighter than NC in places):**
1. ♻️ Conduent pattern partial reuse with VA.
2. ♻️ CMS Interop API stack reuse.
3. ♻️ Fraud-engine + AI engines reuse.
4. **CRISP QHIN maturity** — TEFCA-based HIE integration is real and well-documented; PDMP integrated with HIE saves a separate PDMP connector.
5. Single statewide dental admin (DentaQuest) — single dental connector.

**Strategic value:** Maryland delivers **three high-leverage beachheads simultaneously**:
- (a) **Novitas JL** connector → unlocks DE, DC, MD, NJ, PA Medicare integration for Phase-3 Mid-Atlantic expansion.
- (b) **Noridian JA** connector → unlocks the entire Northeast DME MAC footprint (12 states).
- (c) **Conduent MMIS** pattern → ♻️ reusable for VA + future Conduent states.

MD is therefore the **highest strategic-leverage Phase-3 pilot of this batch**, even though it is the heaviest in person-weeks.

---

## Appendix — Primary Maryland Sources

- [Maryland Department of Health (MDH)](https://health.maryland.gov/) · [MDH Medicaid](https://health.maryland.gov/mmcp/Pages/Home.aspx) · [HealthChoice](https://health.maryland.gov/mmcp/healthchoice/Pages/Home.aspx)
- [eMedicaid Provider Portal](https://encrypt.emdhealthchoice.org/) · [ePREP Provider Enrollment](https://eprep.health.maryland.gov/)
- [Maryland Children's Health Program (MCHP)](https://health.maryland.gov/mmcp/chp/Pages/home.aspx)
- [Behavioral Health Administration (BHA)](https://health.maryland.gov/bha/Pages/Index.aspx) · [Maryland Public Behavioral Health System](https://maryland.optum.com/) `[Confirm current ASO URL]`
- [Developmental Disabilities Administration (DDA)](https://health.maryland.gov/dda/Pages/dda_home.aspx) · [LTSSMaryland](https://ltssmaryland.health.maryland.gov/)
- [Maryland Healthy Smiles Dental (DentaQuest)](https://www.marylandhealthysmiles.com/)
- [CRISP HIE](https://www.crisphealth.org/) · [CRISP QHIN](https://www.crisphealth.org/qhin/)
- [Health Services Cost Review Commission (HSCRC)](https://hscrc.maryland.gov/) · [Maryland TCOC Model](https://hscrc.maryland.gov/Pages/total-cost-of-care.aspx)
- [Maryland AG Medicaid Fraud Control Unit (MMFCU)](https://www.marylandattorneygeneral.gov/Pages/MMFCU/default.aspx)
- [MDH Office of Inspector General](https://health.maryland.gov/oig/Pages/Home.aspx)
- [Novitas Solutions (MAC JL)](https://www.novitas-solutions.com/) · [CMS A/B MAC JL](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/Who-are-the-MACs-A-B-MAC-Jurisdiction-L-JL)
- [Noridian JA DME MAC](https://med.noridianmedicare.com/web/jadme) · [CMS DME MACs](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/DMEMACs)
- [Md. Code (online via Justia)](https://law.justia.com/codes/maryland/) · [COMAR Title 10](https://dsd.maryland.gov/regulations/Pages/title-10.aspx)
- [Maryland False Health Claims Act § 2-1601 et seq.](https://law.justia.com/codes/maryland/health-general/title-2/subtitle-16/)
- [Medicaid.gov MD 1115](https://www.medicaid.gov/medicaid/section-1115-demonstrations/state/maryland/index.html)
- [KFF FMAP](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/) · [MACPAC Exhibit 6](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)
- [healthinsurance.org MD Medicare](https://www.healthinsurance.org/medicare/maryland/)

---

*Document owner: MedGuard360 Enterprise Integrations. File: `integrations/md-enterprise/README.md`. Companion: `integrations/PILOT-STATES-COMPARISON.md`.*
