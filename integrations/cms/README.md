# Federal CMS Integration Surface — MedGuard360

> Scope: federal CMS (Centers for Medicare & Medicaid Services) and adjacent federal systems (HHS-OIG, GSA SAM.gov) that a Medicaid/Medicare platform must integrate with.
> **Out of scope here:** NC Medicaid (NCTracks) — see `../nctracks/README.md`. This document only flags where CMS data flows into NCTracks.
>
> **Verification note:** Web access was unavailable during authoring. Every URL, IG version, and date below should be reconfirmed against the official CMS source before any production go-live. Items marked **[VERIFY]** are particularly volatile.

---

## 1. CMS Interoperability and Prior Authorization Final Rule (CMS-0057-F)

Published **Jan 17, 2024**. Final rule replaces the previously-proposed CMS-0057-P. Applies to **Medicare Advantage organizations, state Medicaid and CHIP Fee-for-Service programs, Medicaid managed care plans, CHIP managed care entities, and QHP issuers on the FFEs** (collectively "impacted payers").

Primary CMS reference page:
`https://www.cms.gov/priorities/key-initiatives/burden-reduction/interoperability/policies-and-regulations/cms-interoperability-and-prior-authorization-final-rule-cms-0057-f`

Federal Register: 89 FR 8758 (`https://www.federalregister.gov/documents/2024/02/08/2024-02194/`).

### 1.1 Required APIs and compliance dates

| API | Compliance date | Implementation guides | Notes |
|---|---|---|---|
| **Patient Access API** | Already live (since **Jul 1, 2021** under CMS-9115-F); CMS-0057-F adds prior-authorization data, requires reporting metrics annually starting **Mar 31, 2026** | HL7 FHIR R4, US Core 3.1.1+, CARIN BB IG, Da Vinci PDex | Must now include PA request/decision data items. |
| **Provider Access API** | **Jan 1, 2027** | HL7 FHIR R4, US Core, Da Vinci PDex | Payer→Provider. Patient attribution-based. Opt-out model for patients. |
| **Payer-to-Payer API** | **Jan 1, 2027** | HL7 FHIR R4, Da Vinci PDex | Replaces the 2022 enforcement-discretion version. Opt-in by patient. 5-year claims history. |
| **Prior Authorization API (PARDD)** | **Jan 1, 2027** | **Da Vinci PAS, CRD, DTR** (FHIR R4) | Excludes Rx PA. Decisions: 72 hr urgent / 7 calendar days non-urgent for MA, Medicaid, CHIP (rule also tightened decision timeframes). |
| **PA metrics public reporting** | First report due **Mar 31, 2026** | n/a | Aggregate annual stats on PA volume, denials, appeals. |

### 1.2 Da Vinci Implementation Guides — exact IGs to implement

All published by HL7 under the Da Vinci Project (`http://hl7.org/fhir/us/davinci-*`):

- **PAS — Prior Authorization Support** — `http://hl7.org/fhir/us/davinci-pas/` — wraps X12 278 in FHIR Claim/ClaimResponse. **This is the wire format mandated by CMS-0057-F.**
- **CRD — Coverage Requirements Discovery** — `http://hl7.org/fhir/us/davinci-crd/` — CDS Hooks at order/encounter time; payer returns coverage requirements.
- **DTR — Documentation Templates and Rules** — `http://hl7.org/fhir/us/davinci-dtr/` — SMART-on-FHIR app + CQL/Questionnaires to fulfill payer documentation.
- **PDex — Payer Data Exchange** — `http://hl7.org/fhir/us/davinci-pdex/` — used for Patient Access, Provider Access, and Payer-to-Payer payloads.
- **CDex — Clinical Data Exchange** — `http://hl7.org/fhir/us/davinci-cdex/` — provider→payer clinical attachments (often paired with PAS/DTR).
- **Formulary, ATR, HRex, PCDE** — supporting IGs referenced by the above.

**[VERIFY]** IG versions: production-ready releases as of authoring were PAS STU 2.0.1, CRD STU 2.0.0, DTR STU 2.0.1, PDex 2.0.0. CMS-0057-F technical conformance references *specific STU versions* — confirm against the current rule text and any subsequent ONC/ASTP `(b)(11)` certification criteria.

