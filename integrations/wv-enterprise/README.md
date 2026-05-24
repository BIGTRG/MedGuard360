# MedGuard360 — WV Enterprise Landscape

> Reference document mapping the West Virginia Department of Human Services (DoHS) Bureau for Medical Services (BMS), WV Medicaid, Medicare, and the statewide billing ecosystem. Phase 2 pilot expansion state.
>
> Last verified: 2026-05-23. Where information is fluid, items are tagged `[Confirm via …]`.

---

## 1. State Medicaid Agency

**Agency:** West Virginia **Bureau for Medical Services (BMS)** — the single state Medicaid agency, housed within the **WV Department of Human Services (DoHS)**. DoHS was split from the legacy DHHR in 2024 (HB 4595 / 2023) into three separate departments: **Department of Health (DH)**, **Department of Human Services (DoHS)**, and **Department of Health Facilities (DHF)**, effective **2024-01-01** `[Confirm split status via [WV DoHS](https://dhs.wv.gov/)]`.

Commissioner of BMS: `[Confirm via [BMS Leadership](https://bms.wv.gov/)]`.

| # | Office / Section within BMS | Scope | MedGuard360 Intersection |
|---|---|---|---|
| 1 | Office of the Commissioner | Agency leadership | n/a |
| 2 | **Office of Managed Care (OMC)** | MHT + MHP contract oversight | MCO contract validation |
| 3 | **Office of Program Integrity (OPI)** | PI, RAC, SUR, MIC oversight | **Direct fraud-engine recipient** |
| 4 | Office of Pharmacy Services | FFS pharmacy, PBM oversight, PDL | NCPDP D.0 connector |
| 5 | Office of Long-Term Care | NF, HCBS waivers (IDDW, ADW, TBIW) | Waiver claims, EVV |
| 6 | Office of Behavioral Health Services | SUD/MH policy, ARTS-equivalent | BH claims rules |
| 7 | Office of Quality and Program Innovation | VBP, quality metrics | Reporting connector |
| 8 | Office of Eligibility & Member Services | Eligibility policy, member helpline | Eligibility rules |
| 9 | Office of Provider Services | Enrollment policy oversight | PRSS connector |
| 10 | Office of Finance & Reimbursement | Rate setting, cost settlement, CMS-64 | Financial reconciliation |
| 11 | Office of Data Analytics | Warehouse, T-MSIS, EHB | Analytics export |

Peer state agencies routinely touched:
- **DoHS — Bureau for Family Assistance (BFA)** — operates Medicaid eligibility via **inROADS** integrated eligibility system; local DHHR offices intake.
- **Department of Health (DH) — Bureau for Public Health (BPH)** — ELR/eCR, immunization registry, vital records.
- **DH — Office of Drug Control Policy** + state Quick Response Teams (SUD).
- **Department of Health Facilities (DHF)** — operates state psychiatric hospitals, nursing facilities.
- **WV Office of the Attorney General — Medicaid Fraud Control Unit (MFCU)**.
- **WV Insurance Commissioner** — health plan + PBM regulation.

---

## 2. WV Medicaid — Programs & Populations

### Enrollment

~**500K–520K** members across Medicaid + WVCHIP (recent enrollment declined post-PHE unwind from peak ~660K+ in 2023) `[Confirm latest via [BMS Reports](https://bms.wv.gov/) and [CMS Monthly Enrollment Highlights](https://www.medicaid.gov/medicaid/national-medicaid-chip-program-information/medicaid-chip-enrollment-data/index.html)]`.

### Expansion

