# MedGuard360 — GA Enterprise Landscape

> Reference document mapping the Georgia Department of Community Health, Georgia Medicaid + PeachCare for Kids, Medicare, and statewide billing ecosystem, and showing where MedGuard360 sits as a fraud-prevention + billing platform. Pilot states: NC (primary), SC, **GA**.
>
> Last verified: 2026-05-22. Where information is fluid, items are tagged `[Confirm via …]`.

---

## 1. GA DCH Organizational Map

The **Georgia Department of Community Health (DCH)** is the single state Medicaid agency under 42 CFR 431.10 ([DCH Home](https://dch.georgia.gov/), [GA Medicaid](https://medicaid.georgia.gov/)). DCH is governed by a Board appointed by the Governor; Commissioner serves at the Governor's pleasure. DCH operates both **Georgia Medicaid** and **PeachCare for Kids® (CHIP)** and together they cover **more than 2 million Georgians** ([DCH Medicaid Managed Care](https://dch.georgia.gov/medicaid-managed-care)).

**2025 limited-expansion context:** Georgia has **not** taken full ACA Medicaid expansion. Instead it operates **Georgia Pathways to Coverage™**, an 1115 demonstration that extends Medicaid eligibility up to 100% FPL conditional on documenting qualifying work/volunteer/education activities. On **September 25, 2025**, CMS approved the extension of Pathways **through December 31, 2026**, with reduced reporting requirements, retroactive coverage, and parent-of-child-under-six as a new qualifying activity ([Gov. Kemp press release](https://gov.georgia.gov/press-releases/2025-09-25/cms-approves-georgia-pathways-coveragetm-extension-further-validates), [DCH Oct 2025 Pathways announcement](https://dch.georgia.gov/announcement/2025-10-01/pathways-updates-oct12025)). Cumulative Pathways enrollment ~15,427 ([Pathways data tracker](https://www.georgiapathways.org/data-tracker)).

| # | Division / Office | Acronym | Mission / Scope | Claims / Service Flow | MedGuard360 Intersection |
|---|---|---|---|---|---|
| 1 | DCH — Medical Assistance Plans | MAP | Operates Medicaid + PeachCare; medical policy; managed care contracting | All Medicaid claims (FFS via GAMMIS + CMO encounters) | **Primary integration target** |
| 2 | DCH — Office of Health Information Technology / Health IT | HIT | HIT/HIE strategy; oversees GaHIN | HIE policy + connectivity | HIE-service alignment ([DCH HIT](https://dch.georgia.gov/divisionsoffices/office-information-technology/health-information-technology/georgia-health)) |
| 3 | DCH — State Health Benefit Plan | SHBP | State employee benefits | Separate from Medicaid | n/a |
| 4 | DCH — Healthcare Facility Regulation | HFR | Licenses hospitals, NF/SNF, ACH, hospice, home health, ambulatory surgery, BH facilities | Upstream of Medicaid enrollment | Facility license verification |
| 5 | DCH — Office of Inspector General (**OIG**) | DCH OIG | Provider/recipient PI, third-party liability, background investigations, pharmacy lock-in, audits | All claim post-pay; tip-driven pre-pay | **Direct downstream consumer of fraud-engine alerts** ([DCH OIG](https://dch.georgia.gov/office-inspector-general)) |
| 6 | DCH — Office of General Counsel | OGC | Legal | n/a | BAA + DUA |
| 7 | DCH — Office of Financial Management | OFM | Federal matching draws, capitation, finance | All Medicaid disbursements | Financial reconciliation feed |
| 8 | DCH — Office of Procurement Services | | Procurement, vendor contracts | n/a | Vendor onboarding |
| 9 | DCH — Office of Communications | | External comms | n/a | n/a |
| 10 | Georgia Department of Public Health (DPH) | GA-DPH | Statewide public health (separate from DCH) | Title V, vaccines, vital records | Public health reporting (ELR/eCR) |
| 11 | Georgia Dept. of Behavioral Health and Developmental Disabilities | DBHDD | Operates state BH/IDD service delivery, NOW/COMP waivers operating agency | BH/IDD waiver services | BH integration; waiver claim oversight |
| 12 | Georgia Department of Human Services | DHS | Includes Division of Family and Children Services (DFCS) Medicaid eligibility intake | Eligibility intake via Georgia Gateway | Eligibility verification feed |
| 13 | Georgia DHS — Office of Inspector General | DHS OIG | Recipient fraud (DHS-administered programs) | Recipient PI overlap with DCH OIG | Cross-referral path |
| 14 | Georgia Department of Insurance | GA-DOI | Insurance + CMO solvency oversight | CMO financial filings | CMO directory verification |
| 15 | Georgia Composite Medical Board | GCMB | Physician licensure | Upstream of Medicaid provider enrollment | Practitioner license verification |
| 16 | Georgia Board of Nursing | GBON | Nursing licensure | Upstream | Practitioner license verification |
| 17 | Georgia Dept. of Aging Services | DAS | Aging services, Older Americans Act | Some waiver overlap (CCSP, SOURCE) | LTSS coordination |
| 18 | Georgia AG — Medicaid Fraud Division | MFD/MFCU | Criminal + civil prosecution of provider fraud + facility patient abuse | See §7 | **Fraud-engine handoff target** |
| 19 | Georgia Office of the Inspector General (state-level) | State OIG | State-level cabinet OIG ([oig.georgia.gov](https://oig.georgia.gov/)) | Cross-agency PI | Inter-agency coordination |

---

## 2. GA Medicaid — Programs & Populations

### Total enrollment

- **Medicaid + PeachCare for Kids covers more than 2 million Georgians** combined ([DCH Medicaid Managed Care](https://dch.georgia.gov/medicaid-managed-care), [KFF Medicaid in GA May 2025](https://files.kff.org/attachment/fact-sheet-medicaid-state-GA)).
- Specific reported point estimate: ~2.3M as of June 2024 ([healthinsurance.org GA Medicaid](https://www.healthinsurance.org/medicaid/georgia/)); current rolling figure `[Confirm via Georgia CareConnect Medicaid Data Reports](https://careconnect.georgia.gov/gcc/s/for-stakeholders-partners/data-reporting/medicaid-data-reports?language=en_US) or [CMS Enrollment Highlights](https://www.medicaid.gov/medicaid/national-medicaid-chip-program-information/medicaid-chip-enrollment-data/october-2025-medicaid-chip-enrollment-data-highlights)`.
- Medicaid covers **~42% of Georgia's children** ([GEEARS 2025 brief](https://geears.org/wp-content/uploads/Medicaid-and-PeachCare-Info-Brief-2025.pdf)).
- **Georgia has not adopted full ACA expansion.** Pathways to Coverage (1115) is a **partial / conditional** expansion to 100% FPL with work-activity reporting — extended through 12/31/2026.

### Programs / sub-populations

| Population | Description | Eligibility Hook |
|---|---|---|
| **Low-Income Medicaid (LIM)** | Parents/caretakers + dependent children (MAGI) | MAGI; very low parent threshold |
| **Right from the Start Medicaid (RSM)** | Pregnant women + infants up to ~220% FPL | MAGI |
| **PeachCare for Kids® (CHIP)** | Children up to 247% FPL; separate CHIP program | MAGI |
| **Aged, Blind, Disabled (ABD)** | 65+, blind, disabled; **separate fee-for-service population** historically not in CMOs | Categorical + asset-tested |
| **Planning for Healthy Babies (P4HB)** | 1115 family planning + interpregnancy care waiver | Income-based |
| **Pathways to Coverage** | 1115 demo; adults 19–64 up to 100% FPL with qualifying activity | Income + activity verification |
| **Dual Eligibles** | Medicare + Medicaid | See below |

### Dual eligibles

Standard categories (QMB, SLMB, QI, QDWI); no MMP-style integrated demo currently active in GA `[Confirm]`. Medicare adjudicates → CMS BCRC COBA → GAMMIS adjudicates cost-share.

### Waivers

| Waiver | Authority | Population | Operating Agency |
|---|---|---|---|
| **NOW** (New Options Waiver) | 1915(c) HCBS | I/DD | DBHDD |
| **COMP** (Comprehensive Supports Waiver) | 1915(c) HCBS | I/DD (higher-need) | DBHDD |
| **CCSP** (Community Care Services Program) | 1915(c) HCBS | Aged/disabled adults | DAS / DCH |
| **SOURCE** (Service Options Using Resources in a Community Environment) | 1915(c) HCBS | Aged/disabled adults with chronic conditions | DCH |
| **ICWP** (Independent Care Waiver Program) | 1915(c) HCBS | Adults with severe physical disability or TBI | DCH |
| **GAPP** (Georgia Pediatric Program) | 1915(c) HCBS | Medically fragile children | DCH |
| **Katie Beckett (TEFRA)** | 1902(e)(3) | Severely disabled children | DCH / DFCS |
| **Planning for Healthy Babies (P4HB)** | 1115 | Family planning + interpregnancy care | DCH |
| **Pathways to Coverage** | 1115 demo | Adults 19–64 up to 100% FPL w/ qualifying activity | DCH |

### Care Management Organizations (CMOs)

Georgia uses the term **CMO** (Care Management Organization) rather than MCO. The product brand is **Georgia Families®**; ABD members historically participate via **Georgia Families 360°** (foster care, adoption assistance, juvenile justice youth) or remain FFS.

> 📍 **Procurement status snapshot (May 2026).** The 2024 Notice of Intent to Award (NOIA) has been litigated through 2025 and the **incumbents are still operating** under bridge extensions through **2026-06-30**. The new four-CMO lineup targets a **2026-07-01 launch**. For the current point-in-time picture — winners, losers, protest decisions, open-records litigation, transition mechanics — see **[`PROCUREMENT-STATUS.md`](./PROCUREMENT-STATUS.md)**. That file is re-snapshotted as facts move; this README is the stable structural reference.

**Incumbent CMOs (current as of May 2026):** The Department of Community Health contracts with three CMOs to deliver services to Medicaid members ([GA Medicaid CMOs](https://medicaid.georgia.gov/programs/all-programs/georgia-families/care-management-organizations-cmo)):

1. **Amerigroup Community Care of Georgia** (now operating under Elevance Health's **Wellpoint** brand in some markets)
2. **CareSource Georgia**
3. **Peach State Health Plan** (Centene)

**2024–2025 CMO procurement shake-up:** DCH issued the NOIA on **2024-12-02**. Apparent procurement outcome: **CareSource** retained a contract; three newcomers — **Humana Employers Health Plan of Georgia**, **Molina Healthcare of Georgia**, and **UnitedHealthcare of Georgia** — were awarded contracts; **Amerigroup** and **Peach State** lost their bids ([NDDS Advocacy — GA CMO Shakeup Jan 2025](https://www.ndds.org/advocacy/legislative-insider/2025/01/24/georgia-department-of-community-health-announces-major-cmo-contract-shakeup), [Capitol Beat — Confusion over future of Medicaid management in GA May 2025](https://capitol-beat.org/2025/05/confusion-concern-over-the-future-of-medicaid-management-in-georgia/)). **Targeted go-live: 2026-07-01**, with incumbent bridge extensions running through **2026-06-30**. Protests by Amerigroup and Peach State were **denied by DCH on 2025-11-10** and upheld on hearing-officer review in **December 2025**; **Georgia Open Records Act litigation in Fulton County Superior Court is pending** as of this README's last verification date. See [`PROCUREMENT-STATUS.md`](./PROCUREMENT-STATUS.md) for the current detailed status.

> **Note on "Wellpoint of GA":** Elevance Health has rebranded several of its government-business plans (including former Amerigroup plans) under the **Wellpoint** name. The brand mapping in GA `[Confirm via [DCH CMO list](https://medicaid.georgia.gov/programs/all-programs/georgia-families/care-management-organizations-cmo)]`.

---

## 3. Medicare in GA

| Metric | Value | Source |
|---|---|---|
| Medicare Advantage share (GA, 2024) | ~59% | [Becker's MA Penetration 2024](https://beckerspayer.com/payer/medicare-advantage-penetration-by-state-2024.html) |
| Total Medicare beneficiaries | `[Confirm via [KFF Total Medicare Beneficiaries](https://www.kff.org/medicare/state-indicator/total-medicare-beneficiaries/)]` (commonly ~1.85M `[Confirm]`) | KFF |

**Parts:**
- **Part A** (Hospital) — Palmetto GBA **JJ**
- **Part B** (Physician/Outpatient) — Palmetto GBA **JJ**
- **Part C** (MA) — private plans
- **Part D** (Drug) — private PDPs/MA-PDs

**MAC assignments (GA):**
- **A/B MAC: Palmetto GBA, Jurisdiction JJ** (Alabama, Georgia, Tennessee) — [Palmetto JJ Part A](https://palmettogba.com/jja), [Palmetto JJ Part B](https://palmettogba.com/jjb), [CMS JJ page](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/Who-are-the-MACs-A-B-MAC-Jurisdiction-J-JJ). **Palmetto was re-awarded JJ in 2024; contract effective Sept 1, 2024; covers ~2M FFS beneficiaries, ~66,000 physicians, ~400 hospitals** ([CMS JJ MAC Fact Sheet 2024](https://www.cms.gov/files/document/jj-mac-award-fact-sheet-09012024.pdf), [Palmetto JJ Award](https://corporate.palmettogba.com/about/happenings/palmetto-gba-awarded-jurisdiction-j-ab-mac-contract/)).
- **DME MAC: CGS Administrators, Jurisdiction C** — covers GA ([CMS DME JC](https://www.cms.gov/medicare/medicare-contracting/medicare-administrative-contractors/who-are-the-macs-dme-mac-jurisdiction-c-jc), [CGS JC](https://www.cgsmedicare.com/jc/)). **Same DME MAC as NC and SC.**
- **HH+H MAC**: Palmetto GBA Southeast region `[Confirm]`.
- **National Supplier Clearinghouse**: Palmetto GBA (national).

**Crossover (COBA):** Medicare → CMS BCRC COBA → GAMMIS via 837 → cost-share adjudication.

> **GA is in MAC jurisdiction JJ (AL/GA/TN), while NC and SC are in JM (NC/SC/VA/WV). Both are Palmetto, but the connector endpoints and submitter IDs are separate.**

---

## 4. Statewide Billing Entities (Who bills GA Medicaid / Medicare)

| # | Entity Type | GA Provider Specialty | Typical Workflow | Primary Payer Path |
|---|---|---|---|---|
| 1 | Individual practitioners | MD/DO, PA, APRN, CRNA, CNM | 837P → GAMMIS (FFS) or CMO; Medicare via Palmetto JJ B | Both |
| 2 | Hospitals (acute / CAH / LTACH / IRF / psych) | UB-04 TOB 11x/12x/13x | 837I → Medicare A or GAMMIS/CMO | Both |
| 3 | FQHC + RHC | PPS rate; UDS reporting | All-inclusive PPS; cost report cost settlement | Both |
| 4 | Behavioral health (LCSW, LPC, LMFT) + PRTFs + CSBs | 837P / 837I | CMO; DBHDD/Community Service Board network for state-funded | Mostly CMO + state |
| 5 | Nursing facilities (NF/SNF), Personal Care Homes (PCH) | UB-04 / 837I monthly | Per-diem; ABD generally FFS in nursing homes | Mostly FFS |
| 6 | Home health | OASIS + 837I | Palmetto for Medicare; GAMMIS/CMO Medicaid | Both |
| 7 | Hospice | Per-diem; NOE/NOTR | Palmetto JJ for Medicare; GAMMIS/CMO Medicaid | Both |
| 8 | Pharmacy (indep / chain / LTC / specialty / 340B) | NCPDP | NCPDP D.0 real-time to GAMMIS POS (currently OptumRx as state Medicaid PBM `[Confirm]`) + CMO PBMs; Medicare D via plan PBMs | Both |
| 9 | DMEPOS suppliers | NSC + Medicaid enrollment | 837P to CGS JC; 837P to GAMMIS or CMO | Both |
| 10 | NEMT brokers + transport | NEMT contractor (Verida / ModivCare / SE Trans regional `[Confirm]`) | Trip auth + 837P | Mostly Medicaid |
| 11 | Dental | 837D | GAMMIS / DentaQuest CMO subcontractor | Mostly Medicaid |
| 12 | Vision (OD / optician) | 837P + eyewear vendor | GAMMIS / CMO | Both |
| 13 | School-based services (LEAs) | School-based services bureau | IEP-driven; cost reconciliation | GA Medicaid only |
| 14 | NOW/COMP waiver providers (I/DD) | DBHDD-credentialed | Service plan via DBHDD; 837P to GAMMIS | GA Medicaid only |
| 15 | CCSP / SOURCE (Aged/Disabled HCBS) | DCH/DAS | Care plan + 837P/I | GA Medicaid only |
| 16 | ICWP (Independent Care) | DCH-credentialed | 837P to GAMMIS | GA Medicaid only |
| 17 | GAPP / Katie Beckett | DCH-credentialed | 837P/I to GAMMIS | GA Medicaid only |
| 18 | Early Intervention / Babies Can't Wait | DPH-administered Part C | EI billable services | Hybrid |
| 19 | Public health departments / DPH clinics | LHD | Clinical billable | Hybrid |
| 20 | Crisis / mobile crisis (DBHDD network, Community Service Boards) | DBHDD | CMO + state-funded | Mostly state + CMO |
| 21 | ICF/IID | DBHDD/HFR-licensed | Per-diem to GAMMIS | GA Medicaid only |
| 22 | Personal Care Homes (PCH) | HFR-licensed | Optional State Supplement + Medicaid PCS | Hybrid |
| 23 | SUD treatment (OTPs, MAT, SUD residential) | DBHDD-credentialed | CMO; 42 CFR Part 2 consent | CMO |
| 24 | Foster care medical | Georgia Families 360° (Amerigroup historically) | Plan-specific | GA Medicaid |
| 25 | Pathways to Coverage members | DCH | CMO assignment | GA Medicaid via CMO |

> Provider specialty codes use GAMMIS taxonomy. `[Confirm exact codes via [GAMMIS Provider Manuals](https://www.mmis.georgia.gov/portal/PubAccess.Provider%20Information/Provider%20Manuals/tabId/54/Default.aspx)]`.

---

## 5. GAMMIS Service Boundary

**Operator/fiscal agent:** **Gainwell Technologies** has operated GAMMIS as the DCH fiscal intermediary since 2010, having succeeded Hewlett-Packard / EDS (Gainwell is the spun-off DXC US public-sector health unit; the lineage is HP/EDS → DXC → Gainwell 2020). The GAMMIS Web Portal lives at [https://www.mmis.georgia.gov/portal/](https://www.mmis.georgia.gov/portal/Default.aspx?tabid=35). Provider Contact Center: 770-325-9600 / 1-800-766-4456.

### GAMMIS DOES handle

- **FFS claim adjudication** for ABD, ICF/IID, NF, waiver populations, plus Pathways/CMO populations during FFS lookback periods.
- **CMO encounter data ingestion** — all CMOs submit 837 encounters within SLA.
- **Provider enrollment** — required for both FFS and CMO network providers per 42 CFR 438.602(b).
- **270/271 eligibility verification** — single source-of-truth.
- **Pharmacy POS** for FFS pharmacy; Medicaid Drug Rebate.
- **EVV aggregation** for HHCS + PCS (Cures-compliant).
- **NPI / taxonomy registry**.
- **PA workflow** for FFS PA categories (PA vendor varies — historically Alliant `[Confirm current PA vendor]`).

### GAMMIS DOES NOT handle

- **CMO PA workflows** — each CMO runs its own UM platform.
- **CMO claim adjudication** — CMO pays provider; encounter follows.
- **MA / Part D** — out of scope.
- **CMO appeals/grievances** — plan-level; DCH Ombudsman is escalation.

---

## 6. Care Management Organizations (CMOs) — Detail

| CMO (incumbent / 2025 procurement) | Parent | Network Notes |
|---|---|---|
| **Amerigroup Community Care of Georgia** (incumbent; reportedly lost 2025 bid; Wellpoint brand in some markets) | Elevance Health | Statewide; operates Georgia Families 360° foster care plan |
| **CareSource Georgia** (incumbent; **won 2025 bid**) | CareSource | Statewide |
| **Peach State Health Plan** (incumbent; reportedly lost 2025 bid) | Centene | Physician-driven; statewide |
| **Humana Employers Health Plan of Georgia** (NOIA winner; **go-live targeted 2026-07-01**) | Humana | New entrant |
| **Molina Healthcare of Georgia** (NOIA winner; **go-live targeted 2026-07-01**) | Molina | New entrant |
| **UnitedHealthcare of Georgia** (NOIA winner; **go-live targeted 2026-07-01**; also takes **Georgia Families 360°** foster-care contract from Amerigroup) | UnitedHealth Group | New entrant |

([DCH CMO List](https://medicaid.georgia.gov/programs/all-programs/georgia-families/care-management-organizations-cmo), [Georgia Families overview](https://medicaid.georgia.gov/programs/all-programs/georgia-families), [GA Audits — CMO financial review](https://www.audits.ga.gov/ReportSearch/download/11870), [NDDS — Jan 2025 CMO shakeup](https://www.ndds.org/advocacy/legislative-insider/2025/01/24/georgia-department-of-community-health-announces-major-cmo-contract-shakeup), [Capitol Beat — May 2025 confusion piece](https://capitol-beat.org/2025/05/confusion-concern-over-the-future-of-medicaid-management-in-georgia/))

> The platform must support a **dual-state config** for GA CMOs: (a) **current operational lineup** = 3 incumbents; (b) **future lineup post-transition** = up to 4 new contractors. Use `state-config-service` versioning to switch sets atomically on go-live.

**BH/IDD model:** Largely integrated within CMOs for routine BH; severe/persistent and IDD-waiver populations served via DBHDD provider network (CSBs, FFS via GAMMIS for waiver services).

---

## 7. Compliance / Regulatory Surface

### Federal

| Regulation | Coverage |
|---|---|
| **HIPAA Privacy & Security**, 45 CFR 160/164 | PHI handling, BAAs, breach notification |
| **42 CFR 455** Subparts B, C, E | Provider screening, ownership disclosure, risk levels, site visits, fingerprint BG |
| **42 CFR 456** | Utilization control / medical necessity |
| **42 CFR Part 2** | SUD records |
| **45 CFR 162** | HIPAA EDI standards |
| **21st Century Cures Act** + **ONC HTI-1/2/3** | Info-blocking, USCDI, EHR cert |
| **CMS-0057-F Interop & PA** | FHIR APIs phased through 2027 |
| **HITECH** | Enhanced HIPAA enforcement |
| **False Claims Act** (31 USC 3729) | Federal fraud |
| **AKS** + **Stark** | Referral / financial relationships |

### GA State

| Statute | Subject |
|---|---|
| **O.C.G.A. Title 49, Chapter 4** | Public Assistance — includes Medicaid provisions |
| **O.C.G.A. §49-4-140 et seq.** | Medicaid Program |
| **O.C.G.A. §49-4-146.1** | **State Medicaid Fraud Statute** — false statements, payments, etc. |
| **O.C.G.A. Title 31** | Health (facility licensure, public health, hospital regs) |
| **O.C.G.A. §31-7-1 et seq.** | Healthcare facilities licensure |
| **O.C.G.A. Title 33** | Insurance regulation (incl. MA, CMO, PBM) |
| **O.C.G.A. Title 43** | Professional licensing |
| **O.C.G.A. §49-4-15** | Recipient fraud penalties |
| **Georgia Patient Right to Shop Act** | Price transparency `[Confirm year]` |

### Enforcement bodies

- **DCH Office of Inspector General (DCH OIG)** — Program Integrity Unit (claim review, fraud/waste/abuse), Third-Party Liability, Background Investigations, Pharmacy Lock-In, Office of Audits ([DCH OIG](https://dch.georgia.gov/office-inspector-general), [Report Fraud](https://dch.georgia.gov/office-inspector-general/report-medicaidpeachcare-kids-fraud)).
- **Georgia AG — Medicaid Fraud Division (MFD / MFCU)** — provider fraud + nursing-home patient abuse criminal/civil prosecution ([GA AG MFCU FAQ](https://law.georgia.gov/medicaid-fraud-control-unit), [Medicaid Fraud and Patient Protection Division](https://law.georgia.gov/contacts/georgia-medicaid-fraud-division)). **Lifetime recoveries: 90+ convictions, $19M+ criminal restitution, $108M+ civil settlements** under AG Carr ([GA AG — 2022 cumulative recovery press release](https://law.georgia.gov/press-releases/2022-04-05/carr-medicaid-fraud-division-obtains-recoveries-excess-85-million); 2025 ongoing recoveries [Acadia $1.087M Jan 2025](https://law.georgia.gov/press-releases/2025-01-16/carr-reaches-settlement-acadia-healthcare-secures-over-1-million-georgia)).
- Georgia ranks **among the top four MFCUs nationally** for FY2025 civil recoveries (Indiana, New York, Colorado, Georgia accounted for ~half of total) ([HHS-OIG MFCU FY2025 / 2025 MFCU annual report context](https://natlawreview.com/article/medicaid-fraud-control-units-2025-annual-report), [HHS-OIG MFCU 2025 data snapshot](https://oig.hhs.gov/documents/evaluation/11553/OEI-09-26-00140.pdf), [HHS-OIG MFCU FY2024](https://oig.hhs.gov/reports/all/2025/medicaid-fraud-control-units-annual-report-fiscal-year-2024/)).
- **Georgia State OIG** (cabinet) — cross-agency PI ([oig.georgia.gov](https://oig.georgia.gov/)).
- **DHS OIG** — recipient-side fraud overlap with DCH OIG.
- **CMS Focused Program Integrity Review** — periodic.

**Fraud referral flow:** Tip / data → **DCH OIG** triage → credible criminal allegation → referral to **GA AG MFD** → prosecution + recoupment. T-MSIS + UPIC reporting in parallel.

---

## 8. MedGuard360 Enterprise Solution Layout — GA

### 8.1 Connector inventory (GA-specific)

| # | Counterparty | Direction | Transport | Identity | Use case |
|---|---|---|---|---|---|
| 1 | GAMMIS (FFS claims) | Outbound + inbound | X12 837P/I/D, 835, 277CA via Gainwell SFTP / GAMMIS portal | Trading-partner ID + PGP | FFS claim submission |
| 2 | GAMMIS (eligibility) | Outbound | X12 270/271 + FHIR Coverage | mTLS + OAuth2 | Real-time eligibility |
| 3 | GAMMIS (PA) | Outbound | X12 278 + FHIR PAS | OAuth2 | PA for FFS |
| 4 | GAMMIS Provider Enrollment | Outbound | REST + SFTP roster | API key + mTLS | Provider directory sync |
| 5 | GAMMIS encounter ingestion | Outbound | X12 837 EPS | SFTP + PGP | Encounter submission |
| 6 | Amerigroup / Wellpoint of GA (incumbent) | Bi-directional | FHIR R4 + X12 | OAuth2 | Claims, PA, eligibility, encounter |
| 7 | CareSource Georgia (incumbent + 2025 winner) | Bi-directional | FHIR R4 + X12 | OAuth2 | Claims, PA, eligibility, encounter |
| 8 | Peach State Health Plan (incumbent) | Bi-directional | FHIR R4 + X12 | OAuth2 | Claims, PA, eligibility, encounter |
| 9 | Humana Employers Health Plan of GA (NOIA winner) | Bi-directional | FHIR R4 + X12 | OAuth2 | **Activates 2026-07-01** |
| 10 | Molina Healthcare of GA (NOIA winner) | Bi-directional | FHIR R4 + X12 | OAuth2 | **Activates 2026-07-01** |
| 11 | UnitedHealthcare of GA (NOIA winner) | Bi-directional | FHIR R4 + X12 | OAuth2 | **Activates 2026-07-01**; also Georgia Families 360° foster-care carrier |
| 12 | Palmetto GBA JJ (Medicare A/B for GA) | Outbound | X12 837 via EDI Gateway | Submitter ID + cert | Medicare primary for duals |
| 13 | CGS JC (DME MAC) | Outbound | X12 837P + CMN | Submitter ID | DMEPOS |
| 14 | GA Medicaid Pharmacy POS / PBM | Outbound | NCPDP D.0 | NCPDP BIN/PCN | Pharmacy POS |
| 15 | GaHIN (Georgia Health Information Network) | Bi-directional | FHIR R4, C-CDA, HL7v2 ADT | OAuth2 + SMART | HIE query, GeorgiaConnX, ADT |
| 16 | DBHDD (NOW/COMP waiver services + BH) | Bi-directional | REST + flat-file | API key | I/DD waivers + BH |
| 17 | DCH waiver operating units (CCSP/SOURCE/ICWP/GAPP) | Bi-directional | REST + flat-file | API key | Aged/disabled HCBS |
| 18 | NEMT regional contractors | Bi-directional | REST + 837P | OAuth2 | Trip auth + claim |
| 19 | DCH Healthcare Facility Regulation (HFR) | Inbound | CSV / REST | API key | Facility license verification |
| 20 | GA Composite Medical Board / Board of Nursing | Inbound | CSV / REST | API key | Practitioner license verification |
| 21 | T-MSIS extract | Outbound | flat-file via state | n/a (state-level) | Federal Medicaid reporting |
| 22 | DCH OIG fraud alerts | Outbound | REST webhook + secure email | mTLS + OAuth2 | Fraud-engine alert forwarding |
| 23 | GA AG MFD referral | Outbound | secure email + portal | mTLS | Criminal referral packets |
| 24 | DPH Vital Records | Inbound | flat-file | SFTP + PGP | Death-match suppression |
| 25 | Georgia Gateway (DHS eligibility) | Inbound | REST | API key | Eligibility intake cross-check |
| 26 | CMS Interop APIs (CMS-0057-F) | Bi-directional | FHIR R4 | SMART-on-FHIR | Member data sharing |
| 27 | Pathways to Coverage activity reporting | Inbound | REST / portal feed | OAuth2 | Qualifying activity verification |

---

## 9. GA HIE — Georgia Health Information Network (GaHIN)

- **Authority / Operator:** **Georgia Health Information Network, Inc. (GaHIN)** — the **State-Designated Entity** for Georgia's HIE; public-private partnership under DCH leadership ([GaHIN About](https://gahin.org/about-gahin), [DCH GaHIN page](https://dch.georgia.gov/divisionsoffices/office-information-technology/health-information-technology/georgia-health)).
- **Vendor / platform:** **Velatura Public Benefit Corporation** (technology partner) ([GaHIN](https://www.gahin.org/)).
- **Services:**
  - **GeorgiaConnX** — query-based clinical exchange ([GeorgiaConnX](https://www.gahin.org/products-services/georgiaconnx))
  - **ADT notifications**
  - **GeorgiaUnify Resource Directory** — community-services directory launched April 2025
  - **Social Care Integration Initiative** — launched July 2025 with DBHDD
  - C-CDA exchange, FHIR endpoints, public health gateway
- **Mandate:** GA has **no statutory HIE participation mandate** analogous to NC. Participation is voluntary, encouraged by DCH and CMS Promoting Interoperability programs.
- **MedGuard360 `hie-service` integration:**
  - Subscribe to GaHIN ADT for member events → trigger care-coord + fraud-anomaly checks.
  - Query GeorgiaConnX for PA supporting documentation.
  - Integrate GeorgiaUnify for SDOH service referrals.

---

## 10. GA Medicaid Program Integrity Workflows

### 10.1 Lifecycle

1. **Detection** — DCH OIG data analytics, UPIC, member/provider tips, CMO SIUs, MedGuard360 fraud-engine alerts.
2. **Triage** at DCH OIG — Program Integrity Unit clinical + statistical review, sampling; pharmacy lock-in workflow for member overutilization.
3. **Pre-payment review hold** or **post-payment recoupment**.
4. **Credible allegation of fraud (CAF)** under 42 CFR 455.23 → payment suspension.
5. **Referral** to **GA AG Medicaid Fraud Division (MFCU)**.
6. **Sanction**: termination + cross-state via T-MSIS/PECOS, FCA suit, restitution, exclusion.
7. **Recovery** booked to state + federal share (FMAP-weighted).

### 10.2 Stats

- GA AG MFD lifetime under AG Carr: **90+ convictions, $19M+ criminal restitution, $108M+ civil settlements**.
- FY2025 GA MFCU = **one of the top four MFCUs nationally for civil recoveries** (along with Indiana, New York, Colorado — together ~half of national civil total).
- Recent enforcement: **$1.087M Acadia Healthcare settlement Jan 2025**.
- ROI figures `[Confirm via HHS-OIG MFCU annual report data tables]`.

### 10.3 MedGuard360 fraud-engine → DCH OIG handoff

- Alert payload: provider NPI, CMO ID (if applicable), claim batch IDs, statistical confidence, scheme classification, evidence bundle.
- Transport: signed JSON over mTLS REST to DCH OIG ingestion endpoint `[Confirm endpoint via DCH IT]`.
- SLA: high-severity within 4h; routine batched daily.
- audit-service WORM retention 10y per O.C.G.A. retention schedule.

---

## 11. Funding & Federal Matching — FY2026

### FY2026 (Oct 1, 2025 – Sep 30, 2026) FMAP

- Federal Register publishes annual FMAP table ([89 FR / 2024-27910](https://www.federalregister.gov/documents/2024/11/29/2024-27910/federal-financial-participation-in-state-assistance-expenditures-federal-matching-shares-for)).
- **GA traditional FMAP FY2026:** approximately **65–66%** (GA has historically sat in the mid-60s band) `[Confirm exact rate via [KFF FMAP table](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/) and [FFIS Final FY2026 FMAPs](https://ffis.org/issue-brief/final-fy-2026-fmaps/)]`.
- **Expansion FMAP:** **N/A — Georgia has not adopted full expansion.** **Pathways to Coverage gets traditional FMAP**, NOT the 90% expansion match (a politically significant fact: CMS approved Pathways without granting expansion FMAP).
- **CHIP enhanced FMAP (E-FMAP):** ~75–76% `[Confirm via MACPAC Exhibit 6](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)`.
- **Admin match:** 50% federal baseline; 75% MMIS O&M; 90% MMIS DDI; 75/90 eligibility; 75% fraud detection systems per 42 CFR 433.111.

### OBBB Act impact (HR 1)

- Because GA has not expanded Medicaid, OBBB Act provisions affecting expansion FMAP are not directly applicable. Work-requirement provisions overlap with the existing Pathways model. Eligibility-redetermination and provider-tax provisions still apply `[Confirm GA-specific impacts]`.

### Why FMAP matters for MedGuard360

- MMIS-adjacent functions (claims, PA, encounter aggregation, fraud detection) qualify for **75% O&M / 90% DDI** match under CMS MITA + Streamlined Modular Certification.
- Fraud detection qualifies under 42 CFR 433.111(b)(2) for enhanced match.

---

## 12. Differences from NC — Delta Callouts

| Axis | **North Carolina** | **Georgia** | Implication for MedGuard360 |
|---|---|---|---|
| Medicaid expansion | YES (full ACA, Dec 2023) | **NO — Pathways to Coverage 1115 partial conditional expansion** (≤100% FPL with work activity); extended through 12/31/2026 | Pathways requires activity-reporting integration; no 138% FPL cohort |
| Pathways FMAP | n/a | **Traditional FMAP**, NOT 90% expansion match | Lower federal share on Pathways services |
| Single state agency | NC DHHS (DHB) | **DCH** (Department of Community Health) | Different connector endpoints, identity model |
| Managed-care plan label | **PHP** / Standard Plan / Tailored Plan | **CMO** (Care Management Organization) | Terminology change in member-facing UI |
| Managed care model | 5 Std PHPs + 4 Tailored Plans + CFSP + EBCI Tribal | **3 incumbent CMOs** through 2026-06-30 → **4 new CMOs (CareSource + Humana + Molina + UHC)** from 2026-07-01 (see [`PROCUREMENT-STATUS.md`](./PROCUREMENT-STATUS.md)) | Dual-active payer-ID config required across the 2026-07-01 cutover |
| Foster-care plan transition | CFSP — Healthy Blue Care Together (launched Dec 2025) | **Georgia Families 360°**: Amerigroup → **UnitedHealthcare** on 2026-07-01 (~27K children/youth) | Patient-service + crisis-service carrier-template swap on cutover |
| ABD population | Mostly into Managed Care | Historically FFS; **~200K members carve in to managed care mid-2026** under the four new CMOs | Add ABD claim routing to four new CMOs after their go-live |
| Plan brand | NC Medicaid Managed Care | **Georgia Families®** + **Georgia Families 360°** (foster care) | Different member portal branding |
| BH carve-out | Tailored Plans (4 LME/MCOs) for SMI/SUD/IDD/TBI | **Integrated within CMOs** for routine BH; **DBHDD operates I/DD waivers (NOW/COMP) FFS via GAMMIS** | No tailored-plan claim path; waiver carve-out via DBHDD |
| Tribal plan | EBCI Tribal Option | None comparable | No Tribal IMCE connector |
| 1115 demos | Medicaid Transformation + HOP (paused 2025) | **Pathways to Coverage + Planning for Healthy Babies (P4HB)** | Pathways activity-reporting connector required |
| MMIS operator | Gainwell (NCTracks); Optum PDM/CVO incoming 2026 | **Gainwell Technologies (GAMMIS since 2010, succeeded HP/EDS/DXC)** | Same Gainwell heritage — substantial EDI code reuse |
| MMIS portal | [nctracks.nc.gov](https://www.nctracks.nc.gov/) | [mmis.georgia.gov](https://www.mmis.georgia.gov/portal/Default.aspx?tabid=35) | Different endpoint URL |
| HIE | NC HealthConnex (SAS Institute) with statutory mandate (enforcement suspended) | **GaHIN** with **Velatura** platform — **no hard statutory mandate** | Voluntary HIE participation |
| HIE vendor | SAS Institute | **Velatura PBC** | Different FHIR endpoint stack |
| MFCU | NC DOJ MID | **GA AG Medicaid Fraud Division (MFD)** — top-four MFCU nationally for FY2025 civil recoveries | High enforcement appetite; align alert SLAs |
| MAC (A/B) | Palmetto **JM** (NC/SC/VA/WV) | **Palmetto JJ (AL/GA/TN)** | Same vendor (Palmetto), different jurisdiction submitter IDs |
| DME MAC | CGS JC | **CGS JC** (same) | Reuse NC CGS JC connector |
| FMAP FY2026 | ~65% | **~65–66%** `[Confirm]` | Similar |
| Statutory citation root | NCGS Ch. 108A | **O.C.G.A. Title 49 Ch. 4 + Title 31 + Title 33** | Different statute-id mapping |
| Pharmacy POS | OptumRx (NC Medicaid PBM) | GAMMIS Medicaid POS + CMO PBMs `[Confirm current GA Medicaid PBM]` | Different NCPDP processor IDs |

**Cross-state reusability:**
- **CGS JC (DME)** connector identical to NC/SC — direct reuse.
- **Palmetto** vendor familiarity reused for **JJ**, but JJ has different submitter IDs and EDI submitter URLs vs JM.
- **GAMMIS Gainwell heritage** is substantially similar to NCTracks Gainwell heritage — X12 transport profile, SFTP/EDI patterns, NPI taxonomy reuse expected. Major differences in CMO list, HIE vendor (Velatura vs SAS), and the **Pathways activity reporting** integration which has no NC analog.
- **MFCU referral pattern** uses a different state AG endpoint but the same JSON evidence-bundle schema as NC and SC.

---

## Appendix A — Acronym Glossary (GA-specific additions)

| Acronym | Expansion |
|---|---|
| ABD | Aged, Blind, Disabled |
| CCSP | Community Care Services Program (GA 1915(c) waiver) |
| CMO | Care Management Organization (GA term for MCO) |
| COMP | Comprehensive Supports Waiver (GA I/DD) |
| CSB | Community Service Board (GA DBHDD local BH provider) |
| DBHDD | GA Dept of Behavioral Health and Developmental Disabilities |
| DCH | GA Dept of Community Health (Medicaid agency) |
| DHS / DFCS | GA Dept of Human Services / Division of Family and Children Services |
| DPH | GA Dept of Public Health |
| GaHIN | Georgia Health Information Network |
| GAMMIS | Georgia Medicaid Management Information System |
| GAPP | Georgia Pediatric Program (1915(c) waiver, medically fragile children) |
| Georgia Families | DCH's Medicaid managed-care brand |
| Georgia Families 360° | DCH's foster-care managed-care brand |
| Georgia Gateway | GA DHS integrated eligibility portal |
| GeorgiaConnX | GaHIN's query-based clinical-exchange product |
| GeorgiaUnify | GaHIN community-services / SDOH directory |
| HFR | DCH Healthcare Facility Regulation |
| ICWP | Independent Care Waiver Program (1915(c)) |
| LIM | Low-Income Medicaid (GA category) |
| MFD | (GA AG) Medicaid Fraud Division |
| NOW | New Options Waiver (GA I/DD 1915(c)) |
| O.C.G.A. | Official Code of Georgia Annotated |
| OIG (DCH) | DCH Office of Inspector General |
| P4HB | Planning for Healthy Babies (1115 family planning) |
| Pathways to Coverage | GA 1115 work-conditional partial expansion |
| PCH | Personal Care Home (GA assisted-living licensure) |
| PeachCare for Kids | GA's separate CHIP program |
| RSM | Right from the Start Medicaid (pregnant women/infants) |
| SOURCE | Service Options Using Resources in a Community Environment (1915(c) waiver) |

---

## Appendix B — Primary Sources

- [DCH Home](https://dch.georgia.gov/)
- [GA Medicaid Home](https://medicaid.georgia.gov/)
- [DCH Medicaid Managed Care](https://dch.georgia.gov/medicaid-managed-care)
- [GA Medicaid CMO list](https://medicaid.georgia.gov/programs/all-programs/georgia-families/care-management-organizations-cmo)
- [Georgia Families program page](https://medicaid.georgia.gov/programs/all-programs/georgia-families)
- [DCH Network Adequacy](https://dch.georgia.gov/medicaid-managed-care/network-adequacy)
- [DCH Office of Inspector General](https://dch.georgia.gov/office-inspector-general)
- [DCH OIG — Report Medicaid Fraud](https://dch.georgia.gov/office-inspector-general/report-medicaidpeachcare-kids-fraud)
- [GA AG — Medicaid Fraud Control Unit FAQ](https://law.georgia.gov/medicaid-fraud-control-unit)
- [GA AG — Medicaid Fraud and Patient Protection Division contact](https://law.georgia.gov/contacts/georgia-medicaid-fraud-division)
- [GA AG — Acadia $1.087M settlement Jan 2025](https://law.georgia.gov/press-releases/2025-01-16/carr-reaches-settlement-acadia-healthcare-secures-over-1-million-georgia)
- [GA AG — $85M+ cumulative recoveries (2022 press release)](https://law.georgia.gov/press-releases/2022-04-05/carr-medicaid-fraud-division-obtains-recoveries-excess-85-million)
- [HHS-OIG MFCU FY2024 Annual Report](https://oig.hhs.gov/reports/all/2025/medicaid-fraud-control-units-annual-report-fiscal-year-2024/)
- [HHS-OIG MFCU 2025 Data Snapshot (OEI-09-26-00140)](https://oig.hhs.gov/documents/evaluation/11553/OEI-09-26-00140.pdf)
- [Nat Law Review — MFCU 2025 Annual Report](https://natlawreview.com/article/medicaid-fraud-control-units-2025-annual-report)
- [GAMMIS Web Portal](https://www.mmis.georgia.gov/portal/Default.aspx?tabid=35)
- [Gov. Kemp — CMS Approves Pathways Extension Sep 2025](https://gov.georgia.gov/press-releases/2025-09-25/cms-approves-georgia-pathways-coveragetm-extension-further-validates)
- [DCH — Pathways Updates Effective Oct 1, 2025](https://dch.georgia.gov/announcement/2025-10-01/pathways-updates-oct12025)
- [Pathways data tracker](https://www.georgiapathways.org/data-tracker)
- [GBPI — GA Health Budget Primer SFY 2025](https://gbpi.org/georgia-health-budget-primer-for-state-fiscal-year-2025/)
- [GEEARS — Medicaid + PeachCare 2025 brief](https://geears.org/wp-content/uploads/Medicaid-and-PeachCare-Info-Brief-2025.pdf)
- [NDDS — GA CMO Contract Shakeup Jan 2025](https://www.ndds.org/advocacy/legislative-insider/2025/01/24/georgia-department-of-community-health-announces-major-cmo-contract-shakeup)
- [Capitol Beat — Confusion over GA Medicaid management May 2025](https://capitol-beat.org/2025/05/confusion-concern-over-the-future-of-medicaid-management-in-georgia/)
- [Audits.GA — Limited Review of CMO Financial Reports](https://www.audits.ga.gov/ReportSearch/download/11870)
- [GaHIN Home](https://www.gahin.org/) · [GaHIN About](https://gahin.org/about-gahin) · [GeorgiaConnX](https://www.gahin.org/products-services/georgiaconnx)
- [DCH Health IT / GaHIN](https://dch.georgia.gov/divisionsoffices/office-information-technology/health-information-technology/georgia-health)
- [Palmetto GBA JJ Part A](https://palmettogba.com/jja) · [JJ Part B](https://palmettogba.com/jjb)
- [CMS A/B MAC Jurisdiction J (JJ)](https://www.cms.gov/Medicare/Medicare-Contracting/Medicare-Administrative-Contractors/Who-are-the-MACs-A-B-MAC-Jurisdiction-J-JJ)
- [CMS JJ MAC Award Fact Sheet (2024)](https://www.cms.gov/files/document/jj-mac-award-fact-sheet-09012024.pdf)
- [Palmetto JJ Award Announcement](https://corporate.palmettogba.com/about/happenings/palmetto-gba-awarded-jurisdiction-j-ab-mac-contract/)
- [CMS DME MAC JC](https://www.cms.gov/medicare/medicare-contracting/medicare-administrative-contractors/who-are-the-macs-dme-mac-jurisdiction-c-jc) · [CGS JC](https://www.cgsmedicare.com/jc/)
- [Federal Register FMAP FY2026 (2024-27910)](https://www.federalregister.gov/documents/2024/11/29/2024-27910/federal-financial-participation-in-state-assistance-expenditures-federal-matching-shares-for)
- [KFF FMAP State Indicator](https://www.kff.org/medicaid/state-indicator/federal-matching-rate-and-multiplier/)
- [MACPAC Exhibit 6 — FMAPs by State](https://www.macpac.gov/publication/federal-medical-assistance-percentages-fmaps-and-enhanced-fmaps-e-fmaps-by-state-selected-periods/)
- [FFIS Final FY2026 FMAPs](https://ffis.org/issue-brief/final-fy-2026-fmaps/)
- [healthinsurance.org — Medicaid in GA](https://www.healthinsurance.org/medicaid/georgia/)
- [KFF Medicaid in GA May 2025](https://files.kff.org/attachment/fact-sheet-medicaid-state-GA)
- [Georgia CareConnect Medicaid Data Reports](https://careconnect.georgia.gov/gcc/s/for-stakeholders-partners/data-reporting/medicaid-data-reports?language=en_US)
- [Becker's MA Penetration 2024](https://beckerspayer.com/payer/medicare-advantage-penetration-by-state-2024.html)
- [KFF — Status of State Medicaid Expansion Decisions](https://www.kff.org/medicaid/status-of-state-medicaid-expansion-decisions/)

---

*Document owner: MedGuard360 Enterprise Integrations. File: `integrations/ga-enterprise/README.md`. Cross-references: [`PROCUREMENT-STATUS.md`](./PROCUREMENT-STATUS.md) (current procurement snapshot — re-snapshotted as facts move), `integrations/nc-enterprise/`, `integrations/sc-enterprise/`, `integrations/PILOT-STATES-COMPARISON.md`.*