### 1.3 Operating Rules — CAQH CORE

CMS-0057-F **does not** mandate CAQH CORE Phase V FHIR operating rules; however CAQH CORE has published Phase V operating rules for FHIR-based PA that align with PAS/CRD/DTR. Most clearinghouse partners require CORE certification for production connectivity.

- CAQH CORE: `https://www.caqh.org/core`
- CORE certification (HIPAA mandate for eligibility 270/271, claim status 276/277, EFT/ERA): required for any clearinghouse role. **Manual application** — no API. Multi-month certification testing process.

### 1.4 What MedGuard360 must build (if acting as an impacted payer or on behalf of one)

1. FHIR R4 server exposing `Patient`, `Coverage`, `ExplanationOfBenefit`, `Claim`, `ClaimResponse`, `Observation`, `Condition`, `MedicationRequest`, `Encounter`, `DocumentReference`, plus Da Vinci profiles.
2. SMART-on-FHIR / OAuth2 authorization server (UDAP recommended for B2B per ASTP guidance).
3. Member-attribution service (Provider Access).
4. Opt-in/opt-out ledger (consent service).
5. Da Vinci PAS endpoint accepting `Claim/$submit` and returning `ClaimResponse`.
6. CRD CDS Hooks service.
7. DTR Questionnaire/QuestionnaireResponse + CQL execution engine.
8. PA metrics aggregator → annual public reporting JSON/CSV.

---

## 2. CMS Quality Payment Program / MIPS

MedGuard360 may submit MIPS data on behalf of clinicians/groups acting as a **Qualified Registry (QR)**, **Qualified Clinical Data Registry (QCDR)**, or via direct EHR submission.

- Program home: `https://qpp.cms.gov/`
- Developer / submissions API: `https://qpp.cms.gov/developers` — REST API requires a JWT issued by CMS after registering as a third-party intermediary. **Access agreement required** — not self-service.
- **QRDA III** is the XML submission format for MIPS aggregated measures (CDA-based; HL7 QRDA Category III IG).
- **eCQMs**: annual update cycle; current measure set published yearly by CMS at `https://ecqi.healthit.gov/`.

### 2.1 CMS Web Interface deprecation

- The **CMS Web Interface** collection type was **sunset after the 2021 performance year** for MIPS clinicians/groups; ACOs in the Medicare Shared Savings Program transitioned through the **APP (APM Performance Pathway)** and the **Medicare CQM** / **eCQM/MIPS CQM** options.
- For the **Shared Savings Program (MSSP)**, the Web Interface was extended for ACOs through PY 2024 as a transition; CMS finalized the move to all-payer eCQM/CQM reporting under the APP Plus measure set in the CY 2024 PFS final rule. **[VERIFY current PY]**

### 2.2 Submission timeline

- Performance year: calendar year.
- Submission window: typically **Jan 2 – Mar 31** of the year following the performance year.
- QPP API requires submitter ID, vendor ID, and TIN-level access scoping.

---

## 3. PECOS — Provider Enrollment, Chain & Ownership System

PECOS is the system of record for Medicare enrollment of providers and suppliers.

- Public PECOS lookup (read-only, no API): `https://pecos.cms.hhs.gov/`
- **Ordering & Referring file** (CSV, weekly): `https://data.cms.gov/provider-characteristics/medicare-provider-supplier-enrollment/order-and-referring`
- **Medicare Fee-For-Service Public Provider Enrollment** dataset (downloadable, refreshed quarterly): `https://data.cms.gov/provider-characteristics/medicare-provider-supplier-enrollment/medicare-fee-for-service-public-provider-enrollment`
- **PECOS Revalidation List**: `https://data.cms.gov/provider-characteristics/medicare-provider-supplier-enrollment/revalidation-due-date-list`

### 3.1 What's exposed publicly vs. gated

| Data | Available how |
|---|---|
| Provider Medicare enrollment status (enrolled/not enrolled, specialty, state) | **CSV/JSON downloads** via `data.cms.gov` Socrata API |
| Ordering/referring eligibility | CSV download (Order & Referring) |
| Ownership, managing employees, adverse legal history | **NOT public** — requires CMS data-use agreement; MACs access via internal PECOS UI |
| Revalidation due date | CSV download |