**YES — full ACA Medicaid expansion** effective **2014-01-01** (one of the first non-blue-state early adopters under Gov. Earl Ray Tomblin). Adults 19–64 up to 138% FPL. Approximately 165K+ expansion enrollees historically. **OBBB Act (HR 1)** work-requirement implementation phase-in beginning **CY2027** `[Confirm].

### Programs / sub-populations

| Population | Description |
|---|---|
| **MAGI Adults (Expansion)** | 19–64, ≤138% FPL |
| **TANF / WV WORKS** | Low-income families/children |
| **Pregnant Women** | Up to 185% FPL + 12-month postpartum (extended 1115) |
| **WVCHIP** | Children 0–18 up to 300% FPL (separate state CHIP, operated by the **WVCHIP** board separately from BMS though Medicaid-related) `[Confirm enrollment threshold]` |
| **ABD** | Aged/Blind/Disabled, categorical + asset-tested |
| **Dual Eligibles** | QMB / SLMB / QI / QDWI standard categories |
| **LTSS / waiver members** | See waivers below |

### Dual eligibles

Standard federal categories. **Crossover flow:** Medicare → CMS BCRC COBA → **WV MMIS (Gainwell)** → MCO encounter if dual enrolled in MHT (most full duals remain FFS for crossover).

### Waivers (1915(c) HCBS)

| Waiver | Population | Operator |
|---|---|---|
| **Intellectual/Developmental Disabilities Waiver (IDDW / I/DD)** | I/DD | BMS via Acentra (contracted UM) `[Confirm UM vendor]` |
| **Aged & Disabled Waiver (ADW)** | Aged/Disabled needing NF LOC | BMS via contracted ADC |
| **Traumatic Brain Injury Waiver (TBIW)** | TBI adults | BMS |
| **Children with Serious Emotional Disorder Waiver (CSEDW)** | Children with SED | BMS via Mountain Health Promise (Aetna) |
| **Personal Care Services (PCS)** | State plan (not 1915(c)) | BMS, EVV-required |

### 1115 demonstrations

- **SUD 1115 Waiver** — IMD exclusion waiver supporting SUD treatment continuum (MAT, OUD residential). Renewed `[Confirm renewal date]`.
- **SMI 1115 Waiver** — SMI IMD waiver `[Confirm]`.

### Health Plans (Managed Care)

WV operates two distinct managed-care vehicles:

**Mountain Health Trust (MHT)** — physical health for ~87% of Medicaid members ([BMS MHT](https://bms.wv.gov/members/mountain-health-trust-managed-care)). **4 MCOs:**

1. **Aetna Better Health of West Virginia (ABHWV)** — CVS Health
2. **Highmark Health Options West Virginia (HHOWV)** — NEW entrant effective **2024-08-01** ([BMS MHT page](https://bms.wv.gov/members/mountain-health-trust-managed-care))
3. **The Health Plan of West Virginia (THP)** — provider-owned, WV-based
4. **Wellpoint West Virginia (WP)** — Elevance Health (successor brand to Amerigroup; absorbed legacy **UniCare Health Plan of West Virginia** branding/contract `[Confirm UniCare→Wellpoint transition date]`)

> **Important correction vs. legacy assumptions:** The pre-2024 3-MCO roster (Aetna, The Health Plan, UniCare) is **superseded**. **Highmark Health Options** entered MHT 8/1/2024 and **UniCare** rebranded to **Wellpoint** as part of Elevance's national Medicaid brand consolidation. Current operational count is **4 MHT MCOs**.

**Mountain Health Promise (MHP)** — specialty plan for children in foster care, kinship, adoption assistance, and the CSED waiver population ([BMS MHP](https://bms.wv.gov/members/mountain-health-promise)). Operated by **Aetna Better Health of WV (ABHWV)** under a separate contract from MHT.

### Carve-outs

- Behavioral health is **carved IN to MHT** for most members but with state-funded SUD continuum and CSED waiver-specific carve-outs via MHP.
- Dental: carved IN to MCO benefit; **DentaQuest** historical statewide administrator `[Confirm current dental admin]`.
- LTSS HCBS waivers (IDDW/ADW/TBIW): **carved OUT to FFS** through Gainwell MMIS.

---

## 3. Medicare in WV

| Metric | Value | Source |
|---|---|---|
| Total Medicare beneficiaries (WV, Sep 2024) | ~440K–460K | `[Confirm via [KFF Total Medicare Beneficiaries](https://www.kff.org/medicare/state-indicator/total-medicare-beneficiaries/)]` |
| MA penetration | ~52–54% (above national avg) | `[Confirm via KFF MA Penetration]` |

**MAC assignments:**

- **A/B MAC: Palmetto GBA, Jurisdiction JM** — WV is part of JM (NC, SC, VA, WV). [Palmetto JM](https://palmettogba.com/jma). **Same MAC stack as NC/SC/VA pilots — full connector reuse.**
- **DME MAC: CGS Administrators, Jurisdiction C** — WV is JC. **Drop-in reuse with all Phase 1 + Phase 2 pilots.**
- **HH+H MAC**: Palmetto GBA Southeast region `[Confirm]`.
- **National Supplier Clearinghouse:** Palmetto GBA.

**Crossover (COBA):** Medicare → CMS BCRC → WV MMIS → MCO if carve-in.

---

## 4. Statewide Billing Entities (Who bills WV Medicaid / Medicare)

| # | Entity Type | WV Provider Type | Workflow | Primary Payer Path |
|---|---|---|---|---|
| 1 | Individual practitioners | BMS PT individual + NUCC taxonomy | 837P → MMIS (FFS) or MHT MCO | Both |
| 2 | Hospitals (Acute, CAH, IRF, LTACH, Psych) | BMS PT hospital | 837I; Medicare via Palmetto JM | Both |
| 3 | FQHC + RHC | BMS PT FQHC/RHC | PPS rate; Medicare wrap; UDS | Both |
| 4 | Comprehensive Behavioral Health Centers (CBHCs) | BMS PT CBHC | 837P → MCO; state-funded SUD continuum FFS | Mostly Medicaid |
| 5 | Nursing facilities (NF) | BMS PT NF | UB-04/837I; MDS 3.0; **FFS carve-out** | Both |
| 6 | Home health | BMS PT HH | 837I; OASIS to Palmetto | Both |
| 7 | Hospice | BMS PT hospice | Per-diem; NOE/NOTR to Palmetto | Both |
| 8 | Pharmacy | NCPDP-enumerated | NCPDP D.0 → **Rational Drug Therapy Program (RDTP) PBM** + MCO PBMs `[Confirm current FFS PBM]` | Both |
| 9 | DMEPOS | BMS PT DME | 837P to CGS JC (Medicare); to Gainwell MMIS for Medicaid | Both |
| 10 | NEMT broker | BMS PT NEMT | Statewide broker: **ModivCare** (legacy LogistiCare) ([WV NEMT](https://bms.wv.gov/members/non-emergency-medical-transportation)) | Mostly Medicaid |
| 11 | Dental | BMS PT dental — through DentaQuest `[Confirm]` | 837D | Mostly Medicaid |
| 12 | Vision (OD / optician) | BMS PT vision | 837P | Both |
| 13 | School-based services (LEAs) | BMS PT LEA | Medicaid-in-schools IEP-driven; annual cost recon | WV Medicaid only |
| 14 | I/DD waiver services | BMS PT IDDW | Service auth via Acentra `[Confirm UM]`; 837P FFS | WV Medicaid only |
| 15 | ADW personal attendant + skilled | BMS PT ADW | Service plan + EVV; 837P FFS | WV Medicaid only |
| 16 | ICF/IID | BMS PT ICF/IID | Per-diem | WV Medicaid only |
| 17 | OTP / SUD residential | BMS PT OTP / SUD Res | MCO + IMD waiver claims | Hybrid |
| 18 | Local Health Departments | BMS PT LHD | Hybrid clinical/state-funded | Hybrid |

> Provider-type codes per BMS Common Chapter / Provider Manuals. `[Confirm current PT codes via [BMS Provider Manuals](https://bms.wv.gov/provider-information/provider-manuals)]`.

---

## 5. MMIS Operator + Portal — WV MMIS (Gainwell)

**Operator:** **Gainwell Technologies** — fiscal agent providing Member Services and Provider Services support; MMIS processes FFS claims, capitation payments to MCOs, and collects encounter data submitted by the MHT/MHP MCOs ([BMS MHT page](https://bms.wv.gov/members/mountain-health-trust-managed-care)). (Heritage: DXC → Gainwell 2020 spinoff; HP/EDS heritage further back.)

**Portal:** **WV Medicaid Provider Web Portal** at [wvmmis.com](https://www.wvmmis.com/) — Gainwell-operated provider portal for claims, eligibility, PA, RA. BMS public site: [bms.wv.gov](https://bms.wv.gov/).

### MMIS DOES handle

- FFS claim adjudication for non-MCO populations (carve-out waivers, dual-eligible crossovers, residual FFS).
- Encounter ingestion from MHT + MHP MCOs.
- Provider enrollment + revalidation per 42 CFR 438.602(b).
- 270/271 eligibility (real-time + batch).
- Pharmacy POS for FFS (with RDTP / contracted FFS PBM `[Confirm]`).
- Capitation payment to MHT/MHP MCOs.
- Service authorization for FFS-carved waivers via Acentra `[Confirm UM contract]`.
- EVV aggregation for PCS + HHCS per Cures Act 1903(l).
- Cost settlement (FQHC/RHC/Hospital/LEA).

### MMIS does NOT handle

- MCO claim adjudication.
- MCO-level PA (each MHT plan has own UM).
- MA / Part D.

---

## 6. MCOs / Managed-Care Org List with Current Contract Terms

### Mountain Health Trust (MHT) — physical health for ~87% of Medicaid members

| # | Plan | Parent | Notes |
|---|---|---|---|
| 1 | **Aetna Better Health of West Virginia (ABHWV)** | CVS Health | Also operates Mountain Health Promise |
| 2 | **Highmark Health Options West Virginia (HHOWV)** | Highmark (BCBS-PA/WV/DE) | New entrant **8/1/2024** |
| 3 | **The Health Plan of West Virginia (THP)** | Provider-owned WV nonprofit | Long-tenured incumbent |
| 4 | **Wellpoint West Virginia (WP)** | Elevance Health | Successor brand to **UniCare** (Elevance national Medicaid brand consolidation) `[Confirm transition date]` |

### Mountain Health Promise (MHP) — specialty plan

| Plan | Parent | Population |
|---|---|---|
| **Aetna Better Health of WV — Mountain Health Promise** | CVS Health | Children in foster care / kinship / adoption assistance + CSED waiver |

**Contract financial / operational terms (selected):**
- Capitation actuarial certification per CMS rate-setting guide.
- MLR minimum **85%** per 42 CFR 438.8.
- Encounter submission cadence per BMS contract `[Confirm cadence]`.
- Network adequacy per 42 CFR 438.68.
- VBP targets `[Confirm SFY26]`.
- Current MHT contract effective date / term: `[Confirm via [BMS contract publications](https://bms.wv.gov/)]`.

---

## 7. Compliance / Regulatory Surface

### Federal — identical to NC baseline (HIPAA, 42 CFR 455/456/Part 2, 45 CFR 162, ONC HTI series, CMS-0057-F, HITECH, FCA, AKS, Stark).

### WV State

| Statute | Subject |
|---|---|
| **W. Va. Code Chapter 9** | Human Services — Medicaid program authority (§§ 9-2-1 et seq.) |
| **W. Va. Code Chapter 16** | Public Health |
| **W. Va. Code Chapter 27** | Mental Health |
| **W. Va. Code Chapter 30** | Professional licensure (BOM, BON, BOP, etc.) |
| **W. Va. Code Chapter 33** | Insurance — MA plans, PBM |
| **W. Va. Code § 9-7-1 et seq.** | Medical Services Fund + program integrity |
| **W. Va. Code § 9-7-6** | **Medicaid Fraud Control Unit authority (WV MFCU within OAG)** |
| **W. Va. Code § 16-29B** | Health care data + WVHIN authority |
| **W. Va. Code § 5-3-3** | Office of the Attorney General authority |

### Enforcement bodies

- **BMS Office of Program Integrity (OPI)** — pre/post-pay review, SUR, RAC, MIC oversight, tip intake ([BMS PI](https://bms.wv.gov/program-integrity/program-integrity)).
- **WV Office of the Attorney General Medicaid Fraud Control Unit (MFCU)** — federally certified MFCU under 42 CFR 1007 ([WV OAG MFCU](https://ago.wv.gov/Pages/default.aspx) `[Confirm exact MFCU URL]`). Funded 75% federal / 25% state.
- **WV Legislative Auditor (Post-Audit Division + PERD)** — performance audits including Medicaid.
- **WV State Auditor** — financial controls.
- **CMS / UPIC** — Qlarant covers WV (Southeast UPIC) `[Confirm current contract]`.

**Fraud referral flow:** Tip / data signal → **BMS OPI** triage → if credible criminal allegation → referral to **WV OAG MFCU** → prosecution + restitution. T-MSIS reporting parallel.

---

## 8. MedGuard360 Integration Plan (WV)

### 8.1 State-config-service package: `state-config/wv.json`

```jsonc
{
  "state_code": "WV",
  "medicaid_brand": "WV Medicaid",
  "state_agency": "BMS",
  "parent_dept": "DoHS",
  "mmis_operator": "GAINWELL",
  "mmis_portal": "https://www.wvmmis.com/",
  "mco_programs": ["MHT","MHP"],
  "mht_mcos": ["AETNA_WV","HIGHMARK_HO_WV","THE_HEALTH_PLAN","WELLPOINT_WV"],
  "mhp_mco": "AETNA_WV_MHP",
  "ffs_pbm": "RDTP", // [Confirm]
  "dental_admin": "DENTAQUEST", // [Confirm]
  "nemt_broker_statewide": "MODIVCARE",
  "ab_mac": "PALMETTO_JM",
  "dme_mac": "CGS_JC",
  "hie": "WVHIN",
  "mfcu_endpoint": "WV_OAG_MFCU",
  "pi_unit": "BMS_OPI",
  "expansion": true,
  "expansion_effective": "2014-01-01",
  "obbb_work_req_effective": "2027-01-01" // [Confirm phase-in]
}
```

### 8.2 Connector inventory (reuse from NC/VA where flagged ♻️)

| # | Counterparty | Direction | Transport | Reuse |
|---|---|---|---|---|
| 1 | WV MMIS (FFS claims, Gainwell) | Out + In | X12 837/835/277CA via SFTP | New (but Gainwell pattern reuse from NC ♻️) |
| 2 | WV MMIS (eligibility) | Out | X12 270/271 + FHIR Coverage | Pattern reuse ♻️ |
| 3 | WV MMIS (PA / service auth via Acentra `[Confirm]`) | Out | REST + X12 278 | Pattern reuse ♻️ |
| 4 | WV MMIS (provider enrollment) | Out + In | REST + SFTP roster | Pattern reuse ♻️ |
| 5 | WV MMIS (encounters) | Out | X12 837 | Pattern reuse ♻️ |
| 6 | 4 MHT MCOs | Bi-dir | FHIR R4 + X12 | Per-plan OAuth2; partial Aetna/Wellpoint reuse |
| 7 | Mountain Health Promise (Aetna) | Bi-dir | FHIR R4 + X12 | Shares Aetna creds |
| 8 | Palmetto GBA JM | Out | X12 837 via EDI-SS | **Drop-in reuse from NC/VA** ♻️ |
| 9 | CGS JC (DME) | Out | X12 837P + CMN | **Drop-in reuse all states** ♻️ |
| 10 | RDTP FFS PBM | Out | NCPDP D.0 | New BIN/PCN |
| 11 | DentaQuest WV `[Confirm]` | Out | 837D | New 837D endpoint |
| 12 | WVHIN | Bi-dir | FHIR R4 + ADT + Portal | New |
| 13 | ModivCare WV | Bi-dir | REST + 837P | Pattern reuse ♻️ |
| 14 | WV OAG MFCU referral | Out | REST webhook + secure email | Pattern reuse ♻️ |
| 15 | BMS OPI fraud-alert intake | Out | REST + mTLS | Pattern reuse ♻️ |
| 16 | T-MSIS extract | Out | flat-file via state | n/a |
| 17 | CMS Interop APIs (CMS-0057-F) | Bi-dir | FHIR R4 | Standard |

### 8.3 Phased rollout

1. **Phase 2a (Q3 2026):** Eligibility, provider enrollment, Palmetto JM crossover (drop-in), CGS JC DME (drop-in).
2. **Phase 2b (Q4 2026):** FFS claims (Gainwell MMIS), MCO encounter forwarding, fraud-alert handoff to BMS OPI, MFCU referral pipeline.
3. **Phase 2c (Q1 2027):** Service auth via Acentra, WVHIN bi-directional, CMS-0057-F API conformance per MCO.

---

## 9. State HIE — WVHIN

- **Authority:** **West Virginia Health Information Network (WVHIN)** — public-private statutory HIE entity established under **W. Va. Code § 16-29B** ([WVHIN About](https://wvhin.org/about/)).
- **Scale:** Supports **1.7M+ patients**; connects **all 55 acute-care hospitals**, nearly all FQHCs, most ambulatory + urgent care, VA facilities, and regional Appalachian HIEs ([WVHIN HIE](https://wvhin.org/services/wvhin-health-information-exchange/)).
- **Mandate:** No hard statutory data-submission mandate (voluntary participation), but WVHIN sits in statute and is the state-designated HIE.
- **Services:**
  - WVHIN Portal — clinical summaries, med history, dx, procedures, labs ([WVHIN Portal](https://wvhin.org/services/wvhin-portal/)).
  - SDOH screening assessments under the Portal's Social Needs tab (sourced from ADT + ICD-10 to assist Medicare/Medicaid reimbursement) ([Civitas case study](https://civitasforhealth.org/wvhin-whole-person-care-west-virginia/)).
  - Public health reporting to **Bureau for Public Health**.
  - **WV e-Directive Registry** (POST/Living Will/MOST) integration ([WV End of Life](https://wvendoflife.org/wv-e-directive-registry/wvhin/)).
  - HIE Admin Tool for facility connection management.
- **TEFCA / QHIN:** `[Confirm WVHIN QHIN alignment via national HIE network — eHealth Exchange or CommonWell]`.
- **MedGuard360 `hie-service` integration:** Subscribe to ADT events for in-network member; query WVHIN Portal for clinical documentation supporting PA decisions; submit aggregated encounter summaries per BAA + DUA.

---

## 10. Program Integrity Workflow (WV)

### 10.1 Lifecycle

1. **Detection** — BMS OPI data analytics, UPIC (Qlarant `[Confirm]`), tip line `[Confirm BMS tip number]`, Legislative Auditor PERD, MedGuard360 fraud-engine alert.
2. **Triage** at BMS OPI: clinical + statistical review, SUR sampling, RAC scope.
3. **Pre-payment review hold** or **post-payment recoupment**.
4. **Credible allegation of fraud (CAF)** under 42 CFR 455.23 → payment suspension.
5. **Referral** to **WV OAG MFCU** for criminal/civil prosecution.
6. **Sanction** — termination (cross-state via T-MSIS/PECOS), exclusion, restitution.
7. **Recovery** booked state + federal per FMAP.

### 10.2 MedGuard360 fraud-engine → BMS OPI handoff

Same alert payload schema as NC OCPI handoff; transport: signed JSON over mTLS REST to OPI ingestion endpoint `[Confirm endpoint via BMS IT]`. SLA: high-severity within 4h. Audit retention per W. Va. Code retention schedule.

---

## 11. Funding & Federal Matching — FY2026 FMAP (West Virginia)

- Federal Register annual FMAP table — [89 FR / 2024-27910](https://www.federalregister.gov/documents/2024/11/29/2024-27910/federal-financial-participation-in-state-assistance-expenditures-federal-matching-shares-for) (FY2026 published 2024-11-29).
- **WV traditional FMAP FY2026:** **~73.99%** (preliminary; among the highest-FMAP states due to per-capita-income formula) `[Confirm exact rate via [KFF FMAP](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/) / [MACPAC Exhibit 6](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)]`.
- **WV Enhanced E-FMAP (CHIP / WVCHIP):** **~81.79%** ≈ traditional + 30% × (100 − traditional), capped at 85% `[Confirm]`.
- **Expansion FMAP:** **90% federal / 10% state.** WV expansion population large relative to total membership; 10% state share material to BMS budget.
- **Administrative match:** 50% general; MMIS O&M 75%, MMIS DDI 90%, eligibility 75/90, fraud detection 75% per 42 CFR 433.111.
- **OBBB Act (HR 1):** ends temporary enhanced ARPA expansion FMAP bonus; work-requirement implementation CY2027.

---

## 12. Key Differences from NC + Estimated Onboarding Lift

### 12.1 Key differences vs NC pilot

| Dimension | NC | WV | Implication |
|---|---|---|---|
| Medicaid brand | NC Medicaid | WV Medicaid | n/a |
| Parent dept structure | NC DHHS (single) | **DoHS / DH / DHF (3-way split 1/1/2024)** | More inter-agency coordination |
| Expansion | Dec 2023 | **Jan 2014** (9y earlier — original ACA cohort) | Fully matured expansion population |
| MMIS operator | Gainwell (NCTracks); Optum PDM 2026 | **Gainwell (wvmmis.com)** | **Strong Gainwell pattern reuse** ♻️ |
| MMIS architecture | Single-vendor (Gainwell consolidated) | Single-vendor (Gainwell consolidated) | Simpler than VA's modular MES |
| Enrollment | ~3.1M | **~500K** | ~6× smaller scale |
| MCO program label | Standard Plans (PHP) + Tailored Plans + CFSP + EBCI | **MHT (physical) + MHP (foster/CSED)** | Different naming, similar concept |
| MCO count (operational May 2026) | 5 Std + 4 Tailored + CFSP + EBCI ≈ 11 | **4 MHT + 1 MHP = 5 plan products** | Half the connector count |
| BH carve-out | Yes (4 Tailored Plans) | **Carved IN to MHT** for routine; SUD continuum + CSED carve-out | No 42 CFR Part 2 separate-plan handling for most BH |
| Tribal plan | EBCI Tribal Option | **None** | No IMCE integration |
| Foster care plan | CFSP (Healthy Blue Care Together) | **MHP (Aetna)** | Single MCO carrier; same flow pattern |
| Major 2025–26 churn | Tailored '24, CFSP '25, HOP pause '25 | **Highmark Health Options new 8/1/2024; UniCare→Wellpoint rebrand** | Less recent churn |
| 1115 waiver footprint | HOP (paused) | SUD + SMI IMD waivers | Standard SUD/SMI handling |
| Statutory HIE mandate | NCGS 90-414.4 (suspended) | **None** (WVHIN voluntary) | Voluntary HIE |
| HIE vendor / network | SAS Institute | **WVHIN** (statutory entity per § 16-29B) | New platform; standard FHIR endpoints |
| FFS PBM | OptumRx | **RDTP** (Rational Drug Therapy Program — university-affiliated) `[Confirm]` | NCPDP D.0 standard reusable |
| State fraud statute | NCGS 108A + NCGS Ch. 14 | **W. Va. Code § 9-7-6** + criminal fraud chapters | Standard MFCU referral; no state qui tam analog as robust as VA's VFATA |
| MFCU recovery rank | 8th nationally | `[Confirm via HHS-OIG MFCU FY2024 data]` | Smaller absolute recoveries (proportional to ~500K enrollment) |
| Medicare MAC | Palmetto JM | **Palmetto JM (same)** | **Drop-in reuse** ♻️ |
| DME MAC | CGS JC | **CGS JC (same)** | **Drop-in reuse** ♻️ |
| Traditional FMAP | ~65% | **~74%** (much higher) | More federal subsidy → smaller state cost-share for MMIS-modular services |

### 12.2 Estimated onboarding lift

| Workstream | Effort (person-weeks) | Notes |
|---|---|---|
| `state-config-service` WV package | 3 | Rule data + reference |
| WV MMIS (Gainwell) connector | 5 | **Strong reuse from NCTracks (also Gainwell)** ♻️ |
| Provider enrollment (Gainwell) | 2 | Pattern reuse |
| Service auth (Acentra `[Confirm]`) | 3 | Pattern reuse with VA Acentra ANG |
| 4 MHT MCOs + 1 MHP | 8 | Per-plan OAuth2; Aetna/Wellpoint partial reuse from NC/VA |
| Palmetto JM (Medicare A/B) | 0 | **Drop-in reuse** ♻️ |
| CGS JC (DME) | 0 | **Drop-in reuse** ♻️ |
| RDTP FFS PBM | 3 | New BIN/PCN |
| DentaQuest WV `[Confirm]` | 2 | New 837D endpoint or shared with VA DentaQuest ♻️ |
| WVHIN | 5 | FHIR R4 + ADT + e-Directive Registry |
| BMS OPI fraud-alert intake | 2 | Same schema, new endpoint |
| WV OAG MFCU referral | 2 | Same schema, new endpoint |
| OBBB work-req reporting (CY2027) | 6 | Defer until CMS guidance final |
| End-to-end testing + CMS SMC artifacts | 6 | Smaller scale; less data volume |
| **Total** | **~47 person-weeks** | **~45% lighter than NC primary buildout** — smallest of Phase 2 due to Gainwell reuse + smaller MCO count + smaller scale |

---

## Appendix A — Primary Sources (WV)

- [BMS Home](https://bms.wv.gov/) · [BMS Provider Information](https://bms.wv.gov/provider-information)
- [WV Medicaid Provider Web Portal — wvmmis.com](https://www.wvmmis.com/)
- [Mountain Health Trust](https://bms.wv.gov/members/mountain-health-trust-managed-care) · [Mountain Health Promise](https://bms.wv.gov/members/mountain-health-promise)
- [BMS Managed Care Programs May 1, 2026 (PDF)](https://bms.wv.gov/media/41259/download?inline=)
- [BMS NEMT](https://bms.wv.gov/members/non-emergency-medical-transportation)
- [WV Department of Human Services (DoHS)](https://dhs.wv.gov/)
- [WV Office of the Attorney General](https://ago.wv.gov/)
- [WVHIN](https://wvhin.org/) · [WVHIN HIE Service](https://wvhin.org/services/wvhin-health-information-exchange/) · [WVHIN Portal](https://wvhin.org/services/wvhin-portal/) · [Civitas WVHIN case study](https://civitasforhealth.org/wvhin-whole-person-care-west-virginia/)
- [WV e-Directive Registry via WVHIN](https://wvendoflife.org/wv-e-directive-registry/wvhin/)
- [Palmetto GBA JM Part A](https://palmettogba.com/jma) · [CMS A/B MAC JM](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/Who-are-the-MACs-A-B-MAC-Jurisdiction-M-JM)
- [CGS DME JC](https://www.cgsmedicare.com/jc/) · [CMS DME MAC JC](https://www.cms.gov/medicare/medicare-contracting/medicare-administrative-contractors/who-are-the-macs-dme-mac-jurisdiction-c-jc)
- [Federal Register FMAP FY2026 (89 FR / 2024-27910)](https://www.federalregister.gov/documents/2024/11/29/2024-27910/federal-financial-participation-in-state-assistance-expenditures-federal-matching-shares-for) · [KFF FMAP](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/) · [MACPAC Exhibit 6](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)
- [WV Medicaid Eligibility 2026](https://medicaideligibilitycalculator.com/medicaid-eligibility/west-virginia/)

---

*Document owner: MedGuard360 Enterprise Integrations. File: `integrations/wv-enterprise/README.md`. Cross-references: `integrations/nc-enterprise/`, `integrations/va-enterprise/`, `integrations/PILOT-STATES-COMPARISON.md`.*
