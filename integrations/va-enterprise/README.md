# MedGuard360 — VA Enterprise Landscape

> Reference document mapping the Virginia Department of Medical Assistance Services (DMAS), Virginia Medicaid (Cardinal Care), Medicare, and the statewide billing ecosystem. Phase 2 pilot expansion state.
>
> Last verified: 2026-05-23. Where information is fluid, items are tagged `[Confirm via …]`.

---

## 1. State Medicaid Agency

**Agency:** Virginia **Department of Medical Assistance Services (DMAS)** — single state Medicaid agency under the Health and Human Resources Secretariat. Not housed inside the Virginia Department of Health (VDH); DMAS is a peer agency. Director: Cheryl Roberts (Acting/Confirmed `[Confirm via [DMAS About](https://www.dmas.virginia.gov/about-us/)]`).

| # | Division / Office | Scope | MedGuard360 Intersection |
|---|---|---|---|
| 1 | Office of the Director | Agency leadership | n/a |
| 2 | **Division of Health Coverage Programs** | Eligibility policy, program design (Cardinal Care, FAMIS, LTSS) | Eligibility rules engine |
| 3 | **Division of Provider Services** | Provider enrollment policy, PRSS oversight | Provider connector |
| 4 | **Division of Member Services** | Member enrollment, helpline, ombudsman | Member-app integration |
| 5 | **Office of Quality and Population Health (OQPH)** | MCO contract management, value-based purchasing | MCO contract validation |
| 6 | **Office of Compliance and Integrity Services (OCIS / PI)** | Program integrity, RAC, SUR, MEDFRAUD tip line | **Direct fraud-engine recipient** |
| 7 | Office of Behavioral Health | ARTS (Addiction & Recovery Treatment Services) policy | BH/SUD claims rules |
| 8 | Division of Long Term Services and Supports (LTSS) | CCC Plus LTSS, waivers (DD, CCC+) | Waiver claims, EVV |
| 9 | Division of Aged, Blind & Disabled (ABD) | ABD eligibility | Dual-eligible coordination |
| 10 | Division of Cost Settlement & Audit | FQHC/RHC/Hospital cost reports | Cost-settlement feed |
| 11 | Division of Finance | Disbursements, FMAP claiming, CMS-64 | Financial reconciliation |
| 12 | Office of Data Analytics | Data warehouse, EHB reporting | Analytics export |
| 13 | Office of Communications + Government Affairs | External / legislative | n/a |
| 14 | Office of General Counsel | Legal, BAA review | BAA, DUA |

Peer state agencies routinely touched by MedGuard360 work in VA:
- **VDH** (Virginia Department of Health) — public health, EHR Meaningful Use, contracts with VHI for the state-designated HIE.
- **DBHDS** (Dept of Behavioral Health & Developmental Services) — operates DD waiver slot management, state hospitals, CSBs.
- **DSS** (Dept of Social Services) — local DSS offices conduct eligibility intake; **VaCMS** is the integrated eligibility system.
- **DARS** (Dept for Aging and Rehabilitative Services) — APS, VR, No Wrong Door.
- **OAG** — **Virginia Office of the Attorney General, Medicaid Fraud Control Unit (MFCU)**, see §7.

---

## 2. Virginia Medicaid — Programs & Populations

### Brand: **Cardinal Care**