### 3.2 Socrata API pattern

`data.cms.gov` exposes Socrata-style endpoints, e.g.:
```
GET https://data.cms.gov/data-api/v1/dataset/{datasetId}/data?conditions[0][property]=NPI&conditions[0][value]=1234567890
```
Stable but unauthenticated; rate-limited by IP. **No SLA.**

### 3.3 42 CFR 455 Subpart E screening — federal floor

For Medicaid provider screening, states must verify:
1. NPI (NPPES) — see §4.
2. Licensure status (state board — varies).
3. Database checks: **LEIE, SAM.gov, Death Master File, NPPES, PECOS** (§§ 5, 6, 3).
4. Site visits and fingerprint-based criminal background checks for "high" categorical risk.

**There is no single federal API** that aggregates these checks. MedGuard360 must orchestrate each separately. This pattern feeds the NCTracks provider-enrollment workflow (see `../nctracks/README.md` for state side).

---

## 4. NPI Registry — NPPES public API

Maintained by CMS; covers all Type 1 (individual) and Type 2 (organization) NPIs.

- API root: `https://npiregistry.cms.hhs.gov/api/`
- Current version: **`?version=2.1`** (required query parameter).
- Public, unauthenticated, no API key. Rate limit: undocumented; soft-throttled by IP — **expect 429s under burst load**, batch with backoff.
- HTML lookup: `https://npiregistry.cms.hhs.gov/search`

### 4.1 Common query parameters

```
GET https://npiregistry.cms.hhs.gov/api/?version=2.1
    &number=1234567890           # exact NPI
    &enumeration_type=NPI-1|NPI-2
    &first_name=&last_name=
    &organization_name=
    &taxonomy_description=
    &city=&state=&postal_code=
    &limit=200&skip=0
```

### 4.2 Fields returned

- `number` (NPI)
- `enumeration_type` (`NPI-1` individual, `NPI-2` organization)
- `basic` — name, sole proprietor flag, enumeration date, status (`A` active, `D` deactivated), last_updated, **deactivation_date / deactivation_reason** when applicable
- `addresses[]` — `LOCATION` and `MAILING` (note: parsed inconsistently — defensive parsing required)
- `taxonomies[]` — Healthcare Provider Taxonomy Codes with primary flag and license
- `identifiers[]` — other IDs (Medicaid, Medicare legacy, etc.)
- `endpoints[]` — Direct/FHIR endpoints (rarely populated)
- `other_names[]`

### 4.3 Bulk extract

Full NPPES monthly download: `https://download.cms.gov/nppes/NPI_Files.html` (~10 GB CSV). Use this for nightly internal mirror rather than hammering the API.

---

## 5. LEIE — OIG List of Excluded Individuals/Entities

Operated by **HHS-OIG**, not CMS proper. Required check under 42 CFR 1001/1002.

- Home: `https://oig.hhs.gov/exclusions/`
- **Online search**: `https://exclusions.oig.hhs.gov/` — HTML form, no documented API.
- **Monthly download (authoritative)**: `https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv` — full LEIE in CSV; updated by ~15th of each month. Supplemental monthly delta files also available.
- **No JSON/REST API exists.** Vendors must download the CSV monthly and load into a queryable store.

### 5.1 Match strategy

LEIE entries are matched on (Last Name, First Name, DOB), (NPI when present), or (Business Name, EIN). Many older exclusions **have no NPI** — name/DOB matching is mandatory and produces false positives that require manual adjudication. OIG publishes verification guidance: `https://oig.hhs.gov/exclusions/background.asp`.

### 5.2 Monthly cadence requirement

OIG guidance (2013, still current): screen all employees, contractors, vendors against LEIE **at hire and monthly thereafter**. Medicaid states must also screen enrolled providers monthly (42 CFR 455.436).

---

## 6. SAM.gov — System for Award Management (GSA)

Federal exclusions and entity registration. Required check under 42 CFR 455.436.

