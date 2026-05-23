# MedGuard360 — SC Enterprise Landscape

> Reference document mapping the South Carolina DHHS, SC Medicaid (Healthy Connections), Medicare, and statewide billing ecosystem, and showing where MedGuard360 sits as a fraud-prevention + billing platform. Pilot states: NC (primary), **SC**, GA.
>
> Last verified: 2026-05-22. Where information is fluid, items are tagged `[Confirm via …]`.

---

## 1. SC DHHS Organizational Map

The **South Carolina Department of Health and Human Services (SCDHHS)** is South Carolina's single state Medicaid agency under 42 CFR 431.10 ([SCDHHS Home](https://www.scdhhs.gov/)). Director (cabinet, Governor-appointed): Eunice Medina `[Confirm via SCDHHS leadership page](https://www.scdhhs.gov/)`.

**Major 2024 reorganization context:** Effective **July 1, 2024**, the former SC Department of Health and Environmental Control (DHEC) was split by statute into the **SC Department of Public Health (DPH)** and the **SC Department of Environmental Services (SCDES)**. DHEC's retail-food and milk/dairy programs migrated to the SC Department of Agriculture. The DHEC Board was abolished and both successor agencies are now part of the Governor's cabinet ([DPH DHEC Restructuring](https://dph.sc.gov/about/dhec-restructuring), [SCDES DHEC Restructuring](https://www.des.sc.gov/about-scdes/dhec-restructuring), [Post and Courier](https://www.postandcourier.com/health/dhec-sc-split-public-health-environmental-protection-2024/article_be235efc-280e-11ef-b881-e701c49e111a.html), [SCHA brief](https://scha.org/news/sc-dhec-restructuring-what-you-need-to-know/)). **SCDHHS continues to run Medicaid** — Medicaid was not affected by the DHEC split.

| # | Agency / Division / Office | Acronym | Mission / Scope | Claims / Service Flow | MedGuard360 Intersection |
|---|---|---|---|---|---|
| 1 | SC Department of Health and Human Services | **SCDHHS** | Single state Medicaid agency (Healthy Connections), CHIP, MAGI eligibility, Long-Term Services & Supports | All Medicaid claims (FFS via SCMMIS + MCO encounters) | **Primary integration target.** Claims, eligibility, PA, fraud |
| 2 | SCDHHS Healthcare Services Division | | Medical policy, benefit design, MCO oversight | Standard benefits, EPSDT, prescription drugs | Benefit-rule lookup, drug formulary |
| 3 | SCDHHS Eligibility, Enrollment and Member Services | | MAGI/non-MAGI eligibility, member contact center (888-549-0820) | Eligibility intake via Citizen Portal `apply.scdhhs.gov` | Eligibility-service connector |
| 4 | SCDHHS Long Term Care & Behavioral Health | | LTSS, HCBS waivers, BH integration | Nursing facility, HCBS waivers, BH services | LTSS billing oversight, BH carve-in workflows |
| 5 | SCDHHS Office of General Counsel | | Legal, BAA, contracts | n/a | BAA + DUA review |
| 6 | SCDHHS Office of Compliance / Division of Program Integrity, Surveillance and Utilization Review (**DPISUR**) | DPISUR | Provider screening, fraud/waste/abuse, RAC, SUR, MCO oversight | Pre/post-pay reviews | **Direct downstream consumer of fraud-engine alerts** ([SCDHHS Bureau of Compliance](https://www.scdhhs.gov/site-page/bureau-compliance-and-performance-review)) |
| 7 | SCDHHS Office of Finance | | Federal matching draws, MCO capitation | All Medicaid disbursements | Financial reconciliation feed |
| 8 | SCDHHS Information Technology | | IT, SCMMIS oversight, security | All systems incl. SCMMIS | API gateway, identity federation |
| 9 | SC Department of Public Health (DPH) — post-DHEC successor | DPH | Communicable disease, WIC, maternal/child, immunizations, healthcare quality, vital records | Title V, vaccines, vital records; LHD Medicaid clinical claims | Public health reporting (ELR/eCR), death-match feeds |
| 10 | SC Department of Environmental Services (SCDES) — post-DHEC | SCDES | Environmental programs | n/a | n/a |
| 11 | SC Department of Mental Health (DMH) | SCDMH | State mental hospitals + community MH centers | Bills Medicaid FFS/MCO + state-funded | BH provider-type, facility licensure |
| 12 | SC Department of Disabilities and Special Needs (DDSN) | DDSN | I/DD, HASCI (head/spinal injury), case mgmt, waiver operating agency | Operates 1915(c) HCBS waivers (ID/RD, Community Supports, HASCI) | HCBS waiver claim oversight |
| 13 | SC Department on Aging | SCDOA | Older Americans Act, family caregiver, ombudsman | Some Medicaid waiver overlap; CLTC operates ABD waivers | LTSS waiver coordination |
| 14 | SC Department of Alcohol and Other Drug Abuse Services | DAODAS | SUD treatment authority, county-affiliate SUD providers | OTP, MAT, SUD residential billing | 42 CFR Part 2 consent, SUD billing |
| 15 | SC Department of Social Services | SCDSS | Child welfare, APS, TANF, foster care | Foster-care medical (separate FC plan via Select Health) | Foster-care eligibility cross-walk |
| 16 | SC Department of Insurance | SCDOI | Insurance + MCO solvency oversight | MCO financial filings | MCO directory verification |
| 17 | SC Department of Labor, Licensing and Regulation | LLR | Professional licensure (medical, nursing, etc.) | Upstream of Medicaid provider enrollment | Provider license verification |
| 18 | DPH — Bureau of Health Facilities Licensing | | Licenses hospitals, NF/SNF, ACH, home health, hospice (post-DHEC) | Licensure data upstream of Medicaid enrollment | Facility license verification |
| 19 | SC Revenue and Fiscal Affairs Office (RFA) | RFA | State data analytics, HIE strategy committee host | HIE governance | HIE policy alignment ([RFA HIE Strategy](https://rfa.sc.gov/media/7123)) |
| 20 | SC AG — Medicaid Fraud Control Unit (VAMPF + MRFU) | MFCU | Criminal/civil prosecution of provider + recipient Medicaid fraud | See §7 | **Fraud-engine handoff target** |

---

## 2. SC Medicaid — Healthy Connections — Programs & Populations

### Total enrollment

- **~994,159** South Carolinians covered by Medicaid/CHIP as of **October 2025** ([CMS Oct 2025 Medicaid/CHIP Enrollment Highlights](https://www.medicaid.gov/medicaid/national-medicaid-chip-program-information/medicaid-chip-enrollment-data/october-2025-medicaid-chip-enrollment-data-highlights)). Current rolling figure `[Confirm via SCDHHS Medicaid Enrollment Dashboard](https://www.scdhhs.gov/partners/reports-and-statistics/medicaid-enrollment-dashboard)`.
- **SC has NOT expanded Medicaid** under the ACA. Non-elderly adults without dependent children up to 138% FPL remain ineligible ([KFF Expansion Status](https://www.kff.org/medicaid/status-of-state-medicaid-expansion-decisions/)).

### Program brand

**Healthy Connections** is SC Medicaid's consumer brand ([SCDHHS](https://www.scdhhs.gov/)). The managed-care brand is **Healthy Connections Choices** (administered via the enrollment broker; `scchoices.com`).

### Sub-populations

| Population | Description | Eligibility Hook |
|---|---|---|
| **Family & Children (MAGI)** | Parents/caretakers (very low income; ~67% FPL parent threshold) + children | MAGI |
| **Partners for Healthy Children (CHIP)** | Title XXI; children up to ~213% FPL (separate or M-CHIP) `[Confirm](https://www.scdhhs.gov/)` | MAGI |
| **Pregnant Women** | Coverage up to ~199% FPL pregnancy + 12-month postpartum (per 2022 SPA) | MAGI |
| **Aged, Blind, Disabled (ABD)** | Age 65+, blind, disabled | Categorical + asset-tested |
| **Family Planning Waiver** | Limited-benefit family planning | Income-based |
| **Working Disabled** | TEFRA / Working Disabled (TWD) | Disability + earnings |
| **No expansion population** | Non-disabled, non-parent adults 19–64 generally ineligible | — |
| **Dual Eligibles** | Medicare + Medicaid (see below) | |

### Dual eligibles — major 2026 change

- **Healthy Connections Prime** (SC's CMS Financial Alignment Initiative MMP for full duals) **ended Jan 1, 2026**. Members were transitioned to standard D-SNP coverage paired with Medicaid wrap ([Healthy Connections Prime](https://www.scdhhs.gov/partners/managed-care/healthy-connections-prime)).
- Also effective **Jan 1, 2026**: Healthy Connections members residing in **nursing facilities** were added to the MCO service delivery model — previously FFS ([SCDHHS — Healthy Connections Managed Care Carve-in](https://www.scdhhs.gov/partners/managed-care/managed-care-carve)).
- Standard dual-eligible categories (QMB, SLMB, QI, QDWI) follow federal definitions; Medicare adjudicates first, COBA forwards to SCMMIS.

### Waivers

| Waiver | Authority | Population | Operating Agency |
|---|---|---|---|
| **ID/RD** (Intellectual Disability / Related Disabilities) | 1915(c) HCBS | I/DD | DDSN |
| **Community Supports** | 1915(c) HCBS | I/DD adults | DDSN |
| **HASCI** (Head and Spinal Cord Injury) | 1915(c) HCBS | TBI/SCI | DDSN |
| **Community Choices** | 1915(c) HCBS | Aged/disabled | SCDHHS Community Long Term Care (CLTC) |
| **HIV/AIDS Waiver** | 1915(c) HCBS | HIV/AIDS | SCDHHS CLTC |
| **Mechanical Ventilator Dependent** | 1915(c) HCBS | Vent-dependent | SCDHHS CLTC |
| **Healthy Connections Prime (ended 2026)** | 1115/1915(b)(c) MMP | Full duals | Closed |
| **Pathways to Independence / SCDHHS 1115** demos | 1115 | Various | `[Confirm current 1115 portfolio via [Medicaid.gov state profile](https://www.medicaid.gov/state-overviews/stateprofile.html?state=south-carolina)]` |

> SC pursued an 1115 work-requirement demonstration ("Healthy Connections Works") historically; current status `[Confirm via SCDHHS]`.

### Managed Care Organizations (MCOs) — 5 plans

Most Healthy Connections Medicaid members are enrolled in one of five MCOs ([SCDHHS Managed Care](https://www.scdhhs.gov/members/healthy-connections-medicaid-managed-care), [SCChoices Plan Comparison PDF](https://www.scchoices.com/Documents/SC1/HealthPlanComparisonChartEnglish.PDF)):

1. **Absolute Total Care** (Centene subsidiary; also operates separate foster-care plan in SC)
2. **First Choice by Select Health of SC** (AmeriHealth Caritas / Independence Health Group; longest-standing SC plan)
3. **Healthy Blue of SC** (BlueChoice HealthPlan of SC / Elevance Health affiliate)
4. **Humana Healthy Horizons in SC**
5. **Molina Healthcare of SC**

> BH/SUD is largely **integrated** within the MCOs (no separate BH carve-out plan analogous to NC Tailored Plans). Foster-care population served via a separate Select Health-operated plan `[Confirm SCDHHS]`.

---

## 3. Medicare in SC

| Metric | Value | Source |
|---|---|---|
| Total Medicare beneficiaries (SC, Sep 2024) | ~1,228,325 | [healthinsurance.org Medicare in SC](https://www.healthinsurance.org/medicare/south-carolina/) |
| Medicare Advantage share | ~46–47% | same / [KFF MA 2024](https://www.kff.org/medicare/issue-brief/medicare-advantage-in-2024-enrollment-update-and-key-trends/) |

**Parts:**
- **Part A** (Hospital) — Palmetto GBA **JM**
- **Part B** (Physician/Outpatient) — Palmetto GBA **JM**
- **Part C** (MA) — private plans
- **Part D** (Drug) — private PDPs/MA-PDs

**MAC assignments (SC):**
- **A/B MAC: Palmetto GBA, Jurisdiction JM** (NC, SC, VA, WV) — [Palmetto JM Part A](https://palmettogba.com/jma), [CMS JM page](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/Who-are-the-MACs-A-B-MAC-Jurisdiction-M-JM). **Same MAC as NC.**
- **DME MAC: CGS Administrators, Jurisdiction C** — covers SC ([CMS DME JC](https://www.cms.gov/medicare/medicare-contracting/medicare-administrative-contractors/who-are-the-macs-dme-mac-jurisdiction-c-jc), [CGS JC](https://www.cgsmedicare.com/jc/)). JC covers AL, AR, CO, FL, GA, LA, MS, NC, NM, OK, PR, SC, TN, TX, VI, VA, WV. **Same DME MAC as NC.**
- **HH+H MAC**: Palmetto GBA Southeast region `[Confirm]`.
- **National Supplier Clearinghouse** (DMEPOS enrollment): Palmetto GBA (national).

**Crossover (COBA):** Medicare → CMS BCRC → SCMMIS via 837 with COBA flag → SCMMIS adjudicates cost-share.

---

## 4. Statewide Billing Entities (Who bills SC Medicaid / Medicare)

| # | Entity Type | SC Provider Specialty/Taxonomy | Typical Workflow | Primary Payer Path |
|---|---|---|---|---|
| 1 | Individual practitioners | MD/DO, PA, NP, CRNA, CNM | 837P → SCMMIS (FFS) or MCO; Medicare via Palmetto JM B | Both |
| 2 | Hospitals (acute / CAH / LTACH / IRF / psych) | UB-04 TOB 11x/12x/13x | 837I → Medicare A or SCMMIS/MCO | Both |
| 3 | FQHC + RHC | PPS rate; UDS reporting | All-inclusive PPS; cost report cost settlement | Both |
| 4 | Behavioral health (LISW-CP, LPC, LMFT, LPC-S, LAC) + PRTFs | 837P / 837I | Integrated within MCO; some state DMH-funded FFS | Mostly SC Medicaid |
| 5 | Nursing facilities (NF/SNF), Community Residential Care Facilities (CRCFs) | UB-04 / 837I monthly | Per-diem; effective Jan 2026 NF carve-in to MCO | Both |
| 6 | Home health | OASIS + 837I | Palmetto HH for Medicare; SCMMIS/MCO for Medicaid | Both |
| 7 | Hospice | Per-diem; NOE/NOTR | Palmetto for Medicare; SCMMIS/MCO Medicaid | Both |
| 8 | Pharmacy (indep / chain / LTC / specialty / 340B) | NCPDP | NCPDP D.0 real-time to MCO PBMs / Medicaid POS (Magellan historically `[Confirm current SC PBM]`); Medicare D via plan PBMs | Both |
| 9 | DMEPOS suppliers | NSC + Medicaid enrollment | 837P to CGS JC; 837P to SCMMIS or MCO | Both |
| 10 | NEMT brokers + transport | NEMT contractor (currently ModivCare statewide `[Confirm]`) | Trip auth + 837P | Mostly Medicaid |
| 11 | Dental | 837D | SCMMIS / DentaQuest (MCO subcontractor) | Mostly Medicaid |
| 12 | Vision (OD / optician) | 837P + eyewear vendor | SCMMIS/MCO | Both |
| 13 | School-based services (LEAs) | Specialized PT | IEP-driven; cost reconciliation | SC Medicaid only |
| 14 | HCBS waiver providers (DDSN: ID/RD, CS, HASCI) | DDSN-credentialed | Service plan via DDSN; 837P to SCMMIS | SC Medicaid only |
| 15 | Community Long Term Care (Community Choices, HIV/AIDS, Vent) | SCDHHS CLTC | Care plan + 837P/I | SC Medicaid only |
| 16 | Early Intervention / BabyNet (IDEA Part C) | DHHS BabyNet | EI billable services | Hybrid |
| 17 | Public health departments / DPH clinics | LHD | Clinical services billable | Hybrid |
| 18 | Crisis / mobile crisis (DMH community MH centers) | DMH | MCO + state-funded | Mostly MCO |
| 19 | ICF/IID | DDSN-licensed | Per-diem to SCMMIS | SC Medicaid only |
| 20 | Community Residential Care Facilities (CRCF) | DPH-licensed | Optional State Supplementation + Medicaid PCS | Hybrid |
| 21 | SUD treatment (OTPs, MAT, SUD residential) | DAODAS network | MCO; 42 CFR Part 2 consent | MCO |
| 22 | Foster-care medical | Select Health Foster Care plan | Plan-specific | SC Medicaid |

> Provider-type codes use SCMMIS provider specialty taxonomy. `[Confirm exact codes via [SCDHHS Provider Manuals](https://provider.scdhhs.gov/internet/index.html)]`.

---

## 5. SCMMIS Service Boundary

**Operator/fiscal agent:** SCMMIS provider portal and EDI infrastructure are operated under SCDHHS contract. Provider EDI support is operated via the **South Carolina Center at BCBS-SC** (EDIG.OPS-MCAID@BCBSSC.COM, 888-289-0709); SCMMIS portal at `https://portal.scmedicaid.com/`. Historical fiscal agent has been **Gainwell Technologies (legacy HP/DXC) / BCBS-SC consortium** `[Confirm current SCMMIS prime via SCDHHS procurement records]`. SCDHHS has signaled a forthcoming **ID.me** member login integration for the Medicaid Web Tool in 2026 `[Confirm](https://www.scdhhs.gov/providers)`.

### SCMMIS DOES handle

- **FFS claim adjudication** for Healthy Connections Medicaid FFS population (ABD, partial duals, populations not in MCO).
- **MCO encounter data ingestion** — all 5 MCOs submit 837 encounters within contractual SLAs.
- **Provider enrollment** — required for both FFS and MCO network providers per 42 CFR 438.602(b).
- **270/271 eligibility verification** — single source-of-truth.
- **Pharmacy POS** for FFS pharmacy; Medicaid Drug Rebate.
- **EVV aggregation** for HHCS + PCS (Cures-compliant).
- **NPI / taxonomy registry**.

### SCMMIS DOES NOT handle

- **MCO PA workflows** — each MCO runs its own UM platform.
- **MCO claim adjudication** — MCO pays provider; encounter follows.
- **MA / Part D** — out of scope.
- **MCO appeals/grievances** — plan-level; SCDHHS Ombudsman is escalation.

---

## 6. Managed Care Organizations (MCOs) — Detail

| MCO | Parent | Network Notes |
|---|---|---|
| **Absolute Total Care** | Centene | Statewide; also separately operates Foster Care plan `[Confirm]` |
| **First Choice by Select Health of SC** | AmeriHealth Caritas / Independence | Longest-standing SC plan; operates Foster Care plan |
| **Healthy Blue of SC** | BlueChoice HealthPlan of SC (Elevance) | Statewide |
| **Humana Healthy Horizons in SC** | Humana | Newer entrant |
| **Molina Healthcare of SC** | Molina | Statewide |

([SCDHHS MCO Contact List](https://www.scdhhs.gov/partners/managed-care/managed-care-organizations-mco/managed-care-health-plan-contact-information), [SCChoices comparison](https://www.scchoices.com/Documents/SC1/HealthPlanComparisonChartEnglish.PDF))

**No tailored BH/IDD plan** — BH is integrated. DDSN-operated HCBS for I/DD is largely **FFS** via SCMMIS even when member is otherwise MCO-enrolled (carve-out for waiver services) `[Confirm carve-out scope]`.

---

## 7. Compliance / Regulatory Surface

### Federal

| Regulation | Coverage |
|---|---|
| **HIPAA Privacy & Security**, 45 CFR 160/164 | PHI handling, BAAs, breach notification |
| **42 CFR 455** Subparts B, C, E | Provider screening, ownership disclosure, risk levels, site visits, fingerprint BG checks |
| **42 CFR 456** | Utilization control / medical necessity |
| **42 CFR Part 2** | SUD records — heightened consent |
| **45 CFR 162** | HIPAA EDI transaction & code-set standards |
| **21st Century Cures Act** + **ONC HTI-1/HTI-2/HTI-3** | Info-blocking, USCDI, EHR cert |
| **CMS-0057-F Interop & PA** | Patient Access, Provider Access, Payer-to-Payer, PA APIs (FHIR R4 + DTR/CRD/PAS); phased through 2027 |
| **HITECH** | Enhanced HIPAA enforcement |
| **False Claims Act** (31 USC 3729) | Federal fraud civil enforcement |
| **AKS** (42 USC 1320a-7b), **Stark** (42 USC 1395nn) | Referral / financial relationships |

### SC State

| Statute | Subject |
|---|---|
| **SC Code Title 43, Chapter 7** | SC Medicaid program statutes (43-7-10 et seq.) |
| **SC Code Title 44** | Health (facility licensure, public health, MH, IDD, hospital regs) |
| **SC Code Title 44, Chapter 6** | South Carolina Medical Assistance Act / SCDHHS authority |
| **SC Code Title 40** | Professional licensing (physicians, nurses, etc.) |
| **SC Code Title 38** | Insurance regulation (incl. MA, MCO, PBM) |
| **SC Code §44-6-170** | Medicaid Recipient Identification / verification |
| **2024 Act 60 (H.4927)** | DHEC restructuring — created DPH and SCDES effective 7/1/2024 ([SCPC analysis](https://www.scpolicycouncil.org/analysis_sc_s_contentious_healthcare_restructuring_bill)) |

### Enforcement bodies

- **SCDHHS Division of Program Integrity, Surveillance and Utilization Review (DPISUR)** — Medical Review, Ancillary Review, Operations and Managed Care Oversight (OMCO), Recipient Utilization, SUR. Fraud hotline (888) 364-3224, FraudRes@scdhhs.gov ([SCDHHS Fraud](https://scdhhs.gov/fraud)).
- **SC Attorney General — Medicaid Fraud Control Unit (MFCU)**, with two operational sub-units:
  - **Vulnerable Adults and Medicaid Provider Fraud (VAMPF)** — provider fraud + facility patient abuse ([SC AG VAMPF](https://www.scag.gov/inside-the-office/criminal-division/special-prosecution/vulnerable-adults-and-medicaid-provider-fraud-vampf/)).
  - **Medicaid Recipient Fraud Unit (MRFU)** — beneficiary fraud ([SC AG MRFU](https://www.scag.gov/inside-the-office/criminal-division/special-prosecution/medicaid-recipient-fraud/)).
  - FY2025 federal grant: $2,889,252 (75%) + $963,084 state match (25%) = **~$3.85M total**.
- **SC State Auditor / Legislative Audit Council** — eligibility & program audits.
- **CMS Focused Program Integrity Review** — most recent SC final report FY2021/22 ([CMS SC PI Review](https://www.cms.gov/files/document/south-carolina-fy21-pi-review-final-report.pdf)).

**Fraud referral flow:** Tip / data → DPISUR triage → credible criminal allegation → referral to **SC AG MFCU (VAMPF or MRFU)** → prosecution + recoupment. T-MSIS + UPIC reporting in parallel.

---

## 8. MedGuard360 Enterprise Solution Layout — SC

### 8.1 Connector inventory (SC-specific)

| # | Counterparty | Direction | Transport | Identity | Use case |
|---|---|---|---|---|---|
| 1 | SCMMIS (FFS claims) | Outbound + inbound | X12 837P/I/D, 835, 277CA via SFTP / SCMMIS portal | Trading-partner ID + PGP | FFS claim submission |
| 2 | SCMMIS (eligibility) | Outbound | X12 270/271 + FHIR Coverage | mTLS + OAuth2 / ID.me bridge | Real-time eligibility |
| 3 | SCMMIS (PA) | Outbound | X12 278 + FHIR PAS | OAuth2 | PA for FFS |
| 4 | SCMMIS Provider Enrollment | Outbound | REST + SFTP roster | API key + mTLS | Provider directory sync |
| 5 | SCMMIS encounter ingestion | Outbound | X12 837 EPS | SFTP + PGP | Encounter submission for partner plans |
| 6 | Absolute Total Care | Bi-directional | FHIR R4 + X12 | OAuth2 | Claims, PA, eligibility, encounter |
| 7 | First Choice by Select Health | Bi-directional | FHIR R4 + X12 | OAuth2 | Claims, PA, eligibility, encounter |
| 8 | Healthy Blue of SC | Bi-directional | FHIR R4 + X12 | OAuth2 | Claims, PA, eligibility, encounter |
| 9 | Humana Healthy Horizons in SC | Bi-directional | FHIR R4 + X12 | OAuth2 | Claims, PA, eligibility, encounter |
| 10 | Molina Healthcare of SC | Bi-directional | FHIR R4 + X12 | OAuth2 | Claims, PA, eligibility, encounter |
| 11 | Palmetto GBA JM (Medicare A/B) | Outbound | X12 837 via EDI Gateway | Submitter ID + cert | Medicare primary for duals |
| 12 | CGS JC (DME MAC) | Outbound | X12 837P + CMN | Submitter ID | DMEPOS |
| 13 | SC Medicaid Pharmacy POS / PBM | Outbound | NCPDP D.0 | NCPDP BIN/PCN | Pharmacy POS (Magellan/MCO PBMs `[Confirm]`) |
| 14 | SC eHealth Alliance (SCeHA / SCHIEx) | Bi-directional | FHIR R4, C-CDA, HL7v2 ADT | OAuth2 + SMART | HIE query + notifications |
| 15 | DDSN (waiver services) | Bi-directional | REST + flat-file | API key | ID/RD, CS, HASCI waiver svcs |
| 16 | SCDHHS CLTC | Bi-directional | REST + flat-file | API key | Community Choices, HIV/AIDS, Vent waivers |
| 17 | NEMT broker (ModivCare statewide `[Confirm]`) | Bi-directional | REST + 837P | OAuth2 | Trip auth + claim |
| 18 | DPH facility licensure | Inbound | CSV / REST | API key | Facility license verification |
| 19 | SC LLR professional licensure | Inbound | CSV / REST | API key | Practitioner license verification |
| 20 | T-MSIS extract | Outbound | flat-file via state | n/a (state-level) | Federal Medicaid reporting |
| 21 | DPISUR fraud alerts | Outbound | REST webhook + secure email | mTLS + OAuth2 | Fraud-engine alert forwarding |
| 22 | SC AG MFCU (VAMPF/MRFU) referral | Outbound | secure email + portal | mTLS | Criminal referral packets |
| 23 | DPH Vital Records | Inbound | flat-file | SFTP + PGP | Death-match suppression |
| 24 | ID.me / SC Enterprise SSO | Inbound auth | OIDC + SAML | Federation | Provider/staff/member SSO |
| 25 | CMS Interop APIs (CMS-0057-F) | Bi-directional | FHIR R4 | SMART-on-FHIR | Member data sharing |

---

## 9. SC HIE — South Carolina eHealth Alliance (SCeHA / SCHIEx)

- **Authority / Operator:** **South Carolina eHealth Alliance (SCeHA)** — formed by the merger of the original **SC Health Information Exchange (SCHIEx)** with the Charleston-area **Carolina eHealth Alliance (CeHA)** ([SCeHA About](https://sceha.org/about.php), [SCeHA SCHIEx Overview PDF](https://sceha.org/assets/SCHIEx-Overview-Technology-Model-Key-Points-v1-6.pdf)).
- **Governance:** Public-private; SC Revenue and Fiscal Affairs Office (RFA) hosts the HIE Strategy Development Committee ([RFA HIE Strategy](https://rfa.sc.gov/media/7123)). Health Sciences South Carolina (HSSC) historically incubated state HIE infrastructure ([HSSC Health IT](https://www.healthsciencessc.org/health-it/)).
- **Vendor / platform:** SCeHA platform vendor `[Confirm — Mirth/NextGen historically for SCHIEx; current platform post-merger Confirm via SCeHA]`.
- **Mandate:** SC does **not** have a hard NCGS-style mandate; HIE participation is voluntary but encouraged via SCDHHS contractual incentives.
- **Services:** Clinical Portal (query-based), C-CDA exchange, ADT notifications, public health gateway (eCR/ELR to DPH), FHIR endpoints.
- **MedGuard360 `hie-service` integration:** Subscribe to ADT for member events → trigger care-coord + fraud checks. Query for PA supporting documentation. Submit MedGuard-aggregated encounter summaries (per BAA + DUA).

---

## 10. SC Medicaid Program Integrity Workflows

### 10.1 Lifecycle

1. **Detection** — DPISUR data analytics, UPIC, member/provider tips (888-364-3224, FraudRes@scdhhs.gov), MCO Special Investigations Units (SIUs), MedGuard360 fraud-engine alerts.
2. **Triage** at DPISUR — clinical + statistical review, sampling, RAC scope, MCO-encounter pattern analysis.
3. **Pre-payment review hold** or **post-payment recoupment**.
4. **Credible allegation of fraud (CAF)** under 42 CFR 455.23 → payment suspension.
5. **Referral** to **SC AG MFCU**: VAMPF (provider) or MRFU (beneficiary).
6. **Sanction**: termination + cross-state via T-MSIS/PECOS, FCA suit, restitution, exclusion.
7. **Recovery** booked to state + federal share (FMAP-weighted).

### 10.2 Stats

- FY2025 SC MFCU funding ~$3.85M total (federal $2.89M + state $963K).
- HHS-OIG MFCU FY2024 + FY2025 annual reports include SC line items ([HHS-OIG MFCU FY2024](https://oig.hhs.gov/reports/all/2025/medicaid-fraud-control-units-annual-report-fiscal-year-2024/), [HHS-OIG MFCU 2025 data snapshot](https://oig.hhs.gov/documents/evaluation/11553/OEI-09-26-00140.pdf)).
- Recent SC AG enforcement actions: ~$125K recovery January 2025 ([SC AG press release](https://www.scag.gov/about-the-office/news/attorney-general-alan-wilson-announces-recovery-of-almost-125-000-in-medicaid-fraud/)); ~$60K additional `[Confirm](https://www.scag.gov/about-the-office/news/attorney-general-alan-wilson-announces-recovery-of-over-60-000-stolen-from-taxpayers-by-medicaid-fraud)`.
- Aggregate SC recovery/ROI figures `[Confirm via HHS-OIG MFCU annual data]`.

### 10.3 MedGuard360 fraud-engine → DPISUR handoff

- Alert payload: provider NPI, MCO ID (if applicable), claim batch IDs, statistical confidence, scheme classification (upcoding, phantom billing, NEMT mileage, identity theft, decedent billing, kickback ring), evidence bundle.
- Transport: signed JSON over mTLS REST to DPISUR ingestion endpoint `[Confirm endpoint via SCDHHS IT]`.
- SLA: high-severity within 4h; routine daily batches.
- audit-service WORM retention 10y per SC Code retention schedule.

---

## 11. Funding & Federal Matching — FY2026

### FY2026 (Oct 1, 2025 – Sep 30, 2026) FMAP

- Federal Register publishes annual FMAP table ([89 FR / 2024-27910](https://www.federalregister.gov/documents/2024/11/29/2024-27910/federal-financial-participation-in-state-assistance-expenditures-federal-matching-shares-for)).
- **SC traditional FMAP FY2026:** approximately **70%** (SC has historically sat in the high-60s to low-70s band) `[Confirm exact rate via [KFF FMAP table](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/) and [FFIS Final FY2026 FMAPs](https://ffis.org/issue-brief/final-fy-2026-fmaps/)]`.
- **Expansion FMAP:** N/A — SC has not expanded.
- **CHIP enhanced FMAP (E-FMAP):** ~79% `[Confirm via MACPAC Exhibit 6](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)`.
- **Admin match:** 50% federal baseline; 75% MMIS O&M; 90% MMIS DDI; 75/90 eligibility; 75% fraud detection systems per 42 CFR 433.111.

### OBBB Act impact (HR 1)

- Because SC has not expanded Medicaid, the OBBB Act provisions affecting expansion FMAP are not directly applicable. Work-requirement, eligibility-redetermination cadence, and provider-tax provisions still apply `[Confirm SC-specific impacts]`.

### Why FMAP matters for MedGuard360

- MMIS-adjacent functions (claims, PA, encounter aggregation, fraud detection) qualify for **75% O&M / 90% DDI** match if procured as an MMIS module under CMS MITA + Streamlined Modular Certification.
- Fraud detection qualifies under 42 CFR 433.111(b)(2) for enhanced match.

---

## 12. Differences from NC — Delta Callouts

| Axis | **North Carolina** | **South Carolina** | Implication for MedGuard360 |
|---|---|---|---|
| Medicaid expansion | YES (Dec 2023; SL 2023-7) | **NO** — SC has not expanded | Smaller adult-only eligibility decision tree in state-config-service |
| Single state agency | NC DHHS (DHB) | **SCDHHS** | Different connector endpoints, identity model |
| Cabinet integration | DHHS independent; Secretary appointed | **SCDHHS Director cabinet, Governor-appointed**; DPH/SCDES recently moved to cabinet (July 2024) | Faster political cycle for SC procurements |
| Managed care model | 5 Std PHPs + 4 Tailored Plans + CFSP + EBCI Tribal | **5 MCOs, no separate BH/IDD plan** (BH integrated within MCOs) | One less plan-type to model; DDSN waiver carve-out instead |
| Tribal plan | EBCI Tribal Option (Indian Managed Care Entity) | None comparable | No Tribal IMCE connector needed |
| Foster care plan | Children & Families Specialty Plan (Healthy Blue Care Together, launched Dec 2025) | Separate Select Health foster-care plan (operated within First Choice family) | Different plan-vendor model |
| 1115 demos | Medicaid Transformation + Healthy Opportunities Pilots (paused 2025) | Healthy Connections Works (work-req historical); current 1115 portfolio limited `[Confirm]` | Fewer SDOH service codes in SC config |
| BH carve-out | Tailored Plans for SMI/SUD/IDD/TBI; 4 LME/MCOs | **Integrated within MCOs**; DDSN operates I/DD waivers FFS | No 42 CFR Part 2 carve-out claim path; still applies for SUD docs |
| Nursing facility carve-in | FFS or PHP per plan | **Nursing-facility members carved INTO MCOs effective 1/1/2026** | New LTSS-in-MCO claim path effective 2026 |
| MMP / Duals demo | None active | **Healthy Connections Prime ended 1/1/2026**; standard D-SNP + Medicaid wrap | Crossover via D-SNP claims, not MMP |
| MMIS operator | Gainwell (NCTracks); Optum PDM/CVO incoming 2026 | SCMMIS — BCBS-SC EDI / Gainwell historic `[Confirm prime]` | Different fiscal-agent contracts |
| HIE | NC HealthConnex (SAS Institute), with statutory mandate (enforcement suspended) | **SCeHA / SCHIEx** (post-merger), **no hard mandate** | Voluntary HIE participation model; lower coverage |
| HIE vendor | SAS Institute | `[Confirm — historically Mirth/NextGen; current post-merger TBD]` | Different FHIR endpoint stack |
| MFCU | NC DOJ MID | **SC AG MFCU** with two sub-units: **VAMPF** (provider/facility) + **MRFU** (recipient) | Two referral endpoints instead of one |
| MAC (A/B) | Palmetto JM | **Palmetto JM** (same) | Reuse NC Palmetto JM connector |
| DME MAC | CGS JC | **CGS JC** (same) | Reuse NC CGS JC connector |
| FMAP FY2026 | ~65% | **~70%** `[Confirm]` | Higher federal share; lower state cost per claim |
| Cabinet structure | DHHS Secretary cabinet | SCDHHS Director cabinet; DPH/SCDES cabinet (post-2024 split) | Multiple agency BAAs needed |
| Statutory citation root | NCGS Ch. 108A | SC Code Title 43 Ch. 7 + Title 44 Ch. 6 | Different statute-id mapping |

**Cross-state reusability:** Palmetto JM (Medicare A/B) and CGS JC (DME) connectors are **identical** to NC — direct reuse. SCMMIS X12 transport profile is **substantially similar to NCTracks** because both have Gainwell/HP heritage `[Confirm SCMMIS prime]`, so the EDI service can largely reuse NC trading-partner code. MCO list is entirely different — five new OAuth2 client registrations required.

---

## Appendix A — Acronym Glossary (SC-specific additions)

| Acronym | Expansion |
|---|---|
| BabyNet | SC's IDEA Part C Early Intervention system |
| CLTC | (SCDHHS) Community Long Term Care |
| CRCF | Community Residential Care Facility |
| DAODAS | SC Dept of Alcohol and Other Drug Abuse Services |
| DDSN | SC Dept of Disabilities and Special Needs |
| DPH | SC Dept of Public Health (post-DHEC 2024) |
| DPISUR | (SCDHHS) Division of Program Integrity, Surveillance and Utilization Review |
| HASCI | (SC waiver) Head and Spinal Cord Injury |
| Healthy Connections | SC Medicaid consumer brand |
| Healthy Connections Choices | SC managed-care enrollment broker brand |
| Healthy Connections Prime | SC MMP (full duals demo) — ended 1/1/2026 |
| ID/RD | (SC waiver) Intellectual Disability / Related Disabilities |
| LLR | SC Dept of Labor, Licensing and Regulation |
| MRFU | (SC AG) Medicaid Recipient Fraud Unit |
| OMCO | (DPISUR) Operations and Managed Care Oversight |
| RFA | SC Revenue and Fiscal Affairs Office |
| SCDES | SC Dept of Environmental Services (post-DHEC 2024) |
| SCDHHS | SC Dept of Health and Human Services (Medicaid agency) |
| SCDMH | SC Dept of Mental Health |
| SCDSS | SC Dept of Social Services |
| SCeHA | SC eHealth Alliance (state HIE) |
| SCHIEx | (Legacy) SC Health Information Exchange — now under SCeHA |
| SCMMIS | SC Medicaid Management Information System |
| SUR | Surveillance and Utilization Review |
| VAMPF | (SC AG) Vulnerable Adults and Medicaid Provider Fraud unit |

---

## Appendix B — Primary Sources

- [SCDHHS Home](https://www.scdhhs.gov/)
- [SCDHHS Healthy Connections Managed Care](https://www.scdhhs.gov/members/healthy-connections-medicaid-managed-care)
- [SCDHHS Managed Care Carve-in (Jan 2026)](https://www.scdhhs.gov/partners/managed-care/managed-care-carve)
- [SCDHHS Healthy Connections Prime](https://www.scdhhs.gov/partners/managed-care/healthy-connections-prime)
- [SCDHHS MCO Contact List](https://www.scdhhs.gov/partners/managed-care/managed-care-organizations-mco/managed-care-health-plan-contact-information)
- [SCDHHS Bureau of Compliance & PI](https://www.scdhhs.gov/site-page/bureau-compliance-and-performance-review)
- [SCDHHS Fraud](https://scdhhs.gov/fraud)
- [SCDHHS Enrollment Dashboard](https://www.scdhhs.gov/partners/reports-and-statistics/medicaid-enrollment-dashboard)
- [SCChoices Plan Comparison PDF](https://www.scchoices.com/Documents/SC1/HealthPlanComparisonChartEnglish.PDF)
- [SC Medicaid Provider Portal](https://portal.scmedicaid.com/)
- [SC DPH — DHEC Restructuring](https://dph.sc.gov/about/dhec-restructuring)
- [SC SCDES — DHEC Restructuring](https://www.des.sc.gov/about-scdes/dhec-restructuring)
- [Post & Courier — DHEC Split July 2024](https://www.postandcourier.com/health/dhec-sc-split-public-health-environmental-protection-2024/article_be235efc-280e-11ef-b881-e701c49e111a.html)
- [SCHA — DHEC Restructuring Brief](https://scha.org/news/sc-dhec-restructuring-what-you-need-to-know/)
- [SCPC Analysis — DHEC Restructuring Bill](https://www.scpolicycouncil.org/analysis_sc_s_contentious_healthcare_restructuring_bill)
- [SC AG VAMPF](https://www.scag.gov/inside-the-office/criminal-division/special-prosecution/vulnerable-adults-and-medicaid-provider-fraud-vampf/)
- [SC AG Medicaid Recipient Fraud Unit](https://www.scag.gov/inside-the-office/criminal-division/special-prosecution/medicaid-recipient-fraud/)
- [SC AG — $125K Recovery Jan 2025](https://www.scag.gov/about-the-office/news/attorney-general-alan-wilson-announces-recovery-of-almost-125-000-in-medicaid-fraud/)
- [HHS-OIG MFCU FY2024 Annual Report](https://oig.hhs.gov/reports/all/2025/medicaid-fraud-control-units-annual-report-fiscal-year-2024/)
- [HHS-OIG MFCU 2025 Data Snapshot](https://oig.hhs.gov/documents/evaluation/11553/OEI-09-26-00140.pdf)
- [SCeHA About](https://sceha.org/about.php)
- [SCeHA SCHIEx Overview PDF](https://sceha.org/assets/SCHIEx-Overview-Technology-Model-Key-Points-v1-6.pdf)
- [Health Sciences SC — Health IT](https://www.healthsciencessc.org/health-it/)
- [RFA HIE Strategy Committee](https://rfa.sc.gov/media/7123)
- [Palmetto GBA JM Part A](https://palmettogba.com/jma) · [Part B](https://palmettogba.com/jmb)
- [CMS A/B MAC JM](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/Who-are-the-MACs-A-B-MAC-Jurisdiction-M-JM)
- [CMS DME MAC JC](https://www.cms.gov/medicare/medicare-contracting/medicare-administrative-contractors/who-are-the-macs-dme-mac-jurisdiction-c-jc) · [CGS JC](https://www.cgsmedicare.com/jc/)
- [Federal Register FMAP FY2026 (2024-27910)](https://www.federalregister.gov/documents/2024/11/29/2024-27910/federal-financial-participation-in-state-assistance-expenditures-federal-matching-shares-for)
- [KFF FMAP State Indicator](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/)
- [MACPAC Exhibit 6 — FMAPs by State](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)
- [FFIS Final FY2026 FMAPs](https://ffis.org/issue-brief/final-fy-2026-fmaps/)
- [CMS SC FY2021 PI Focused Review](https://www.cms.gov/files/document/south-carolina-fy21-pi-review-final-report.pdf)
- [healthinsurance.org — Medicare in SC (Sep 2024)](https://www.healthinsurance.org/medicare/south-carolina/)
- [KFF Medicaid in SC May 2025](https://files.kff.org/attachment/fact-sheet-medicaid-state-SC)
- [CMS Oct 2025 Medicaid/CHIP Enrollment Highlights](https://www.medicaid.gov/medicaid/national-medicaid-chip-program-information/medicaid-chip-enrollment-data/october-2025-medicaid-chip-enrollment-data-highlights)
- [Medicaid.gov State Profile — SC](https://www.medicaid.gov/state-overviews/stateprofile.html?state=south-carolina)
- [KFF Medicaid Expansion Status](https://www.kff.org/medicaid/status-of-state-medicaid-expansion-decisions/)

---

*Document owner: MedGuard360 Enterprise Integrations. File: `integrations/sc-enterprise/README.md`. Cross-references: `integrations/nc-enterprise/`, `integrations/ga-enterprise/`, `integrations/PILOT-STATES-COMPARISON.md`.*