DMAS unified Medicaid + FAMIS under the single **Cardinal Care** brand effective **January 1, 2023** ([Cardinal Care launch](https://www.dmas.virginia.gov/for-providers/cardinal-care-providers/)). In **2023**, the two pre-existing managed care programs (CCC Plus + Medallion 4.0) consolidated into **Cardinal Care Managed Care (CCMC)** — one statewide MCO program covering all populations including LTSS, foster care, and DD waiver members.

### Enrollment

~**2.0M** members across Medicaid + FAMIS ([DMAS Cardinal Care](https://www.dmas.virginia.gov/for-providers/cardinal-care-providers/cardinal-care-managed-care/)). `[Confirm latest via [DMAS Data Reporting](https://www.dmas.virginia.gov/data-reporting/)]`.

### Expansion

**YES — full ACA Medicaid expansion** effective **January 1, 2019** (SB 853 / HB 5002, 2018 budget). Adults 19–64 up to 138% FPL. Approximately 750K+ expansion enrollees `[Confirm via [DMAS expansion data](https://www.dmas.virginia.gov/data-reporting/)]`. **OBBB Act (HR 1)** changes — work-reporting and community-engagement requirements — phase in beginning **CY2027** per CMS implementation `[Confirm via [DMAS OBBB guidance]]`.

### Programs / sub-populations

| Population | Description |
|---|---|
| **MAGI Adults (Expansion)** | 19–64, ≤138% FPL |
| **TANF / LIFC** | Low-income families/children |
| **Pregnant Women** | Up to 205% FPL + 12-month postpartum (extended via 1115) |
| **FAMIS (CHIP)** | Children 0–18 up to 205% FPL; merged under Cardinal Care brand |
| **FAMIS MOMS** | Pregnant women 143–205% FPL |
| **FAMIS Prenatal** | Coverage regardless of immigration status (effective 2024) |
| **ABD (Aged, Blind, Disabled)** | Categorical + asset-tested |
| **LTSS / CCC Plus population** | Nursing-facility level-of-care + HCBS waiver |
| **Dual Eligibles** | See below |

### Dual eligibles

- **Full duals (QMB+, SLMB+)**, **QMB only**, **SLMB only**, **QI**, **QDWI** — standard federal categories.
- **Crossover flow:** Medicare adjudicates → CMS BCRC COBA → forwards to **MES (Medicaid Enterprise System)** → MCO if applicable (CCC Plus carve-in). Pharmacy via Part D TrOOP.
- VA does **not** operate a separate Medicare-Medicaid Plan (MMP) demonstration. Duals are served via D-SNPs aligned to Cardinal Care MCOs `[Confirm D-SNP look-alike alignment]`.

### Waivers (1915(c) HCBS) — administered via DBHDS for DD waivers, DMAS for CCC+

| Waiver | Population | Operator |
|---|---|---|
| **Commonwealth Coordinated Care Plus (CCC+) Waiver** | Aged/Disabled needing NF LOC | DMAS via MCOs |
| **Family & Individual Supports (FIS) Waiver** | DD, no 24-hour residential | DBHDS / CSBs |
| **Community Living (CL) Waiver** | DD, 24-hour residential | DBHDS / CSBs |
| **Building Independence (BI) Waiver** | DD adults capable of independent living | DBHDS / CSBs |

### 1115 demonstrations

- **Cardinal Care 1115** (formerly "Building and Transforming Coverage, Services, and Supports") — pregnancy 12-month postpartum, SUD IMD exclusion waiver (ARTS), former-foster-youth coverage extension. `[Confirm renewal status via [Medicaid.gov VA 1115](https://www.medicaid.gov/medicaid/section-1115-demonstrations/state/virginia/index.html)]`.

### Health Plans (Cardinal Care Managed Care MCOs — effective 2025-07-01)

The DMAS **December 30, 2024** Notice of Award restructured the program. Effective **July 1, 2025** through SFY2026 contract period ([SFY 2026 CCMC Contract](https://www.dmas.virginia.gov/media/jtujhlgt/sfy-2026-ccmc-contract-07-01-2025.pdf), [Bulletin](https://vamedicaid.dmas.virginia.gov/bulletin/july-1-2025-implementation-new-cardinal-care-managed-care-contract)):

1. **Aetna Better Health of Virginia**
2. **Anthem HealthKeepers Plus** (also operates the statewide **Foster Care Specialty Plan (FCSP)**)
3. **Humana Healthy Horizons in Virginia** — **NEW** plan that absorbed Molina members 7/1/2025
4. **Sentara Health Plans** (successor brand to Optima Health; Sentara acquired Virginia Premier in 2022)
5. **UnitedHealthcare of the Mid-Atlantic, Inc.**

> **Important correction vs. legacy assumptions:** The pre-2025 7-MCO roster (Aetna, Anthem, Molina, Optima, Sentara, UHC, Virginia Premier) is **superseded**. **Optima** has rebranded as **Sentara Health Plans**, **Virginia Premier** was absorbed into Sentara, **Molina exited 6/30/2025**, **Humana entered 7/1/2025**. The current operational count is **5 MCOs + 1 specialty (FCSP via Anthem)**.

### Foster Care Specialty Plan (FCSP)

Statewide FCSP launched alongside CCMC restructure 7/1/2025, administered by **Anthem HealthKeepers Plus** ([Bulletin](https://vamedicaid.dmas.virginia.gov/bulletin/july-1-2025-implementation-new-cardinal-care-managed-care-contract)). Covers children in foster care, adoption assistance, and former foster youth to 26.

---

## 3. Medicare in Virginia

| Metric | Value | Source |
|---|---|---|
| Total Medicare beneficiaries (VA, Sep 2024) | ~1.66M | `[Confirm via [KFF Total Medicare Beneficiaries](https://www.kff.org/medicare/state-indicator/total-medicare-beneficiaries/)]` |
| MA penetration | ~52% | `[Confirm via KFF MA Penetration]` |

**MAC assignments:**

- **A/B MAC: Palmetto GBA, Jurisdiction JM** — VA is part of JM (NC, SC, VA, WV). [Palmetto JM Part A](https://palmettogba.com/jma) · [CMS JM page](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/Who-are-the-MACs-A-B-MAC-Jurisdiction-M-JM). **Same MAC stack as NC pilot — full connector reuse.**
- **DME MAC: CGS Administrators, Jurisdiction C** — VA is JC (same as NC/SC/GA/WV/TN). [CGS JC](https://www.cgsmedicare.com/jc/).
- **HH+H MAC**: Palmetto GBA serves the Southeast region (incl VA) `[Confirm]`.
- **National Supplier Clearinghouse** (DMEPOS enrollment): Palmetto GBA.

**Crossover (COBA):** Medicare → CMS BCRC → MES (Cardinal Care duals) → MCO if carve-in applies.

---

## 4. Statewide Billing Entities (Who bills VA Medicaid / Medicare)

| # | Entity Type | VA Provider Type / Taxonomy | Workflow | Primary Payer Path |
|---|---|---|---|---|
| 1 | Individual practitioners (MD/DO, PA, NP, CNM, CRNA) | DMAS PT individual + NUCC taxonomy | 837P → MES (FFS) or MCO | Both |
| 2 | Hospitals (Acute, CAH, IRF, LTACH, Psych) | DMAS PT hospital | 837I → MES or MCO; Medicare A via Palmetto JM | Both |
| 3 | FQHC + RHC | DMAS PT FQHC/RHC | PPS rate; Medicare wrap; UDS | Both |
| 4 | Behavioral Health (LCSW, LPC, LMFT, LSATP) + ARTS providers | DMAS BH PT | 837P → MCO; ARTS preferred-OBOT model | Mostly Medicaid (MCO) |
| 5 | Nursing facilities (NF/SNF) | DMAS PT NF | UB-04/837I monthly; CMS MDS 3.0 | Both |
| 6 | Home health | DMAS PT HH | 837I; OASIS to Palmetto | Both |
| 7 | Hospice | DMAS PT hospice | Per-diem; NOE/NOTR to Palmetto | Both |
| 8 | Pharmacy | NCPDP-enumerated | NCPDP D.0 → Magellan Medicaid Administration (FFS PBM) `[Confirm current PBM]`; MCO via plan PBMs | Both |
| 9 | DMEPOS | DMAS PT DME | 837P to CGS JC (Medicare); to MES for Medicaid | Both |
| 10 | NEMT brokers | DMAS-contracted regional brokers | Statewide broker: **ModivCare** (legacy LogistiCare) `[Confirm current statewide broker]` | Mostly Medicaid |
| 11 | Dental | DMAS PT dental — administered through **DentaQuest** (statewide dental benefit administrator) | 837D → DentaQuest | Mostly Medicaid |
| 12 | Vision (OD / optician) | DMAS PT vision | 837P; eyewear vendor | Both |
| 13 | School-based services (LEAs) | DMAS PT LEA | Medicaid-in-schools (IEP-driven); cost recon | VA Medicaid only |
| 14 | DD waiver day support / residential | DMAS PT DD svcs | Service auth via DBHDS-licensed providers; 837P to MCO | Mostly Medicaid |
| 15 | CSBs (Community Services Boards) | DMAS PT CSB | BH + DD case mgmt; 837P to MCO | Mostly Medicaid |
| 16 | ICF/IID (Training Centers) | DMAS PT ICF/IID | Per-diem; transitioning out per Settlement Agreement | VA Medicaid only |
| 17 | Adult day health care | DMAS PT ADHC | 837P; service auth via MCO | VA Medicaid |
| 18 | EVV-required services (PCS, HHCS) | DMAS PT PCS/HHCS | Per Cures Act 1903(l); aggregator `[Confirm aggregator vendor]` | VA Medicaid |
| 19 | NEMT/Logisticare → ModivCare trips | Broker subcontracted transports | GPS-verified trip + 837P | VA Medicaid |
| 20 | Local Health Departments (LHDs) | DMAS PT LHD | Hybrid — Medicaid billable services + state-funded population health | Hybrid |

> Provider-type codes use the DMAS Provider Type taxonomy; the modernized **PRSS (Provider Services Solution)** portal is the system of record. `[Confirm current PT codes via [DMAS Provider Manuals](https://www.dmas.virginia.gov/for-providers/provider-manuals/)]`.

---

## 5. MMIS Operator + Portal — Virginia MES

**Legacy:** Virginia historically operated **VAMMIS**, with **Conduent** as the long-time fiscal-agent/MMIS operator.

**Modernization:** DMAS is replacing VAMMIS with a modular **Medicaid Enterprise System (MES)** under CMS MITA 3.0 / Streamlined Modular Certification ([MES program page](https://www.dmas.virginia.gov/for-providers/medicaid-enterprise-system/), [Transition bulletin](https://vamedicaid.dmas.virginia.gov/bulletin/dmas-transition-vammis-medicaid-enterprise-system-mes-key-functions-fee-service-providers)). Build began 2016.

**Module operators (May 2026):**
- **Core Claims / MMIS:** **Conduent** retains operation of the legacy MMIS engine pending full MES cutover `[Confirm current core-claims module vendor]`.
- **Provider Services Solution (PRSS) Portal:** **Gainwell Technologies** — provider enrollment, revalidation, maintenance, eligibility verification ([PRSS guide](https://medsolercm.com/blog/va-medicaid-provider-enrollment)).
- **Service Authorization (Service Auth Module):** **Acentra Health** — ANG Platform; new single sign-on requirement effective **April 27, 2026** ([Winter 2026 newsletter](https://vamedicaid.dmas.virginia.gov/sites/default/files/2026-02/Winter-2026-VA-Insider-Newsletter.pdf)).
- **EVV Aggregator:** `[Confirm vendor]`.
- **Pharmacy POS:** Magellan Medicaid Administration (FFS) `[Confirm]`.

**Portal:** [vamedicaid.dmas.virginia.gov](https://vamedicaid.dmas.virginia.gov/) (the MES Provider Portal — single entry point replacing the legacy Conduent VAMMIS portal). DMAS public site: [dmas.virginia.gov](https://www.dmas.virginia.gov/).

### MES DOES handle

- FFS claim adjudication for Medicaid Direct holdouts (non-MCO populations: limited residual; Cardinal Care is near-fully managed).
- Encounter ingestion from CCMC MCOs.
- Provider enrollment via PRSS — all Medicaid providers (FFS + managed-care network) per 42 CFR 438.602(b).
- 270/271 eligibility verification (real time + batch).
- Pharmacy POS for FFS via NCPDP D.0.
- Service authorization (FFS) via Acentra ANG.
- EVV aggregation for PCS/HHCS.
- Cost settlement (FQHC/RHC/Hospital/LEA).

### MES does NOT handle

- MCO claim adjudication — each MCO pays providers directly, then files encounter to MES within contractually defined window.
- MCO-level prior authorization — each plan operates its own UM (Aetna, Anthem, Humana, Sentara, UHC).
- MA / Part D — out of scope.

---

## 6. MCOs / Managed-Care Org List with Current Contract Terms

**Contract type:** Statewide risk-based capitation. **Current contract:** SFY2026 CCMC Contract effective **2025-07-01** ([Contract PDF](https://www.dmas.virginia.gov/media/jtujhlgt/sfy-2026-ccmc-contract-07-01-2025.pdf)). **Award basis:** December 30, 2024 Notice of Award (Anthem + UHC statewide); subsequent expansion to 5-MCO operational lineup including Humana absorbing Molina population.

| # | Plan | Parent | Lines of business in VA | Notes |
|---|---|---|---|---|
| 1 | **Aetna Better Health of Virginia** | CVS Health | Cardinal Care Managed Care | Incumbent |
| 2 | **Anthem HealthKeepers Plus** | Elevance Health | CCMC + **Foster Care Specialty Plan (FCSP)** statewide | Largest membership share |
| 3 | **Humana Healthy Horizons in Virginia** | Humana | CCMC | NEW 7/1/2025; absorbed Molina members |
| 4 | **Sentara Health Plans** | Sentara Healthcare (provider-led) | CCMC | Rebrand of Optima; Virginia Premier absorbed into Sentara |
| 5 | **UnitedHealthcare of the Mid-Atlantic, Inc.** | UnitedHealth Group | CCMC | Statewide award holder |

**Contract financial / operational terms (selected):**
- Capitation actuarial certification by Mercer/Optumas `[Confirm actuary]`.
- Medical Loss Ratio (MLR) minimum **85%** per 42 CFR 438.8.
- Encounter submission cadence: per CCMC contract requirements `[Confirm cadence — typically 30-day]`.
- Network adequacy: time/distance and appointment-wait standards per 42 CFR 438.68 + state addendum.
- Value-Based Payment (VBP) targets: percentage of payments to providers in APM tiers 2B+ `[Confirm SFY26 target]`.

---

## 7. Compliance / Regulatory Surface

### Federal — identical to NC baseline

HIPAA (45 CFR 160/164), 42 CFR 455 (provider screening), 42 CFR 456 (UR), 42 CFR Part 2 (SUD), 45 CFR 162 (EDI), 21st Century Cures + ONC HTI-1/2/3, CMS-0057-F (Interop + PA API), HITECH, False Claims Act, AKS, Stark.

### Virginia State

| Statute | Subject |
|---|---|
| **Va. Code Title 32.1** | Health |
| **Va. Code Title 32.1 Ch. 10** (§§ 32.1-323 to 32.1-330.04) | Medical Assistance Services — Medicaid program authority |
| **Va. Code Title 37.2** | Behavioral Health and Developmental Services |
| **Va. Code Title 38.2** | Insurance — MA plans, PBM regulation |
| **Va. Code Title 54.1** | Professional licensure (BOM, BON, BOP, BSW, BPSY, etc.) |
| **Va. Code § 32.1-313 et seq.** | Medicaid fraud / false claims |
| **Va. Code § 8.01-216.1 et seq.** | **Virginia Fraud Against Taxpayers Act (VFATA)** — state qui tam analog to FCA |
| **Va. Code § 32.1-127.1:03** | Health records privacy + HIE consent |

### Enforcement bodies

- **DMAS Office of Compliance & Integrity Services (OCIS)** — pre/post-pay review, SUR, RAC oversight, tip line **1-866-486-1971** ([DMAS Fraud Reporting](https://www.dmas.virginia.gov/about-us/program-integrity/fraud-and-abuse-reporting/)).
- **Office of the Attorney General, Medicaid Fraud Control Unit (MFCU)** — criminal/civil prosecution under federally certified MFCU ([VA OAG MFCU](https://www.oag.state.va.us/programs-initiatives/medicaid-fraud-control-unit)). Funded ~75% federal / 25% state per 42 CFR 1007.
- **Virginia Office of the State Inspector General (OSIG)** — agency oversight, includes Medicaid program audits.
- **Auditor of Public Accounts (APA)** — annual state audit.
- **CMS / UPIC** — Qlarant is the UPIC for the Southeast (covering VA) `[Confirm current UPIC contract]`.

**Fraud referral flow:** Tip / data signal → **OCIS** triage → if credible criminal allegation → referral to **OAG MFCU** → prosecution + restitution. CMS T-MSIS reporting parallel.

---

## 8. MedGuard360 Integration Plan (VA)

### 8.1 State-config-service package: `state-config/va.json`

```jsonc
{
  "state_code": "VA",
  "medicaid_brand": "Cardinal Care",
  "state_agency": "DMAS",
  "mmis_portal": "https://vamedicaid.dmas.virginia.gov/",
  "mco_program": "CCMC",
  "mcos": ["AETNA_VA","ANTHEM_HKP","HUMANA_HH_VA","SENTARA_HP","UHC_MIDATL"],
  "specialty_plans": ["FCSP_ANTHEM"],
  "ffs_pbm": "MAGELLAN_RX",  // [Confirm]
  "dental_admin": "DENTAQUEST",
  "nemt_broker_statewide": "MODIVCARE", // [Confirm]
  "ab_mac": "PALMETTO_JM",
  "dme_mac": "CGS_JC",
  "hie": "VHI_CONNECTVIRGINIA",
  "mfcu_endpoint": "VA_OAG_MFCU",
  "pi_unit": "DMAS_OCIS",
  "service_auth_module": "ACENTRA_ANG",
  "evv_aggregator": "[CONFIRM]",
  "expansion": true,
  "expansion_effective": "2019-01-01",
  "obbb_work_req_effective": "2027-01-01" // [Confirm phase-in]
}
```

### 8.2 Connector inventory (reuse from NC where flagged ♻️)

| # | Counterparty | Direction | Transport | Reuse |
|---|---|---|---|---|
| 1 | VA MES (FFS claims) | Out + In | X12 837/835/277CA via SFTP | New |
| 2 | VA MES (eligibility) | Out | X12 270/271 + FHIR Coverage | Pattern reuse ♻️ |
| 3 | VA MES (PA via Acentra ANG) | Out | REST + FHIR PAS | New (SSO 4/27/2026) |
| 4 | VA PRSS (Gainwell) | Out + In | REST + SFTP roster | New |
| 5 | VA MES (encounters) | Out | X12 837 EPS | Pattern reuse ♻️ |
| 6 | CCMC MCOs ×5 | Bi-dir | FHIR R4 + X12 | Per-plan OAuth2 |
| 7 | FCSP (Anthem) | Bi-dir | FHIR R4 + X12 | Shares Anthem creds |
| 8 | Palmetto GBA JM | Out | X12 837 via EDI-SS | **Drop-in reuse from NC** ♻️ |
| 9 | CGS JC (DME) | Out | X12 837P + CMN | **Drop-in reuse from NC/SC/GA** ♻️ |
| 10 | Magellan Rx (FFS PBM) | Out | NCPDP D.0 | New BIN/PCN |
| 11 | DentaQuest VA | Out | 837D | New |
| 12 | VHI (ConnectVirginia HIE) | Bi-dir | FHIR R4, C-CDA, HL7v2 ADT (ENS) | New |
| 13 | ModivCare VA | Bi-dir | REST + 837P | Pattern reuse ♻️ |
| 14 | OAG MFCU referral | Out | REST webhook + secure email | Pattern reuse ♻️ |
| 15 | OCIS fraud-alert intake | Out | REST + mTLS | Pattern reuse ♻️ |
| 16 | T-MSIS extract | Out | flat-file via state | n/a |
| 17 | CMS Interop APIs (per CMS-0057-F) | Bi-dir | FHIR R4 | Standard |

### 8.3 Phased rollout

1. **Phase 2a (Q3 2026):** Eligibility (270/271), provider enrollment (PRSS) read-only, Palmetto JM Medicare crossover (already built), CGS JC DME (already built).
2. **Phase 2b (Q4 2026):** FFS claims (837), MCO encounter forwarding, fraud-alert handoff to OCIS, MFCU referral pipeline.
3. **Phase 2c (Q1 2027):** Service authorization (Acentra ANG with SSO), HIE bi-directional (VHI ConnectVirginia), CMS-0057-F Patient/Provider/Payer/PA APIs for each MCO partner.

---

## 9. State HIE — Virginia Health Information / ConnectVirginia

- **Authority:** **Virginia Health Information (VHI)** — nonprofit contracted by **VDH** as the state-designated HIE entity ([VHI](https://www.vhi.org/), [About VHI](https://www.vhi.org/about/)).
- **Brand for HIE service:** **ConnectVirginia HIE** (became a program of VHI after the 2022 merger of VHI + ConnectVirginia, Inc. ([Merger PR](https://www.vhi.org/Media/pressreleases/pdf/VHI%20CVHIE%20Merger%20Press%20Release.pdf))).
- **National network:** VHI announced intent to participate in **eHealth Exchange's QHIN** under TEFCA ([eHealth Exchange announcement](https://ehealthexchange.org/ehealth-exchange-and-virginia-health-information-announce-qhin-intentions/)).
- **Mandate:** **No hard statutory mandate.** Voluntary participation, with VDH funding + grant support. Not analogous to NC HIEA's NCGS 90-414.4 mandate.
- **Services:**
  - Emergency Department Care Coordination (EDCC) — statewide, MCO + DMAS-supported.
  - Public Health Reporting Pathway (ELR, eCR, immunization to VDH).
  - Advance Care Planning Registry.
  - Bi-directional record query.
  - **All Payer Claims Database (APCD)** — operated by VHI under separate statutory authority.
  - Hospital Discharge dataset.
- **MedGuard360 `hie-service` integration:** Subscribe to EDCC ADT events; query ConnectVirginia for clinical documentation supporting PA decisions; submit MedGuard-aggregated encounter summaries per BAA + DUA.

---

## 10. Program Integrity Workflow (VA)

### 10.1 Lifecycle

1. **Detection** — DMAS OCIS data analytics, UPIC (Qlarant `[Confirm]`), tip line (1-866-486-1971), OSIG, APA, MedGuard360 fraud-engine alert.
2. **Triage** at OCIS: clinical + statistical, SUR sampling, RAC scope.
3. **Pre-payment review hold** (claim suspend) or **post-payment recoupment**.
4. **Credible allegation of fraud (CAF)** under 42 CFR 455.23 → payment suspension.
5. **Referral** to **OAG MFCU** for criminal/civil prosecution (including under **VFATA**, Va. Code § 8.01-216.1).
6. **Sanction** — termination (cross-state via T-MSIS/PECOS), exclusion, restitution.
7. **Recovery** booked state + federal per FMAP.

### 10.2 MedGuard360 fraud-engine → OCIS handoff

Same alert payload schema as NC OCPI handoff; transport: signed JSON over mTLS REST to OCIS ingestion endpoint `[Confirm endpoint via DMAS IT]`. SLA: high-severity within 4h; routine batched daily. WORM audit retention per Va. Code retention schedule (typically 6y for Medicaid).

---

## 11. Funding & Federal Matching — FY2026 FMAP (Virginia)

- Federal Register annual FMAP table — [89 FR / 2024-27910](https://www.federalregister.gov/documents/2024/11/29/2024-27910/federal-financial-participation-in-state-assistance-expenditures-federal-matching-shares-for) (FY2026 published 2024-11-29).
- **VA traditional FMAP FY2026:** **~51.32%** (VA is one of the wealthier states and historically sits near the 50% floor; recent rates have ranged 50.00%–56.20%) `[Confirm exact rate via [KFF FMAP State Indicator](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/) / [MACPAC Exhibit 6](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)]`.
- **VA Enhanced E-FMAP (CHIP / FAMIS):** **~65.92%** = traditional + 30% × (100 − traditional) capped at 85% `[Confirm]`.
- **Expansion FMAP:** **90% federal / 10% state** — applies to the expansion population. VA expansion statute imposes a **hospital provider assessment** to fund the 10% state share rather than general fund.
- **Administrative match:** 50% general; MMIS O&M 75%, MMIS DDI 90%, eligibility systems 75/90, fraud detection 75% per 42 CFR 433.111.
- **OBBB Act (HR 1):** ends temporary enhanced ARPA expansion FMAP bonus (no current impact in VA — bonus already expired); work-requirement implementation due CY2027.

---

## 12. Key Differences from NC + Estimated Onboarding Lift

### 12.1 Key differences vs NC pilot

| Dimension | NC | VA | Implication |
|---|---|---|---|
| Medicaid brand | NC Medicaid | **Cardinal Care** (unified Medicaid + FAMIS) | Single brand simplifies member-facing UI |
| Expansion | Dec 2023 | **Jan 2019** (5y earlier) | VA expansion population more mature; less rapid-growth turbulence |
| MMIS operator | Gainwell (NCTracks); Optum PDM 2026 | **Conduent (legacy MMIS) + Gainwell (PRSS) + Acentra (ServAuth) — modular MES** | Multi-vendor integration; more endpoints, more SSO |
| MCO program label | PHP (Std) + Tailored Plan + CFSP + EBCI | **CCMC + FCSP** (no separate BH carve-out plan; no tribal plan) | Simpler — all populations in one MCO program |
| BH carve-out | **Yes (4 Tailored Plans)** | **No** — integrated within CCMC MCOs | No 42 CFR Part 2 separate-plan handling |
| Tribal plan | EBCI Tribal Option | None | No IMCE integration needed |
| MCO count (operational May 2026) | 5 Std + 4 Tailored + CFSP + EBCI ≈ 11 | **5 CCMC + 1 FCSP = 6 plan products** | Half the connector count |
| Foster care plan | CFSP (Healthy Blue Care Together) | **FCSP (Anthem statewide)** | Single MCO carrier |
| Major 2025–26 churn | Tailored launch '24, CFSP '25, HOP pause '25 | **MCO rebid 7/1/2025** (Molina out, Humana in) | Already-stabilized network |
| 1115 waiver footprint | HOP (paused) | Cardinal Care 1115 (ARTS, pregnancy 12mo PP, foster ext) | Less SDOH pilot complexity |
| Statutory HIE mandate | NCGS 90-414.4 (suspended) | **None** | Voluntary HIE; no enforcement layer |
| HIE vendor | SAS Institute | **VHI/ConnectVirginia** (intends QHIN via eHealth Exchange) | Different platform; standard FHIR endpoints |
| FFS PBM | OptumRx | **Magellan Rx Mgmt** `[Confirm]` | NCPDP D.0 standard reusable |
| Dental admin | per-MCO | **DentaQuest statewide** | Single 837D endpoint |
| State fraud statute | NCGS 108A | **Va. Code § 32.1-313 + VFATA § 8.01-216.1** | VFATA qui tam parallel — increases plaintiff-bar referrals |
| MFCU recovery rank | 8th nationally | `[Confirm rank via HHS-OIG MFCU FY2024 data]` | Lower recovery profile likely → routine alert cadence |
| Medicare MAC | Palmetto JM | **Palmetto JM (same)** | **Drop-in reuse** ♻️ |
| DME MAC | CGS JC | **CGS JC (same)** | **Drop-in reuse** ♻️ |
| Traditional FMAP | ~65% | **~51%** (VA is much wealthier) | Higher state-share burden → lower price sensitivity to MMIS modular cost-share |

### 12.2 Estimated onboarding lift

| Workstream | Effort (person-weeks) | Notes |
|---|---|---|
| `state-config-service` VA package | 3 | Rule data + reference tables |
| MES FFS claims connector | 8 | New EDI envelope; Conduent + MES portal model |
| PRSS (Gainwell) provider connector | 4 | REST + SFTP roster |
| Acentra ANG service-auth connector + SSO (4/27/2026) | 5 | New SSO/SAML cert |
| 5 MCO connectors + 1 FCSP | 10 | Per-plan OAuth2; partial Anthem/UHC reuse from NC |
| Palmetto JM (Medicare A/B) | 0 | **Drop-in reuse** ♻️ |
| CGS JC (DME) | 0 | **Drop-in reuse** ♻️ |
| Magellan Rx FFS PBM | 3 | New BIN/PCN |
| DentaQuest VA | 2 | New 837D endpoint |
| VHI/ConnectVirginia HIE | 6 | FHIR R4 + ADT subscription + APCD reference data |
| OCIS fraud-alert intake | 2 | Same schema, new endpoint |
| OAG MFCU referral pipeline | 2 | Same schema, new endpoint |
| VFATA qui tam evidence-bundle template | 1 | New legal template |
| OBBB work-req reporting (CY2027 phase-in) | 6 | Defer until CMS guidance final |
| End-to-end testing + CMS SMC artifacts | 8 | Streamlined Modular Certification per module |
| **Total** | **~60 person-weeks** | **~30–40% lighter than NC primary buildout** thanks to MAC + DME drop-in reuse and simpler MCO/BH topology |

---

## Appendix A — Primary Sources (VA)

- [DMAS Home](https://www.dmas.virginia.gov/) · [DMAS Provider Portal — vamedicaid.dmas.virginia.gov](https://vamedicaid.dmas.virginia.gov/)
- [Cardinal Care Providers](https://www.dmas.virginia.gov/for-providers/cardinal-care-providers/) · [Cardinal Care Managed Care](https://www.dmas.virginia.gov/for-providers/cardinal-care-providers/cardinal-care-managed-care/)
- [July 1, 2025 CCMC Implementation Bulletin](https://vamedicaid.dmas.virginia.gov/bulletin/july-1-2025-implementation-new-cardinal-care-managed-care-contract)
- [SFY 2026 CCMC Contract PDF](https://www.dmas.virginia.gov/media/jtujhlgt/sfy-2026-ccmc-contract-07-01-2025.pdf)
- [Virginia Cardinal Care Member Site](https://www.virginiamanagedcare.com/en)
- [DMAS MES Program](https://www.dmas.virginia.gov/for-providers/medicaid-enterprise-system/) · [Transition Bulletin](https://vamedicaid.dmas.virginia.gov/bulletin/dmas-transition-vammis-medicaid-enterprise-system-mes-key-functions-fee-service-providers)
- [Winter 2026 Acentra/DMAS Newsletter (PDF)](https://vamedicaid.dmas.virginia.gov/sites/default/files/2026-02/Winter-2026-VA-Insider-Newsletter.pdf)
- [Interoperability and PA Final Rule Bulletin](https://vamedicaid.dmas.virginia.gov/bulletin/interoperability-and-prior-authorization-final-rule-implementation-update)
- [VA OAG Medicaid Fraud Control Unit](https://www.oag.state.va.us/programs-initiatives/medicaid-fraud-control-unit)
- [DMAS Fraud Reporting](https://www.dmas.virginia.gov/about-us/program-integrity/fraud-and-abuse-reporting/)
- [Virginia Health Information (VHI)](https://www.vhi.org/) · [ConnectVirginia HIE](https://www.vhi.org/connectvirginia/) · [VHI/ConnectVirginia merger](https://www.vhi.org/Media/pressreleases/pdf/VHI%20CVHIE%20Merger%20Press%20Release.pdf)
- [eHealth Exchange + VHI QHIN intent](https://ehealthexchange.org/ehealth-exchange-and-virginia-health-information-announce-qhin-intentions/)
- [Palmetto GBA JM Part A](https://palmettogba.com/jma) · [CMS A/B MAC JM](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/Who-are-the-MACs-A-B-MAC-Jurisdiction-M-JM)
- [CGS DME JC](https://www.cgsmedicare.com/jc/) · [CMS DME MAC JC](https://www.cms.gov/medicare/medicare-contracting/medicare-administrative-contractors/who-are-the-macs-dme-mac-jurisdiction-c-jc)
- [Federal Register FMAP FY2026 (89 FR / 2024-27910)](https://www.federalregister.gov/documents/2024/11/29/2024-27910/federal-financial-participation-in-state-assistance-expenditures-federal-matching-shares-for) · [KFF FMAP](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/) · [MACPAC Exhibit 6](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)
- [Statewise — VA's July 2025 MCO Rebid](https://statewise.com/blog/virginias-july-2025-mco-rebid-what-cardinal-care-providers-need-to-know)
- [Anthem VA July 2025 Cardinal Care notice (PDF)](https://providers.anthem.com/docs/gpp/VA_CAID_NewCardinalCare25.pdf?v=202506062151)

---

*Document owner: MedGuard360 Enterprise Integrations. File: `integrations/va-enterprise/README.md`. Cross-references: `integrations/nc-enterprise/`, `integrations/PILOT-STATES-COMPARISON.md`.*