- Public site: `https://sam.gov/`
- API portal: `https://open.gsa.gov/api/` and `https://api.sam.gov/`
- **Entity API**: `https://api.sam.gov/entity-information/v3/entities` — entity registrations (UEI, CAGE, EIN-derived).
- **Exclusions API**: `https://api.sam.gov/entity-information/v4/exclusions` — current and historical exclusions. **Replaces the old EPLS.**
- **Authentication**: API key from `https://sam.gov/profile/details` (user account required). Two tiers — **public** (limited fields, no PII) and **non-public/sensitive** (requires a separate System Account + data access role).
- Rate limits: 1,000 calls/day (public key) — **request a higher tier for production**.

### 6.1 Screening usage

Query by name, EIN (called "Taxpayer Identification Number" in payload — partially redacted on public tier), DUNS (legacy, deprecated), UEI.

```
GET https://api.sam.gov/entity-information/v4/exclusions?api_key={key}
    &exclusionName={name}
    &exclusionType=Individual|Firm|Special+Entity+Designation
```

---

## 7. CMS Medicare Claims, Fee Schedules, and Code Sets

All downloads; **no transactional API** for fee schedules.

| Resource | URL | Cadence |
|---|---|---|
| Physician Fee Schedule (PFS) | `https://www.cms.gov/medicare/payment/fee-schedules/physician` | Annual + quarterly RVU updates |
| PFS lookup tool | `https://www.cms.gov/medicare/physician-fee-schedule/search` | Live |
| HCPCS Level II quarterly updates | `https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-system/quarterly-update` | Quarterly |
| HCPCS annual file | `https://www.cms.gov/medicare/coding-billing/healthcare-common-procedure-system/hcpcs-quarterly-update` | Annual |
| ICD-10-CM (diagnosis) | `https://www.cms.gov/medicare/coding-billing/icd-10-codes` (CDC also publishes: `https://www.cdc.gov/nchs/icd/icd-10-cm/`) | Annual Oct 1 |
| ICD-10-PCS (inpatient procedure) | `https://www.cms.gov/medicare/coding-billing/icd-10-codes` | Annual Oct 1 |
| NCCI Procedure-to-Procedure (PTP) edits | `https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits` | Quarterly |
| NCCI Medically Unlikely Edits (MUE) | same | Quarterly |
| Medicaid NCCI | `https://www.medicaid.gov/medicaid/program-integrity/national-correct-coding-initiative` | Quarterly |
| DRG / IPPS PRICER software | `https://www.cms.gov/medicare/payment/prospective-payment-systems` | Annual |

**Format:** mostly ZIP of CSV/XLSX/PDF. Some PFS files are flat fixed-width. CMS does not provide a versioned REST endpoint for fee schedule lookups — vendors mirror locally.

---

## 8. Blue Button 2.0 — Medicare beneficiary claims via FHIR

CMS-operated SMART-on-FHIR API exposing Medicare Parts A, B, D claims for **opted-in beneficiaries**.

- Developer home: `https://bluebutton.cms.gov/developers/`
- Sandbox base: `https://sandbox.bluebutton.cms.gov`
- Production base: `https://api.bluebutton.cms.gov`
- FHIR R4: `https://api.bluebutton.cms.gov/v2/fhir/` (v2 = FHIR R4 since 2020; v1 = DSTU2, still available).
- Resources: `Patient`, `Coverage`, `ExplanationOfBenefit` (+ `Practitioner`, `Organization` references). Carrier (Part B), Inpatient, Outpatient, HHA, Hospice, SNF, DME, PDE (Part D) claim types.

### 8.1 OAuth2 onboarding

1. Create developer account at `https://bluebutton.cms.gov/developers/`.
2. Register sandbox app → receive `client_id` + `client_secret`.
3. Implement OAuth2 **authorization-code + PKCE**. Auth endpoint: `https://sandbox.bluebutton.cms.gov/v2/o/authorize/`; token endpoint: `/v2/o/token/`.
4. Test with synthetic beneficiaries (CMS provides sandbox users).
5. **Apply for production access** — requires:
   - Demo video of consent flow
   - Privacy policy + Terms of Service URLs
   - Production redirect URI
   - CMS review (multi-week)
6. Production credentials issued separately; sandbox creds **do not** work in prod.

### 8.2 Scopes

