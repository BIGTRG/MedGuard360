# MedGuard360 — TN Enterprise Landscape

> Reference document mapping the Tennessee Division of TennCare, TN Medicaid, Medicare, and the statewide billing ecosystem. Phase 2 pilot expansion state.
>
> Last verified: 2026-05-23. Where information is fluid, items are tagged `[Confirm via …]`.

---

## 1. State Medicaid Agency

**Agency:** **Division of TennCare** — the single state Medicaid agency, housed within the **Tennessee Department of Finance and Administration (F&A)**. Unique in the nation as a long-standing **statewide capitated managed-care-only** program operating under a continuously renewed §1115 demonstration (**TennCare III**) — there is essentially no FFS Medicaid claims rail for the vast majority of services.

Director: `[Confirm via [TennCare About](https://www.tn.gov/tenncare.html)]`.

| # | Office / Unit within TennCare | Scope | MedGuard360 Intersection |
|---|---|---|---|
| 1 | Office of the Deputy Commissioner | Agency leadership | n/a |
| 2 | **Strategic Planning & Innovation Group** | 1115 demonstration design, Shared Savings | Reporting |
| 3 | **Office of General Counsel** | Legal, BAA, DUA | BAA review |
| 4 | **Office of Program Integrity (OPI)** | PI, RAC, SUR, MIC, recipient fraud | **Direct fraud-engine recipient** |
| 5 | **Long-Term Services and Supports (LTSS) Division** | CHOICES, ECF CHOICES | Waiver claims, EVV |
| 6 | **Member Services / Communication** | TennCare Connect helpline, member enrollment | Member-app integration |
| 7 | **Quality Improvement & Innovation** | THCII / PCMH / Episodes of Care | Quality reporting |
| 8 | **Pharmacy** | PDL, FFS preferred drug, MAC, rebate | NCPDP D.0 connector |
| 9 | **Office of Eligibility Services / TennCare Connect** | Eligibility determinations | Eligibility rules |
| 10 | **Office of Provider Networks** | Provider enrollment oversight (MCO-network primary) | Provider connector |
| 11 | **Office of Finance, Reimbursement & Claims** | Capitation rates, CMS-64, MMIS oversight | Financial reconciliation |
| 12 | **Office of Information Systems** | TEDS, MMIS modules, interoperability | Integration platform |
| 13 | **Office of Performance Excellence** | T-MSIS, EHB, data warehouse | Analytics export |