`patient/Patient.read`, `patient/Coverage.read`, `patient/ExplanationOfBenefit.read`, `profile`, `openid`. No write scopes — read-only.

### 8.3 Limits

- 1 access token per beneficiary per app, ~60-minute lifetime; refresh token lifetime ~60 days.
- Only the beneficiary may grant — no payer or provider delegation.
- **No bulk export** of multiple beneficiaries — beneficiary-by-beneficiary OAuth only.

---

## 9. Paper / form-driven workflows (no API)

These are **PDF or paper-based** federal forms. MedGuard360 must produce/consume them as PDFs; there is no transactional API.

| Form | Purpose | When |
|---|---|---|
| **CMS-1500 (02-12)** | Professional claim (non-institutional) | Submitted electronically as X12 837P; paper version still accepted by some payers. Form image standard maintained by NUCC: `https://www.nucc.org/`. |
| **UB-04 / CMS-1450** | Institutional claim (hospital, SNF, HHA, hospice) | Electronic equivalent: X12 837I. Form standard maintained by NUBC. |
| **CMS-2728** | ESRD Medical Evidence Report (initial ESRD entitlement) | Submitted by dialysis facility within 45 days of chronic dialysis start or transplant. Filed via CROWNWeb/EQRS — `https://eqrs.cms.gov/`. EQRS has limited internal APIs only (CMS contractor). |
| CMS-2746 | ESRD Death Notification | EQRS. |
| CMS-855A/B/I/O/R/S | Medicare enrollment applications | Submitted via **PECOS web UI** or paper. No public API. |
| CMS-588 | EFT authorization | Paper/PECOS. |
| CMS-460 | Medicare Participating Provider Agreement | Annual paper. |

**Flag:** any workflow that asks "submit CMS-855…" → there is no API. PECOS web is the only digital path.

---

## 10. Onboarding paths for MedGuard360

### 10.1 As a Blue Button 2.0 app developer

- Self-service sandbox; production gated by CMS review (see §8.1).
- No formal "vendor" relationship — but the app's privacy policy and consent UI are reviewed.

### 10.2 As an impacted payer (CMS-0057-F)

- Not a registration with CMS — compliance is enforced via CMS audits and the rule's metrics reporting.
- **Required:** annual PA metrics reporting (`https://www.cms.gov/`), conformance to the IGs, public-facing API documentation page, attestation in HPMS (Medicare Advantage) / state Medicaid contract.

### 10.3 As a healthcare clearinghouse

- **CAQH CORE certification** for each HIPAA transaction (270/271 eligibility, 276/277 claim status, 835 ERA, 820 premium payment). `https://www.caqh.org/core/core-certification`.
- **EDI trading partner agreements** with each payer (no central registry).
- **HIPAA covered entity** registration is implicit — no separate federal license.
- For Medicare connectivity: **EDISS / CEDI / MAC** enrollment depending on claim type. e.g., DME → CEDI at `https://www.ngscedi.com/`.

### 10.4 As a Qualified Registry / QCDR (MIPS submission)

- Annual self-nomination at `https://qpp.cms.gov/resources/resource-library` — typically open July-September for the following PY.
- Requires QPP API access agreement.

### 10.5 As a Medicare Provider/Supplier (if MedGuard360 itself bills)

- File CMS-855 via PECOS. Not relevant if MedGuard360 is purely a SaaS platform.

---

## 11. Specific endpoint quick-reference

| System | Base URL | Auth | Format |
|---|---|---|---|
| NPPES NPI Registry | `https://npiregistry.cms.hhs.gov/api/?version=2.1` | None | JSON |
| NPPES bulk download | `https://download.cms.gov/nppes/NPI_Files.html` | None | CSV (zip) |
| Blue Button 2.0 sandbox | `https://sandbox.bluebutton.cms.gov/v2/fhir/` | OAuth2 (sandbox creds) | FHIR R4 JSON |
| Blue Button 2.0 prod | `https://api.bluebutton.cms.gov/v2/fhir/` | OAuth2 (prod creds, gated) | FHIR R4 JSON |
| OIG LEIE download | `https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv` | None | CSV |
| OIG LEIE search (HTML) | `https://exclusions.oig.hhs.gov/` | None | HTML (scraping discouraged — use CSV) |
| SAM.gov entities | `https://api.sam.gov/entity-information/v3/entities` | API key | JSON |
| SAM.gov exclusions | `https://api.sam.gov/entity-information/v4/exclusions` | API key | JSON |
| CMS open data | `https://data.cms.gov/data-api/v1/dataset/{id}/data` | None | JSON/CSV |
| PECOS Ordering/Referring | `https://data.cms.gov/.../order-and-referring` | None | CSV |
| QPP submissions API | `https://qpp.cms.gov/api/submissions/` | JWT (agreement-gated) | JSON |
| CMS Coverage IG (Da Vinci) | `http://hl7.org/fhir/us/davinci-crd/` and `/davinci-dtr/` | n/a (spec) | FHIR R4 |

---

## 12. North Carolina overlay — federal vs state

NC Medicaid is administered by **NC DHHS Division of Health Benefits**; **NCTracks** (operated by Gainwell Technologies for NC DHHS) is the state MMIS handling claims, prior auth, provider enrollment for Medicaid FFS and as system-of-record for managed care providers.

**Federal / state split:**

| Capability | Federal source | State touchpoint |
|---|---|---|
| Provider NPI of record | NPPES (CMS) | NCTracks pulls from NPPES at enrollment + on revalidation. |
| Medicare enrollment status | PECOS (CMS) | NCTracks checks PECOS as part of 42 CFR 455 screening; "PECOS-enrolled" status flows into NC ordering/referring validation. |
| LEIE / SAM exclusions | OIG / GSA | NCTracks monthly screening against LEIE + SAM; MedGuard360 should screen independently to detect issues before NCTracks does. |
| CMS-0057-F APIs | **NC Medicaid as impacted payer** must implement | NC DHHS publishes payer-level FHIR endpoints fronting NCTracks data — these are the Patient/Provider/Payer-to-Payer/PA APIs for NC Medicaid FFS. Managed care plans (PHPs) each publish their own. |
| Fee schedules | CMS PFS | NC publishes its own Medicaid fee schedule layered on CMS rates; NCTracks is the source-of-truth for NC Medicaid pricing. |
| MIPS / QPP | CMS (Medicare-only) | Not applicable to Medicaid-only providers. |
| Prior authorization (state Medicaid scope) | CMS-0057-F mandates the API | NCTracks/PHPs are the actual PA decision engines; the FHIR API is a façade over their existing logic. |

**Key rule:** CMS Interop applies to NC Medicaid only via DHHS-published payer-level APIs (which use NCTracks data underneath). PECOS feeds NCTracks provider credentialing — do not duplicate that pipeline; consume NCTracks' already-screened provider record when available.

See `../nctracks/README.md` for the state-side detail.

---

## 13. Risks, gotchas, and access flags

- **No federated identity** across CMS systems. PECOS, QPP, Blue Button, SAM.gov, and HARP (HCQIS Access Roles & Profile, used for QPP) each have separate credentials.
- **HARP / EIDM** — many CMS portals (QPP, HPMS, EQRS) sit behind **HARP** identity (`https://harp.cms.gov/`). Required for any CMS-internal submission portal. Account is per-individual, not per-organization; role requests gated by org's Security Official.
- **No SLA** on any of the public open-data endpoints. Mirror locally for production reliability.
- **Synthetic data** for development: CMS publishes **Synthea-generated** test populations for Blue Button; SAM and NPPES sandboxes are minimal.
- **PII handling**: Blue Button data is PHI under HIPAA the moment it touches your servers — BAA required with downstream subprocessors (CMS does not sign BAAs with app developers; the beneficiary's consent is the legal basis).
- **CMS-0057-F audit posture**: CMS has stated it will rely on **complaints and HHS-OIG audits** rather than active conformance testing — but ASTP/ONC's HTI-2 rule cycle may introduce certification criteria `(b)(11)` covering these APIs. **[VERIFY]** the final HTI-2 / HTI-3 status before claiming "certified."
- **Da Vinci IGs are not law** — CMS-0057-F references specific STU versions; later IG releases are not automatically compliant. Pin versions in conformance statements.