Peer state agencies routinely touched:
- **TN Department of Health (TDH)** — public health, immunization, vital records, EHR Meaningful Use, communicable disease.
- **TN Department of Intellectual and Developmental Disabilities (DIDD)** — operates legacy I/DD waivers (Statewide, Self-Determination, Comp Aggregate Cap — closed to new enrollment); partners with TennCare on **ECF CHOICES**.
- **TN Department of Mental Health and Substance Abuse Services (TDMHSAS)** — BH licensure, crisis services, state psychiatric hospitals.
- **TN Department of Human Services (TDHS)** — TANF, foster care services (with DCS).
- **TN Department of Children's Services (DCS)** — foster care + adoption assistance.
- **TN Department of Disability and Aging (DDA)** — newly named department (formerly TCAD/TCAS); operates ECF CHOICES intake / referrals ([DDA ECF CHOICES](https://www.tn.gov/disability-and-aging/disability-aging-programs/ecf-choices.html)).
- **TN Office of the Attorney General — Medicaid Fraud Control Unit (MFCU)**.

---

## 2. TennCare — Programs & Populations

### Enrollment

~**1.4M–1.5M** members across TennCare + CoverKids `[Confirm latest via [TennCare Enrollment Data](https://www.tn.gov/tenncare/information-statistics/enrollment-data.html)]`. Post-PHE unwind has reduced enrollment from a peak ~1.7M.

### Expansion

**NO — Tennessee has NOT adopted ACA Medicaid expansion.** No conditional or partial expansion analog to GA Pathways exists `[Confirm via [KFF Expansion Status](https://www.kff.org/medicaid/status-of-state-medicaid-expansion-decisions/)]`.

This is the most consequential distinction from NC/VA/WV: **TN's adult coverage is much narrower** (essentially parents below ~95% FPL via Caretaker Relative + ABD), creating a substantial coverage gap for low-income adults 19–64 without dependent children.

### Programs / sub-populations

| Population | Description |
|---|---|
| **Standard TennCare (Medicaid)** | Parents/caretakers, pregnant women, children, ABD; income limits well below expansion threshold for adults without kids |
| **CoverKids (CHIP)** | Children 0–18 up to 250% FPL (separate CHIP) |
| **Pregnant Women** | Up to 195% FPL + 12-month postpartum (extended via 1115) |
| **CHOICES (LTSS)** | Nursing-facility-LOC adults; HCBS alternative |
| **ECF CHOICES (Employment & Community First)** | I/DD HCBS waiver — currently the only open enrollment path for new I/DD members (legacy DIDD waivers closed) ([ECF CHOICES](https://www.tn.gov/disability-and-aging/disability-aging-programs/ecf-choices.html)) |
| **Katie Beckett** | Severely disabled children otherwise ineligible due to parental income (Parts A, B; launched late 2020) |
| **TennCare Standard (closed legacy)** | Historical — closed to new enrollment |
| **Dual Eligibles** | See below |

### Dual eligibles

Standard federal categories (QMB, SLMB, QI, QDWI, full duals). TennCare operates **D-SNP aligned enrollment** with MCO parents to enable integrated care for full duals; **no current MMP demonstration**.

### Waivers / Demonstrations

| Authority | Vehicle | Scope |
|---|---|---|
| **§1115 — TennCare III** | Master demonstration extended through 2030 (10-year approval Jan 2021) with subsequent amendments | Entire managed-care program + Shared Savings (Block Grant-like) authority |
| **§1915(c) — ECF CHOICES** | I/DD HCBS | Operated through TennCare/MCO + DIDD/DDA |
| **§1915(c) — DIDD Statewide / Self-Determination / Comp Aggregate Cap** | I/DD HCBS | **Closed to new enrollment**; existing members served |
| **§1915(c) — Katie Beckett Part A** | Severely disabled children | TennCare |
| **Katie Beckett Part B** | Less-intensive disabled children | TennCare |
| **CHOICES (under 1115)** | Adult LTSS | Operated via TennCare MCOs |

### Health Plans (Managed Care)

**3 statewide MCOs** ("Managed Care Contractors" / MCCs) per [TennCare Managed Care Contractors](https://www.tn.gov/tenncare/providers/managed-care-contractors.html):

1. **BlueCare Tennessee** (BCBS-Tennessee subsidiary) — [BlueCare TN](https://www.bcbst.com/publicsites/bluecare/plans-programs/bluecaretn/)
2. **UnitedHealthcare Community Plan of Tennessee** — *Note:* operational status changing; provider-network attrition reported including major providers terminating in-network status effective **2026-01-01** ([MMC notice](https://www.mmclinic.com/uhctenncarechange)). `[Confirm whether UHC remains a TennCare MCO post-2026]`.
3. **Wellpoint Tennessee** (Elevance Health) — successor brand to **Amerigroup Tennessee** under Elevance's national Medicaid brand consolidation ([TennCare Contracts](https://www.tn.gov/tenncare/information-statistics/tenncare-contracts.html))

> **Important correction vs. legacy assumptions:** **AmeriHealth Caritas Tennessee is NOT a current TennCare MCO.** The current operational roster is **3 MCOs: BlueCare TN, UHC Community Plan, and Wellpoint TN.** Amerigroup rebranded to **Wellpoint**. AmeriHealth Caritas does not operate a TennCare contract `[Confirm via current Managed Care Contractors page](https://www.tn.gov/tenncare/providers/managed-care-contractors.html)`.

### Additional contracted entities

| Entity | Role |
|---|---|
| **TennCare Pharmacy Benefit Manager** | Currently **OptumRx** for FFS-equivalent + plan-aligned PBM `[Confirm current PBM contract holder]` |
| **CoverKids Dental** | Statewide dental admin `[Confirm — DentaQuest historically]` |
| **TennCare Select / TennCare Kids EPSDT** | Special-population MCO carve-in via BlueCare `[Confirm TennCare Select operator]` |
| **Magellan Health, Optum, Gainwell Technologies** | MMIS module operators — see §5 |

---

## 3. Medicare in TN

| Metric | Value | Source |
|---|---|---|
| Total Medicare beneficiaries (TN, Sep 2024) | ~1.4M+ | `[Confirm via [KFF Total Medicare Beneficiaries](https://www.kff.org/medicare/state-indicator/total-medicare-beneficiaries/)]` |
| MA penetration | **~58%** (above national avg; ranks among higher MA-penetration states) | `[Confirm via KFF MA Penetration]` |

**MAC assignments:**

- **A/B MAC: Palmetto GBA, Jurisdiction JJ** — TN is part of JJ (AL, GA, TN). [Palmetto JJ Part A](https://palmettogba.com/jja) · [CMS A/B MAC JJ page](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/Who-are-the-MACs-A-B-MAC-Jurisdiction-J-JJ). **Same JJ stack as GA pilot — full connector reuse from GA.**
- **DME MAC: CGS Administrators, Jurisdiction C** — TN is JC. **Drop-in reuse with all Phase 1 + Phase 2 pilots.**
- **HH+H MAC**: Palmetto GBA Southeast region `[Confirm]`.
- **National Supplier Clearinghouse:** Palmetto GBA.

**Crossover (COBA):** Medicare → CMS BCRC → TennCare MMIS → MCO encounter system (TennCare is fully managed; FFS rail is minimal).

---

## 4. Statewide Billing Entities (Who bills TennCare / Medicare)

**Critical structural note:** Because TennCare is **managed-care-only**, providers bill **MCOs directly**, not a state FFS rail. The MMIS aggregates encounters and pays capitation to MCOs.

| # | Entity Type | Workflow | Primary Payer Path |
|---|---|---|---|
| 1 | Individual practitioners (MD/DO, PA, NP, CNM, CRNA) | 837P → MCO (BlueCare, UHC Community Plan, Wellpoint) | MCO |
| 2 | Hospitals (Acute, CAH, IRF, LTACH, Psych) | 837I → MCO; Medicare A via Palmetto JJ | Both |
| 3 | FQHC + RHC | All-inclusive PPS-equivalent rate via MCO; Medicare wrap; UDS | Both |
| 4 | Behavioral Health (LPC-MHSP, LCSW, LMFT, LADAC II) + Comprehensive BH Agencies | 837P → MCO; SUD continuum + crisis services via MCO + state grants | MCO |
| 5 | Nursing facilities (NF/SNF) | UB-04/837I via MCO (CHOICES); MDS 3.0 | MCO + Medicare |
| 6 | Home health | OASIS + 837I to MCO; Palmetto JJ for Medicare | Both |
| 7 | Hospice | Per-diem via MCO; NOE/NOTR to Palmetto JJ | Both |
| 8 | Pharmacy | NCPDP D.0 → OptumRx (TennCare PBM `[Confirm]`); MCO-aligned PBMs | TennCare PBM |
| 9 | DMEPOS | 837P to CGS JC (Medicare); to MCO for TennCare | Both |
| 10 | NEMT broker | Per-MCO contracted brokers (ModivCare, etc. `[Confirm broker model]`) | MCO |
| 11 | Dental — adults (limited TennCare benefit) | 837D via MCO; CoverKids dental statewide | MCO |
| 12 | Vision (OD / optician) | 837P via MCO; eyewear vendor | MCO + Medicare |
| 13 | School-based services (LEAs) | School-based per IEP via MCO with TennCare oversight | TennCare |
| 14 | ECF CHOICES providers (employment, residential, supported living) | Service auth via MCO; 837P | TennCare |
| 15 | CHOICES HCBS providers | 837P via MCO | TennCare |
| 16 | ICF/IID | Per-diem via MCO or FFS for residual `[Confirm]` | TennCare |
| 17 | Crisis Services Agencies | TDMHSAS-contracted + MCO claims | Hybrid |
| 18 | Local Health Departments | TDH-administered + some MCO billable services | Hybrid |

> Provider enrollment routes through TennCare's central credentialing + the MCO networks. Each MCO maintains contracted networks; TennCare requires baseline enrollment.

---

## 5. MMIS Operator + Portal — TN MMIS (Multi-Vendor)

**Architecture:** Tennessee's MMIS is **modular and multi-vendor**, with no single fiscal-agent like Gainwell-on-NCTracks or Conduent-on-VAMMIS. Modules include:

- **Decision support / data warehouse / analytics:** **Optum** (formerly OptumInsight) `[Confirm current contract holder]`.
- **Provider services + claims processing / capitation:** **Gainwell Technologies** holds a TennCare MMIS contract per recent Fiscal Review Committee filings ([May 2025 FRC contract amendments](https://www.capitol.tn.gov/Archives/Joint/committees/fiscal-review/contracts/2025/05-21-25/25.%20TennCare%20%28Myers%20%26%20Stauffer%20LC%29%20Amend%202%20Redacted.pdf)).
- **Pharmacy POS / PBM:** **OptumRx** `[Confirm]`.
- **TPL / Cost-Avoidance:** Vendor `[Confirm]`.
- **EVV aggregator:** `[Confirm]`.
- **Financial / Actuarial audit:** **Myers and Stauffer LC** (per May 2025 FRC AMD#2).
- **Care management / clinical:** historically **Magellan Health** held TennCare contracts (BH, complex care) `[Confirm current Magellan scope post-Centene acquisition completion]`.

**Portal:** **TennCare Provider Portal** (provider self-service) + each MCO's portal (BCBST, UHC, Wellpoint). TennCare public site: [tn.gov/tenncare](https://www.tn.gov/tenncare.html).

### MMIS / state systems DO handle

- Encounter ingestion from 3 MCOs.
- Capitation payment to MCOs.
- Provider enrollment (baseline).
- 270/271 eligibility (via TEDS — TennCare Eligibility Determination System).
- Pharmacy POS / PBM aggregation.
- Care management / care coordination (Magellan `[Confirm]`).
- Data warehouse + T-MSIS extracts (Optum DSS `[Confirm]`).
- Audit / actuarial reviews (Myers & Stauffer).

### MMIS / state systems do NOT handle

- **Direct FFS claim adjudication** for most populations — services flow through MCOs.
- MCO-level PA — each MCC operates own UM.
- MA / Part D — out of scope.

---

## 6. MCOs / Managed-Care Org List with Current Contract Terms

### Statewide TennCare MCCs (3)

| # | Plan | Parent | Notes |
|---|---|---|---|
| 1 | **BlueCare Tennessee** | BlueCross BlueShield of Tennessee | Largest membership share; in-state nonprofit Blues plan; also operates **TennCare Select** for special populations `[Confirm Select operator]` |
| 2 | **UnitedHealthcare Community Plan of Tennessee** | UnitedHealth Group | **Operational status volatile** — major provider terminations effective 1/1/2026 ([MMC notice](https://www.mmclinic.com/uhctenncarechange)) suggesting network/contract turbulence; `[Confirm continuing TennCare contract status]` |
| 3 | **Wellpoint Tennessee** | Elevance Health | Successor brand to **Amerigroup Tennessee** under Elevance Medicaid brand consolidation |

### Specialty / ancillary

| Entity | Role |
|---|---|
| **TennCare Select** | Specialty plan for foster youth, members in select institutions, high-need populations — operated by BlueCross BlueShield of Tennessee (BlueCare network) `[Confirm scope]` |
| **CoverKids (CHIP)** | Operated through MCC network arrangements `[Confirm CoverKids operator]` |

**Contract financial / operational terms (selected):**
- Capitation actuarial certification by **Myers and Stauffer LC** (per May 2025 FRC contract amendments).
- MLR minimum **85%** per 42 CFR 438.8.
- Encounter cadence per TennCare contract `[Confirm]`.
- Network adequacy per 42 CFR 438.68 + state addenda.
- **Shared Savings Program** (TennCare III 1115 authority) — quasi-block-grant arrangement returning federal savings to state if quality + spending targets met.
- VBP targets — Tennessee Health Care Innovation Initiative (THCII): PCMH, Health Link, Episodes of Care, LTSS QuILTSS `[Confirm SFY26 targets]`.

---

## 7. Compliance / Regulatory Surface

### Federal — identical to NC baseline (HIPAA, 42 CFR 455/456/Part 2, 45 CFR 162, ONC HTI series, CMS-0057-F, HITECH, FCA, AKS, Stark).

### Tennessee State

| Statute | Subject |
|---|---|
| **Tenn. Code Title 71, Chapter 5** | Public Assistance — Medical Assistance Act + TennCare program authority (§§ 71-5-101 et seq.) |
| **Tenn. Code § 71-5-181 et seq.** | **Medicaid False Claims Act (Tennessee)** — state qui tam authority |
| **Tenn. Code § 71-5-2601** | TennCare Bureau / Office of Inspector General (TennCare OIG) — recipient fraud authority |
| **Tenn. Code Title 33** | Mental Health and Substance Abuse Services |
| **Tenn. Code Title 63** | Professional licensure (BME, BON, BOP, etc.) |
| **Tenn. Code Title 56** | Insurance — MA plans, PBM regulation |
| **Tenn. Code § 68-11-1701 et seq.** | Health Information Exchange + HIE-related provisions `[Confirm]` |

### Enforcement bodies

- **TennCare Office of Program Integrity (OPI)** — provider fraud, RAC, SUR. Tip line + portal at [TennCare PI](https://www.tn.gov/tenncare/fraud-and-abuse.html).
- **TennCare Bureau / Office of Inspector General (TennCare OIG)** — **recipient fraud** (unique structure: TN explicitly separates provider PI from recipient fraud, with TennCare OIG focused on member fraud and Medicaid eligibility abuse). [TennCare OIG site](https://www.tn.gov/finance/oig.html).
- **TN Office of the Attorney General Medicaid Fraud and Integrity Division (MFID)** — federally certified MFCU under 42 CFR 1007; provider criminal/civil prosecution ([TN AG MFID](https://www.tn.gov/attorneygeneral/working-for-tennessee/medicaid-fraud-and-integrity-division.html)).
- **TN Bureau of Investigation (TBI) Medicaid Fraud Control Division** — historically the MFCU within TBI; check current MFCU host (AG MFID vs TBI MFCD) `[Confirm — Tennessee periodically restructures MFCU host agency]`.
- **TN Comptroller of the Treasury — Division of State Audit** — performance + financial audits.
- **CMS / UPIC** — Qlarant Southeast `[Confirm]`.

**Fraud referral flow:** Provider tip / data signal → **TennCare OPI** triage → if credible criminal → referral to **OAG MFID** (or TBI MFCD `[Confirm]`). Recipient tip → **TennCare OIG** → recipient prosecution.

---

## 8. MedGuard360 Integration Plan (TN)

### 8.1 State-config-service package: `state-config/tn.json`

```jsonc
{
  "state_code": "TN",
  "medicaid_brand": "TennCare",
  "state_agency": "TENNCARE",
  "parent_dept": "F_AND_A",
  "managed_care_only": true,
  "ffs_rail_present": false, // [Confirm — minimal residual FFS]
  "mmis_modules": {
    "claims_capitation": "GAINWELL",
    "dss_analytics": "OPTUM",          // [Confirm]
    "pharmacy_pbm": "OPTUMRX",         // [Confirm]
    "actuary_audit": "MYERS_AND_STAUFFER",
    "care_mgmt": "MAGELLAN"            // [Confirm]
  },
  "mcos": ["BLUECARE_TN","UHC_CP_TN","WELLPOINT_TN"], // UHC status volatile
  "specialty_plans": ["TENNCARE_SELECT"],            // [Confirm]
  "chip_program": "COVERKIDS",
  "ab_mac": "PALMETTO_JJ",
  "dme_mac": "CGS_JC",
  "hie": "TNHIE",
  "regional_hie": "ONEPARTNER_TRICITIES",
  "mfcu_endpoint": "TN_OAG_MFID",       // [Confirm vs TBI MFCD]
  "pi_unit_provider": "TENNCARE_OPI",
  "pi_unit_recipient": "TENNCARE_OIG",
  "expansion": false,
  "expansion_effective": null,
  "section_1115_demo": "TENNCARE_III",
  "obbb_work_req_effective": "N/A" // TN has no expansion population
}
```

### 8.2 Connector inventory (reuse from NC/VA/WV where flagged ♻️; reuse from GA for Palmetto JJ ♻️)

| # | Counterparty | Direction | Transport | Reuse |
|---|---|---|---|---|
| 1 | TennCare MMIS (Gainwell module — claims/capitation) | Out + In | X12 837 EPS / 820 capitation via SFTP | **Strong Gainwell pattern reuse from NC/WV** ♻️ |
| 2 | TEDS eligibility | Out | X12 270/271 + FHIR Coverage | Pattern reuse ♻️ |
| 3 | TennCare provider enrollment | Out + In | REST + SFTP roster | Pattern reuse ♻️ |
| 4 | Optum DSS / data warehouse `[Confirm]` | Bi-dir | FHIR Bulk Data + flat-file | New |
| 5 | OptumRx (TennCare PBM) `[Confirm]` | Out | NCPDP D.0 | New BIN/PCN |
| 6 | 3 MCCs (BlueCare TN, UHC CP, Wellpoint) | Bi-dir | FHIR R4 + X12 | Per-plan OAuth2; Wellpoint partial reuse from WV (same Elevance brand) |
| 7 | TennCare Select (BlueCare) | Bi-dir | FHIR R4 + X12 | Shares BlueCare creds |
| 8 | CoverKids | Bi-dir | per program rules `[Confirm]` | New |
| 9 | Palmetto GBA JJ | Out | X12 837 via EDI-SS | **Drop-in reuse from GA** ♻️ |
| 10 | CGS JC (DME) | Out | X12 837P + CMN | **Drop-in reuse all states** ♻️ |
| 11 | TnHIE | Bi-dir | FHIR R4 + ADT + Direct | New |
| 12 | OnePartner HIE (Tri-Cities regional) | Bi-dir | FHIR R4 | New (regional supplement) |
| 13 | Per-MCO NEMT brokers (ModivCare etc.) | Bi-dir | REST + 837P | Pattern reuse ♻️ |
| 14 | TN OAG MFID (or TBI MFCD) referral | Out | REST webhook + secure email | Pattern reuse ♻️ |
| 15 | TennCare OPI fraud-alert intake (provider) | Out | REST + mTLS | Pattern reuse ♻️ |
| 16 | TennCare OIG (recipient fraud) — separate intake | Out | REST + mTLS | **NEW pattern** — TN-unique dual PI architecture |
| 17 | Myers and Stauffer (actuarial / audit) | Out | flat-file via state | n/a |
| 18 | T-MSIS extract | Out | flat-file via state | n/a |
| 19 | CMS Interop APIs (CMS-0057-F) | Bi-dir | FHIR R4 | Standard |
| 20 | DIDD legacy waiver provider feed (closed waivers) | In | flat-file | Reference only |
| 21 | DDA ECF CHOICES referral system | Bi-dir | REST | New (TN-unique) |

### 8.3 Phased rollout

1. **Phase 2a (Q3 2026):** TEDS eligibility, provider enrollment, Palmetto JJ Medicare crossover (drop-in from GA), CGS JC DME (drop-in).
2. **Phase 2b (Q4 2026):** MCC encounter forwarding, OptumRx PBM, fraud-alert handoffs to **both** TennCare OPI (provider) and TennCare OIG (recipient), MFID referral pipeline.
3. **Phase 2c (Q1 2027):** Care management / Magellan integration `[Confirm scope]`, TnHIE + OnePartner bi-directional, CMS-0057-F API conformance per MCC, ECF CHOICES referral connector.
4. **Contingency:** Monitor UHC TennCare status; if UHC exits the program, retarget Q4 2026 connector budget to remaining 2 MCCs + any new entrants per future TennCare procurement.

---

## 9. State HIE — TnHIE + Regional Networks

Tennessee has a **multi-HIE landscape**, not a single SDE:

- **TnHIE (Tennessee Health Information Exchange)** — statewide HIE; rebranded from **etHIN (East Tennessee Health Information Network)**; contains **1.7 billion+ clinical records** for **2.9M+ patients** across all 95 TN counties ([TnHIE Who We Are](https://tnhie.org/who-are-we/)). Functioning as the de facto statewide HIE.
- **OnePartner HIE** — regional HIE serving the Tri-Cities region of TN/VA; major hospitals + healthcare orgs participate ([OnePartner HIE](https://www.onepartner.com/hie/)).
- **Historical:** The **Health Information Partnership for Tennessee (HIP TN)** statewide HIE organization **disbanded** in the mid-2010s; state pivoted to **Direct Project** + regional HIEs ([Fierce Healthcare](https://www.fiercehealthcare.com/it/tennessee-hie-organization-disbands-state-opts-for-direct-project)).
- **Mandate:** **No hard statutory mandate.** Voluntary participation. TDH and TennCare encourage but do not require HIE submission for state funding.
- **TEFCA / QHIN:** `[Confirm TnHIE QHIN status — likely participates via eHealth Exchange or CommonWell]`.

**MedGuard360 `hie-service` integration:** Subscribe to TnHIE ADT events; query TnHIE for clinical documentation supporting PA/encounter validation; OnePartner secondary connector for Tri-Cities/Appalachia region. Submit MedGuard-aggregated encounter summaries per BAA + DUA.

---

## 10. Program Integrity Workflow (TN)

### 10.1 Lifecycle — **dual-track unique to TN**

1. **Detection** — TennCare OPI data analytics, MCC fraud referrals, UPIC (Qlarant `[Confirm]`), tip line, TennCare OIG recipient-fraud analytics, MedGuard360 fraud-engine alert.
2. **Triage:**
   - **Provider issues** → **TennCare OPI**
   - **Recipient eligibility/identity issues** → **TennCare OIG** (separate office under F&A)
3. **Pre-payment review hold** (via MCC) or **post-payment recoupment** (TennCare OPI initiates with MCC).
4. **Credible allegation of fraud (CAF)** under 42 CFR 455.23 → payment suspension.
5. **Referral:**
   - **Provider** → **OAG MFID** (or TBI MFCD `[Confirm]`) → criminal/civil prosecution, including under **TN Medicaid False Claims Act** (§ 71-5-181).
   - **Recipient** → TennCare OIG → district attorney general → criminal prosecution.
6. **Sanction** — termination (cross-state via T-MSIS/PECOS), exclusion, restitution.
7. **Recovery** booked state + federal per FMAP.

### 10.2 MedGuard360 fraud-engine → TN handoffs

Two distinct payload schemas:
- **Provider-fraud alert** → TennCare OPI endpoint (REST + mTLS).
- **Recipient-fraud alert** → TennCare OIG endpoint (REST + mTLS, with member-identifying evidence bundle).

Both audit-retained per Tenn. Code retention (typically 6y for Medicaid).

---

## 11. Funding & Federal Matching — FY2026 FMAP (Tennessee)

- Federal Register annual FMAP table — [89 FR / 2024-27910](https://www.federalregister.gov/documents/2024/11/29/2024-27910/federal-financial-participation-in-state-assistance-expenditures-federal-matching-shares-for) (FY2026 published 2024-11-29).
- **TN traditional FMAP FY2026:** **~65–66%** `[Confirm exact rate via [KFF FMAP](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/) / [MACPAC Exhibit 6](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)]`.
- **TN Enhanced E-FMAP (CHIP / CoverKids):** **~76%** `[Confirm]`.
- **Expansion FMAP:** **N/A** — TN has not expanded Medicaid; no 90% expansion match applies.
- **Administrative match:** 50% general; MMIS O&M 75%, MMIS DDI 90%, eligibility 75/90, fraud detection 75% per 42 CFR 433.111.
- **Shared Savings Program (TennCare III 1115)** — unique to TN: under the 10-year demonstration, TN can earn federal "shared savings" if total spend stays below capped target while quality metrics maintained. This creates a state interest in **fraud prevention** disproportionately greater than traditional FMAP economics suggest — every recovered dollar potentially leverages additional shared-savings federal claim.
- **OBBB Act (HR 1):** ends temporary enhanced ARPA expansion FMAP bonus — **no effect on TN** (no expansion).

---

## 12. Key Differences from NC + Estimated Onboarding Lift

### 12.1 Key differences vs NC pilot

| Dimension | NC | TN | Implication |
|---|---|---|---|
| Medicaid brand | NC Medicaid | **TennCare** | Highly distinct identity; member-facing UI/branding |
| Parent dept | NC DHHS / DHB | **F&A / Division of TennCare** | Finance-housed agency vs. health-housed |
| Expansion | **YES (Dec 2023)** | **NO** | Smaller adult coverage; no 90% expansion FMAP; no work-req exposure |
| MMIS architecture | Gainwell (NCTracks) consolidated | **Multi-vendor modular: Gainwell + Optum + OptumRx + Magellan + Myers&Stauffer** | More vendor integrations; partial Gainwell reuse |
| FFS rail | Significant (Medicaid Direct + carve-outs) | **Effectively none** — managed-care-only since 1994 | **Skip FFS connector — only encounter + capitation rails** |
| MCO program label | PHP (Std) + Tailored Plan + CFSP + EBCI | **MCC** (Managed Care Contractor) | Naming only |
| MCO count (operational May 2026) | 5 Std + 4 Tailored + CFSP + EBCI ≈ 11 | **3 statewide MCCs** | Lowest connector count of all pilots |
| MCO volatility | Stable post WellCare→CCH merger | **UHC TennCare contract status uncertain** (1/1/2026 provider exits) | Build with feature-flag for UHC active/inactive |
| BH carve-out | Tailored Plans (4 LME/MCOs) | **Carved IN to MCCs** | No 42 CFR Part 2 separate-plan handling |
| Tribal plan | EBCI Tribal Option | **None** (no federally recognized tribes in TN) | No IMCE integration |
| Foster care plan | CFSP (Healthy Blue Care Together) | **TennCare Select** (BlueCare-operated) `[Confirm]` | Different model |
| 1115 demonstrations | NC Medicaid Transformation + HOP (paused) | **TennCare III** — 10-year master demo through 2030 + **Shared Savings Program** | TN-unique block-grant-style mechanics |
| ECF CHOICES (I/DD) | Innovations + TBI waivers | **ECF CHOICES** — only open I/DD path; DIDD legacy waivers closed | TN-unique waiver lifecycle |
| Statutory HIE mandate | NCGS 90-414.4 (suspended) | **None** (HIP TN dissolved; multi-HIE landscape) | Voluntary HIE; multi-HIE adapter required |
| HIE vendor / network | NC HealthConnex (SAS) | **TnHIE** (statewide) + **OnePartner** (Tri-Cities) | Multi-HIE integration |
| FFS PBM | OptumRx | **OptumRx** `[Confirm]` | **Strong PBM connector reuse** ♻️ |
| State fraud statute | NCGS 108A | **Tenn. Code § 71-5-181 (TN Medicaid FCA)** | State qui tam available; parallel to VA's VFATA |
| Program Integrity structure | Single OCPI | **Dual: TennCare OPI (provider) + TennCare OIG (recipient)** | **TN-unique** — two-track alert routing required |
| MFCU host agency | NC DOJ (single track) | **OAG MFID** (or TBI MFCD — restructures periodically) `[Confirm host]` | Verify current host during onboarding |
| MFCU recovery rank | 8th nationally | `[Confirm via [HHS-OIG MFCU FY2024 report](https://oig.hhs.gov/reports/all/2025/medicaid-fraud-control-units-annual-report-fiscal-year-2024/)]` | Mid-tier likely |
| Medicare MAC | Palmetto JM | **Palmetto JJ** | **Reuse JJ connector from GA pilot** ♻️ |
| DME MAC | CGS JC | **CGS JC (same)** | **Drop-in reuse** ♻️ |
| Traditional FMAP | ~65% | **~65–66%** | Comparable economics |
| Block-grant economics | Standard FMAP | **Shared Savings adds upside** | State has elevated interest in fraud prevention beyond standard FMAP math |

### 12.2 Estimated onboarding lift

| Workstream | Effort (person-weeks) | Notes |
|---|---|---|
| `state-config-service` TN package (incl. dual-PI routing + Shared Savings + Block-Grant flags) | 4 | More complex than NC/VA/WV |
| TennCare MMIS (Gainwell module) connector | 5 | **Strong Gainwell pattern reuse from NC/WV** ♻️ |
| Optum DSS / data warehouse `[Confirm]` | 4 | New |
| OptumRx PBM | 1 | **Reuse from NC** ♻️ — same vendor/processor; new BIN/PCN |
| 3 MCCs | 7 | Per-plan OAuth2; Wellpoint partial reuse from VA/WV (same Elevance brand) |
| TennCare Select (BlueCare) | 2 | Shares BlueCare creds |
| Palmetto JJ (Medicare A/B) | 0 | **Drop-in reuse from GA** ♻️ |
| CGS JC (DME) | 0 | **Drop-in reuse** ♻️ |
| TnHIE + OnePartner (multi-HIE adapter) | 8 | New adapter pattern + 2 endpoints |
| TennCare OPI (provider) fraud-alert intake | 2 | Pattern reuse |
| TennCare OIG (recipient) fraud-alert intake | 3 | **NEW unique pattern** — recipient-fraud schema |
| OAG MFID / TBI MFCD referral pipeline | 3 | Verify host before build |
| ECF CHOICES referral (DDA) | 3 | TN-unique |
| Magellan care-mgmt integration `[Confirm scope]` | 4 | Conditional |
| End-to-end testing + CMS SMC artifacts | 7 | Modular MMIS = per-module SMC artifacts |
| Shared Savings reporting hooks (TennCare III) | 4 | TN-unique reporting |
| **Total** | **~57 person-weeks** | **~30% lighter than NC primary buildout** — gains from MCC count + skip-FFS, offset by multi-HIE + dual-PI + Shared Savings complexity |

---

## Appendix A — Primary Sources (TN)

- [TennCare Home](https://www.tn.gov/tenncare.html) · [TennCare Providers](https://www.tn.gov/tenncare/providers.html)
- [Managed Care Organizations](https://www.tn.gov/tenncare/members-applicants/managed-care-organizations.html) · [Managed Care Contractors (MCCs)](https://www.tn.gov/tenncare/providers/managed-care-contractors.html) · [TennCare Contracts](https://www.tn.gov/tenncare/information-statistics/tenncare-contracts.html)
- [TennCare Annual Report FY24](https://www.tn.gov/content/dam/tn/tenncare/documents/TennCareAnnualFY24.pdf) · [TennCare MCPAR 2025](https://www.tn.gov/content/dam/tn/tenncare/documents/2025ManagedCareProgramAnnualReport.pdf)
- [TennCare Enrollment Data](https://www.tn.gov/tenncare/information-statistics/enrollment-data.html)
- [TennCare CHOICES](https://www.tn.gov/tenncare/long-term-services-supports/choices.html) · [Employment and Community First CHOICES](https://www.tn.gov/tenncare/long-term-services-supports/employment-and-community-first-choices.html) · [DDA ECF CHOICES](https://www.tn.gov/disability-and-aging/disability-aging-programs/ecf-choices.html)
- [BlueCare Tennessee](https://www.bcbst.com/publicsites/bluecare/plans-programs/bluecaretn/)
- [MMC notice — UHC TennCare exit 1/1/2026](https://www.mmclinic.com/uhctenncarechange)
- [Fiscal Review Committee — Gainwell / Myers & Stauffer contract amendments (May 2025)](https://www.capitol.tn.gov/Archives/Joint/committees/fiscal-review/contracts/2025/05-21-25/25.%20TennCare%20%28Myers%20%26%20Stauffer%20LC%29%20Amend%202%20Redacted.pdf)
- [Medicaid.gov — TN Managed Care Profile](https://www.medicaid.gov/Medicaid/downloads/tennessee-mcp.pdf)
- [TennCare OIG (recipient fraud)](https://www.tn.gov/finance/oig.html)
- [TN AG Medicaid Fraud and Integrity Division](https://www.tn.gov/attorneygeneral/working-for-tennessee/medicaid-fraud-and-integrity-division.html)
- [TnHIE](https://tnhie.org/) · [TnHIE Who We Are](https://tnhie.org/who-are-we/) · [OnePartner HIE](https://www.onepartner.com/hie/) · [Fierce Healthcare — HIP TN dissolution](https://www.fiercehealthcare.com/it/tennessee-hie-organization-disbands-state-opts-for-direct-project)
- [Palmetto GBA JJ Part A](https://palmettogba.com/jja) · [CMS A/B MAC JJ](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/Who-are-the-MACs-A-B-MAC-Jurisdiction-J-JJ)
- [CGS DME JC](https://www.cgsmedicare.com/jc/) · [CMS DME MAC JC](https://www.cms.gov/medicare/medicare-contracting/medicare-administrative-contractors/who-are-the-macs-dme-mac-jurisdiction-c-jc)
- [Federal Register FMAP FY2026 (89 FR / 2024-27910)](https://www.federalregister.gov/documents/2024/11/29/2024-27910/federal-financial-participation-in-state-assistance-expenditures-federal-matching-shares-for) · [KFF FMAP](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/) · [MACPAC Exhibit 6](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)
- [HHS-OIG MFCU FY2024 Annual Report](https://oig.hhs.gov/reports/all/2025/medicaid-fraud-control-units-annual-report-fiscal-year-2024/)
- [TN Medicaid Eligibility 2026](https://medicaideligibilitycalculator.com/medicaid-eligibility/tennessee/)

---

*Document owner: MedGuard360 Enterprise Integrations. File: `integrations/tn-enterprise/README.md`. Cross-references: `integrations/nc-enterprise/`, `integrations/ga-enterprise/` (Palmetto JJ reuse), `integrations/va-enterprise/`, `integrations/wv-enterprise/`, `integrations/PILOT-STATES-COMPARISON.md`.*
