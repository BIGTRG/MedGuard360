# NC DHSR Integration

> MedGuard360 integration brief for the **North Carolina Division of Health Service Regulation (DHSR)** — the state agency that licenses, certifies, and surveys healthcare facilities and healthcare personnel in North Carolina.
>
> Counterpart to the existing NC Medicaid, PECOS, LEIE, and SAM integrations. DHSR is the **state-license-of-record** for facility-based providers; CMS/Medicaid enrollment depends on a current DHSR license for most facility types.
>
> **Verification note:** Specific form numbers, fee amounts, and dollar thresholds change frequently (often annually). Every fee, form ID, threshold, and URL in this document MUST be re-verified against `info.ncdhhs.gov/dhsr/` and the NC General Statutes / NC Administrative Code before being used in production. Items flagged `[VERIFY]` are known to drift year-over-year.

---

## 1. What NC DHSR Is

The **Division of Health Service Regulation (DHSR)** is a division of the **North Carolina Department of Health and Human Services (NC DHHS)**. It is North Carolina's primary regulator of healthcare facilities and healthcare personnel.

- **Parent agency:** NC DHHS
- **Statutory umbrella:** NCGS Chapter 131E (Health Care Facilities and Services), Chapter 122C (Mental Health, Developmental Disabilities, and Substance Abuse Act of 1985), Chapter 131D (Adult Care Homes), Chapter 90 (selected provider chapters where DHSR has co-jurisdiction)
- **Primary functions:**
  1. **Licensure** of ~30 categories of healthcare facilities (acute care, long-term care, behavioral health, ambulatory, home- and community-based).
  2. **Certification** of facilities participating in **Medicare and Medicaid** on behalf of CMS under a State Survey Agency (SSA) agreement — DHSR conducts CMS surveys (life safety, complaint, recertification) and issues **CMS-2567 Statements of Deficiency**.
  3. **Construction Section / Certificate of Need (CON)** review of new facility construction, expansions, and major medical equipment acquisitions.
  4. **Health Care Personnel Registry (HCPR)** — the public registry of nurse aides and findings of abuse/neglect/misappropriation against healthcare personnel working in licensed facilities.
  5. **Complaint intake and investigation** for licensed facilities and personnel.
  6. **Emergency Medical Services (EMS)** oversight via the Office of EMS (OEMS).

---

## 2. License & Certification Types Issued by DHSR

DHSR's facility-licensure portfolio is organized across several sections. The list below is the canonical roster of licensed/certified facility types in NC.

### 2.1 Acute & Home Care Licensure Section
| Facility type | Statute | NCAC reference |
|---|---|---|
| Hospitals (general acute, psychiatric, rehab, LTACH) | NCGS 131E Art. 5 (§131E-75 et seq.) | 10A NCAC 13B |
| Ambulatory Surgical Facilities (ASF) | NCGS 131E Art. 6 Part A | 10A NCAC 13C |
| Home Care Agencies (HCA) | NCGS 131E Art. 6 Part D (§131E-135 et seq.) | 10A NCAC 13J |
| Hospice (home + inpatient) | NCGS 131E Art. 10 (§131E-200 et seq.) | 10A NCAC 13K |
| Home Health Agencies (Medicare-certified) | 42 CFR 484 (federal) + state via NCGS 131E | 10A NCAC 13J |
| Abortion clinics | NCGS 131E Art. 6 Part A | 10A NCAC 14E |

### 2.2 Nursing Home Licensure & Certification Section
| Facility type | Statute | NCAC reference |
|---|---|---|
| Skilled Nursing Facilities (SNF / Nursing Homes) | NCGS 131E Art. 6 Part A (§131E-100 et seq.) | 10A NCAC 13D |
| Combination Homes (SNF + ACH) | NCGS 131E + 131D | 10A NCAC 13D / 13F |

### 2.3 Adult Care Licensure Section
| Facility type | Statute | NCAC reference |
|---|---|---|
| Adult Care Homes (ACH, 7+ beds — assisted living) | NCGS 131D Art. 1 (§131D-2.1 et seq.) | 10A NCAC 13F |
| Family Care Homes (2–6 beds) | NCGS 131D | 10A NCAC 13G |
| Multi-Unit Assisted Housing with Services | NCGS 131D-2.5 | 10A NCAC 13F |

### 2.4 Mental Health Licensure & Certification Section (MHLCS)
| Facility type | Statute | NCAC reference |
|---|---|---|
| Psychiatric Residential Treatment Facilities (PRTF) | NCGS 122C Art. 2 | 10A NCAC 27G |
| Residential treatment (Levels I–IV, including therapeutic foster care) | NCGS 122C | 10A NCAC 27G |
| Substance Use Disorder treatment (outpatient, IOP, residential, opioid treatment programs) | NCGS 122C | 10A NCAC 27G |
| Intermediate Care Facilities for Individuals with Intellectual Disabilities (ICF-IID) | NCGS 122C / 42 CFR 483 Subpart I | 10A NCAC 27G |
| Day treatment / partial hospitalization | NCGS 122C | 10A NCAC 27G |
| Facility-based crisis services | NCGS 122C | 10A NCAC 27G |
| Group homes for adults / children with MH/IDD/SUD | NCGS 122C | 10A NCAC 27G |

### 2.5 Construction Section
- **Certificate of Need (CON) — NCGS 131E Article 9** (§131E-175 et seq.)
- **Plans review and construction inspection** for licensed facilities under all sections above.

### 2.6 Other DHSR-issued credentials
- **Nurse Aide I & II listings** (HCPR / NA Registry) — NCGS 131E-255, -256 and federal 42 CFR 483.156.
- **Medication Aides** — NCGS 90-171.42 (delegated nursing tasks in ACHs/SNFs).
- **EMS personnel and EMS provider licenses** via the Office of EMS — NCGS 131E Art. 7 (§131E-155 et seq.), 10A NCAC 13P.

> **[VERIFY]** Pull the live, authoritative roster from `https://info.ncdhhs.gov/dhsr/facserv.html` ("Facility Services" / "Listings & Statistics") which publishes Excel rosters per facility type.

---

## 3. Application Processes (by major facility type)

> All form numbers below follow the DHSR convention `DHSR-####` or section-prefixed (`AS-####`, `NH-####`, `MH-####`, `HC-####`). **Form numbers and fees change annually — re-verify before use.**

### 3.1 Hospitals
- Initial license application: NCGS 131E-77, 10A NCAC 13B .3102.
- **Form:** Hospital License Application (Acute & Home Care section). `[VERIFY]`
- **Initial fee:** Tiered by licensed bed count (statutory schedule in NCGS 131E-77.1). `[VERIFY]`
- **Renewal:** **Annual**, due before expiration.
- **Inspection:** Initial on-site licensure survey; recertification surveys per CMS cycle (typically every 36 months for hospitals via TJC deeming or state survey).
- **Background checks:** Required for direct-care staff per NCGS 131E-265 (Criminal History Record Check — Health Care Personnel Registry / DOJ).

### 3.2 Nursing Homes (SNFs)
- Statute: NCGS 131E-102. Rule: 10A NCAC 13D .2102.
- **Form:** Nursing Facility License Application (Nursing Home Licensure & Certification section).
- **Initial fee:** Per-bed fee plus base (statutory). `[VERIFY]`
- **Renewal:** **Annual** (license year aligns with state fiscal cycle).
- **Inspection:** Annual state licensure survey + federal recertification survey (CMS, on the 9–15 month rolling cycle).
- **Background checks:** NCGS 131E-265 (criminal record check), HCPR registry check **mandatory** before hiring nurse aides (42 CFR 483.12).

### 3.3 Adult Care Homes (ACH / Assisted Living)
- Statute: NCGS 131D-2.4. Rule: 10A NCAC 13F .0301.
- **Form:** ACH License Application (Adult Care Licensure Section).
- **Initial fee:** Per-bed fee. `[VERIFY]`
- **Renewal:** **Annual.**
- **Inspection:** Annual unannounced monitoring + biennial full survey (10A NCAC 13F .0302).
- **Background checks:** NCGS 131D-40 (criminal record check), HCPR check required.

### 3.4 Home Care Agencies / Hospice / Home Health
- Statute: NCGS 131E-138 (HCA), 131E-203 (Hospice).
- **Form:** Home Care / Hospice License Application (Acute & Home Care section).
- **Initial fee:** Flat fee per agency + per-branch. `[VERIFY]`
- **Renewal:** **Annual.**
- **Inspection:** Initial survey, complaint surveys, and (for Medicare-certified) federal recertification every 36 months.
- **Background checks:** NCGS 131E-265.

### 3.5 Mental Health / SUD / IDD Facilities (MHLCS)
- Statute: NCGS 122C-23. Rule: 10A NCAC 27G .0200.
- **Form:** Application for Licensure of a Mental Health, Developmental Disabilities or Substance Abuse Facility (MHLCS).
- **Initial fee:** NCGS 122C-23(e1) statutory schedule (per facility / per service type). `[VERIFY]`
- **Renewal:** **Annual.**
- **Inspection:** Annual monitoring + complaint investigations.
- **Background checks:** NCGS 122C-80 (criminal record check), HCPR for affected personnel.

### 3.6 Ambulatory Surgical Facilities
- Statute: NCGS 131E-147. Rule: 10A NCAC 13C .
- **Initial fee:** Per-OR / base. `[VERIFY]`
- **Renewal:** Annual.
- **Inspection:** Triennial state survey + complaint.

---

## 4. Healthcare Personnel Registry (HCPR)

The **Healthcare Personnel Registry** (often called the **Nurse Aide Registry** when referring to its NA portion) is the public registry maintained by DHSR. Authority:

- **Federal:** OBRA '87 / 42 CFR 483.156 (Nurse Aide Registry) and 42 CFR 488.335 (findings against nurse aides).
- **State:** NCGS 131E-255 and 131E-256 (HCPR — covers all unlicensed healthcare personnel in licensed facilities, not only nurse aides).

### 4.1 What HCPR contains
1. **Nurse Aide I** listing — certified NA Is. Status: Listed / Expired / Revoked.
2. **Nurse Aide II** listing — RNs verify additional skills; listed with BON-linked record.
3. **Medication Aide** listing.
4. **Findings** of abuse, neglect, misappropriation of property, diversion of drugs, or fraud against **any** healthcare personnel working in a licensed facility (not just NAs). A substantiated finding bars the individual from employment in any NC long-term care facility.

### 4.2 Public access
- **Web lookup:** Name-based search interface at `https://info.ncdhhs.gov/dhsr/hcpr/` (commonly the page named `hcpreg.html` / `nainfo.html`). Free, no auth.
- **Bulk file:** DHSR publishes the **Nurse Aide I Registry** as a downloadable file (historically an Excel/CSV updated nightly/weekly) under the HCPR pages. **[VERIFY]** the current URL and refresh cadence.
- **API:** No published REST API as of last verification — integrators must either (a) consume the published CSV/XLSX export or (b) screen-scrape the lookup form. The screen-scrape approach requires `firstName`, `lastName`, and at least one disambiguator (DOB or SSN-last-4).

### 4.3 Programmatic query (current pattern)
```text
POST  https://info.ncdhhs.gov/dhsr/hcpr/[search endpoint]
form fields: lastName, firstName, dob (optional), ssn4 (optional)
response: HTML table — name, registry type (NA-I / NA-II / MA), status,
          listing date, expiration date, finding (Y/N), finding type
```
Always parse defensively — DHSR has redesigned the page multiple times.

---

## 5. DHSR Online Directory / Open Data

### 5.1 Facility lookup
- **Listings page:** `https://info.ncdhhs.gov/dhsr/facserv.html` (Facility Services → "Reports and Listings").
- Per-section spreadsheets (XLSX) of currently licensed facilities — typically refreshed weekly:
  - Hospitals
  - Nursing Homes
  - Adult Care Homes / Family Care Homes
  - Home Care / Hospice / Home Health
  - MH/DD/SAS facilities
  - Ambulatory Surgical Facilities
- Columns generally include: Facility name, License #, Address, County, Owner/Licensee, Administrator, Phone, Bed count, License effective/expiration dates, Status.

### 5.2 Survey results and CMS-2567 statements of deficiency
- For **Medicare/Medicaid-certified** providers, DHSR posts state-survey outcomes that also flow into CMS:
  - **Nursing homes:** mirrored to **Medicare Care Compare** and the CMS PBJ / NHSN datasets — bulk access via `data.cms.gov` (e.g., the "Provider Information" and "Health Deficiencies" datasets).
  - **Hospitals / ASCs / home health / hospice:** also mirrored to CMS Care Compare downloads.
- DHSR publishes **complaint inspection** summaries by facility on its facility pages (often PDFs of redacted CMS-2567s).

### 5.3 Programmatic availability
| Asset | Format | Programmatic? |
|---|---|---|
| Facility rosters | XLSX | Yes — download + parse |
| Nurse Aide Registry | XLSX/CSV | Yes — download + parse `[VERIFY]` |
| Survey deficiency reports | PDF (CMS-2567) | PDF-only on DHSR; structured data via CMS `data.cms.gov` |
| Complaint outcomes | PDF / facility detail page | PDF-only on DHSR |
| CON decisions / applications | PDF | PDF-only |
| **Open data API** | — | **None published by DHSR.** Use CMS open data + scheduled XLSX pulls. |

---

## 6. Construction Section — Certificate of Need (CON)

NC is one of ~35 states with an active CON program. Authority: **NCGS 131E Article 9** (§§ 131E-175 — 131E-190); rules at **10A NCAC 14C**.

### 6.1 Reviewable services / projects (§131E-176(16))
- New healthcare facilities (hospitals, NHs, ICF-IID, hospice inpatient, kidney disease treatment centers, ASCs, etc.).
- Bed additions / conversions in licensed facilities.
- **Major medical equipment** acquisitions over the statutory threshold (MRI, PET, linear accelerators, cardiac cath, gamma knife, lithotripters, etc.).
- Diagnostic centers, kidney disease treatment centers, home health offices (per the State Medical Facilities Plan).
- Capital expenditures by an existing facility exceeding the project-cost threshold.

### 6.2 Dollar thresholds (statutory, adjusted annually for inflation per §131E-176(16))
Approximate 2024 figures — **[VERIFY]** the current SMFP / DHSR posted thresholds:
- **Capital expenditure** threshold: ~**$4.0M** for facilities, lower for diagnostic centers.
- **Major medical equipment** threshold: ~**$2.0M**.
- **Diagnostic center**: ~**$1.5M** annual gross revenue threshold.

> NOTE: A multi-year statutory rollback of CON applicability is in progress. Recent General Assembly sessions have removed CON review for several categories (e.g., select ASC procedures, MRI in certain counties) effective on phased dates. Confirm current applicability in the most recent **State Medical Facilities Plan (SMFP)** before relying on CON status as a gating control.

### 6.3 Process
1. Letter of intent (by SMFP-published due date).
2. Application + filing fee (statutory: base + percentage of project cost, capped).
3. CON Section review (competitive batches if more than one applicant for the same need).
4. Agency decision — appeal to OAH (Office of Administrative Hearings).
5. Award triggers obligation to develop within statutory timelines; **construction plans review** by DHSR Construction Section follows.

---

## 7. DHSR Data Products Summary

| Data product | Source page (root) | Format | Refresh | Notes |
|---|---|---|---|---|
| Hospital roster | `/dhsr/acute/` | XLSX | Weekly `[VERIFY]` | License #, beds, owner |
| Nursing home roster | `/dhsr/nhlcs/` | XLSX | Weekly `[VERIFY]` | License #, beds, MA/MC cert |
| Adult care home roster | `/dhsr/acls/` | XLSX | Weekly `[VERIFY]` | Bed count, star rating |
| Home care / hospice roster | `/dhsr/acute/` | XLSX | Weekly `[VERIFY]` | |
| MH/DD/SAS facility roster | `/dhsr/mhlcs/` | XLSX | Weekly `[VERIFY]` | Service codes |
| Nurse Aide Registry | `/dhsr/hcpr/` | XLSX/CSV `[VERIFY]` | Nightly/Weekly | Full NA-I/NA-II/MA listings |
| HCPR findings | `/dhsr/hcpr/` | Web lookup only | Real-time | No bulk feed published |
| Penalties / fines | `/dhsr/` (penalties page) | PDF | Periodic | |
| Statements of deficiency (2567) | per-facility pages | PDF | Per-survey | Structured equivalents via CMS |
| CON decisions | `/dhsr/coneed/` | PDF | Per-batch | |
| State Medical Facilities Plan | `/dhsr/coneed/smfp/` | PDF | Annual | Need determinations |

---

## 8. MedGuard360 Hook Points

DHSR plugs into the credentialing & risk pipeline at four points, complementary to PECOS/LEIE/SAM/NPPES/NC Medicaid:

### 8.1 Facility licensure verification (pre-bill gate)
Before MedGuard360 allows a facility-based claim to clear pre-bill scrubbing:
- Look up the facility by NPI → resolve to **DHSR license number**.
- Verify **license status = Active** and **expiration date > date of service**.
- Verify **bed count / service category** matches the billed service line (e.g., SNF claim → facility must hold an active SNF license; PRTF claim → MHLCS-licensed PRTF).
- **Failure mode:** soft block, route to credentialing queue.

### 8.2 HCPR check on direct-care hires
Augments the existing PECOS/LEIE/SAM fraud-screening set:
- Triggered on any new hire whose role is **NA-I, NA-II, Medication Aide**, or any "unlicensed assistive personnel" in a DHSR-licensed facility.
- Two checks:
  - **Registry listing** — must be Listed and not Expired (NA-I requires every-24-month employment-verification renewal under 42 CFR 483.156(c)(2)).
  - **Findings flag** — any substantiated finding of abuse/neglect/misappropriation/diversion → automatic disqualification under 42 CFR 483.12(a)(3) and NCGS 131E-256.
- Logged to the same audit trail as LEIE/SAM exclusion checks (re-screen monthly).

### 8.3 Survey deficiencies → provider risk score
- Ingest CMS Care Compare deficiency datasets (nursing homes, hospitals, HHA, hospice) keyed by CCN.
- Cross-walk CCN → NPI → MedGuard360 provider ID.
- Feed scope/severity grids (e.g., F-Tag scope/severity letters A–L) and immediate jeopardy (IJ) findings into the **fraud + risk score**.
- IJ in past 12 months → automatic high-risk tier; elevated pre-pay review.

### 8.4 CON / construction status (capacity validation)
- For new-facility / new-service enrollments, check whether the service requires a CON, and whether the CON has been awarded and is still in effect (CON awards have development-period deadlines under §131E-188).
- Block enrollment of a service line for which the facility lacks a required CON.

---

## 9. Compliance Citations

Primary statutes and rule sets MedGuard360 must reference when documenting DHSR-related controls:

- **NCGS Chapter 131E** — Health Care Facilities and Services (umbrella for hospitals, NHs, ASFs, HCAs, hospice, EMS, CON, HCPR).
- **NCGS Chapter 131D** — Adult Care Homes (ACH / FCH licensure, Resident Bill of Rights, criminal background, ACH penalties).
- **NCGS Chapter 122C** — Mental Health, DD, and SA Act (MH/DD/SAS facility licensure under MHLCS).
- **NCGS Chapter 90** — selected articles (Medication Aides §90-171.42; pharmacy/CS where DHSR co-references).
- **10A NCAC subchapters used by DHSR:**
  - 10A NCAC **13B** — Hospitals
  - 10A NCAC **13C** — Ambulatory Surgical Facilities
  - 10A NCAC **13D** — Nursing Homes
  - 10A NCAC **13E** — Intermediate Care (legacy)
  - 10A NCAC **13F** — Adult Care Homes (7+ beds)
  - 10A NCAC **13G** — Family Care Homes (2–6 beds)
  - 10A NCAC **13J** — Home Care Agencies
  - 10A NCAC **13K** — Hospice
  - 10A NCAC **13M** — Nurse Aide Training / Registry
  - 10A NCAC **13O** — Medication Aides
  - 10A NCAC **13P** — EMS
  - 10A NCAC **14C** — Certificate of Need
  - 10A NCAC **14E** — Abortion clinics
  - 10A NCAC **27G** — MH/DD/SAS facilities and services (under MHLCS)
- **Federal cross-refs** invoked under SSA delegation: 42 CFR 482 (hospitals CoP), 483 Subpart B (LTC), 483 Subpart I (ICF-IID), 484 (HHA), 416 (ASC), 418 (hospice), 488 (survey, certification, enforcement).

---

## 10. Key URLs (root of truth — `info.ncdhhs.gov/dhsr/`)

> All URLs `[VERIFY]` — DHSR has periodically restructured its site. Treat the *root* as authoritative and crawl from there.

| Resource | URL |
|---|---|
| DHSR home | https://info.ncdhhs.gov/dhsr/ |
| Facility Services (rosters & reports) | https://info.ncdhhs.gov/dhsr/facserv.html |
| Acute & Home Care Section | https://info.ncdhhs.gov/dhsr/acute/ |
| Nursing Home Licensure & Certification | https://info.ncdhhs.gov/dhsr/nhlcs/ |
| Adult Care Licensure Section | https://info.ncdhhs.gov/dhsr/acls/ |
| Mental Health Licensure & Certification | https://info.ncdhhs.gov/dhsr/mhlcs/ |
| Construction Section | https://info.ncdhhs.gov/dhsr/ncon/ |
| Certificate of Need | https://info.ncdhhs.gov/dhsr/coneed/ |
| Healthcare Personnel Registry | https://info.ncdhhs.gov/dhsr/hcpr/ |
| Nurse Aide I Registry lookup | https://info.ncdhhs.gov/dhsr/hcpr/hcpreg.html `[VERIFY]` |
| State Medical Facilities Plan (SMFP) | https://info.ncdhhs.gov/dhsr/ncsmfp/ |
| Office of EMS | https://info.ncdhhs.gov/dhsr/EMS/ |
| Complaint intake | https://info.ncdhhs.gov/dhsr/ciu/ |
| Penalties & enforcement actions | https://info.ncdhhs.gov/dhsr/ |

Useful federal companions for the same data:
- **CMS Provider Data Catalog (Care Compare downloads):** `https://data.cms.gov/provider-data/`
- **CMS Provider of Services (POS) file:** `https://data.cms.gov/provider-characteristics/`
- **NPPES NPI Registry:** `https://npiregistry.cms.hhs.gov/api/`
- **NC General Statutes:** `https://www.ncleg.gov/Laws/GeneralStatutes`
- **NC Administrative Code (Title 10A):** `http://reports.oah.state.nc.us/ncac.asp?folderName=\Title%2010A%20-%20Health%20and%20Human%20Services`

---

## 11. Adapter Spec — `integrations/nc-dhsr`

TypeScript adapter surface. The adapter is **scrape + scheduled-download** based (no public REST API). All public functions return a typed result and emit an `evidence` payload (raw HTML/PDF/XLSX) into the artifact store for audit.

```ts
// integrations/nc-dhsr/index.ts

export type DhsrLicenseStatus =
  | 'ACTIVE' | 'PROVISIONAL' | 'SUSPENDED' | 'REVOKED'
  | 'EXPIRED' | 'CLOSED' | 'UNKNOWN';

export type DhsrFacilityType =
  | 'HOSPITAL' | 'SNF' | 'ACH' | 'FCH' | 'HCA' | 'HHA' | 'HOSPICE'
  | 'ASF' | 'PRTF' | 'ICF_IID' | 'MH_RES' | 'SUD' | 'OTHER';

export interface DhsrFacility {
  licenseNumber: string;
  facilityName: string;
  facilityType: DhsrFacilityType;
  status: DhsrLicenseStatus;
  effectiveDate: string;   // ISO
  expirationDate: string;  // ISO
  beds?: number;
  county: string;
  address: { line1: string; city: string; state: 'NC'; zip: string };
  licensee: string;
  administrator?: string;
  npi?: string;            // resolved via NPPES cross-walk if available
  ccn?: string;            // CMS Certification Number, if Medicare-certified
  source: { roster: string; fetchedAt: string };  // evidence URL + timestamp
}

/** 8.1 — verify a facility's NC license before allowing facility-based billing. */
export function dhsrLookupFacility(
  q: { licenseNumber?: string; npi?: string; ccn?: string; name?: string }
): Promise<DhsrFacility | null>;

export interface HcprRecord {
  registryType: 'NA_I' | 'NA_II' | 'MED_AIDE';
  firstName: string;
  lastName: string;
  middleInitial?: string;
  listingNumber: string;
  status: 'LISTED' | 'EXPIRED' | 'REVOKED' | 'NOT_FOUND';
  listingDate?: string;
  expirationDate?: string;
  hasFinding: boolean;
  findingType?: 'ABUSE' | 'NEGLECT' | 'MISAPPROPRIATION' | 'DIVERSION' | 'FRAUD' | 'OTHER';
  findingDate?: string;
  source: { url: string; fetchedAt: string };
}

/** 8.2 — pre-hire and monthly re-screening check against HCPR. */
export function dhsrCheckHCPR(
  q: { firstName: string; lastName: string; dob?: string; ssn4?: string }
): Promise<HcprRecord[]>;   // returns all matches; caller resolves identity

export interface DhsrSurveyEvent {
  ccn?: string;
  licenseNumber: string;
  surveyDate: string;
  surveyType: 'RECERT' | 'COMPLAINT' | 'LICENSURE' | 'LIFE_SAFETY' | 'REVISIT';
  deficiencies: Array<{
    tag: string;             // F-Tag or K-Tag
    scope: 'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'J'|'K'|'L';
    severity: 1|2|3|4;
    immediateJeopardy: boolean;
    correctedDate?: string;
    text?: string;           // optional CMS-2567 narrative
  }>;
  source: { url: string; fetchedAt: string };  // CMS dataset row or DHSR PDF
}

/** 8.3 — pull historical surveys for risk scoring. */
export function dhsrGetSurveyHistory(
  q: { licenseNumber?: string; ccn?: string; sinceMonths?: number }
): Promise<DhsrSurveyEvent[]>;

export interface DhsrExclusionResult {
  matched: boolean;
  source: 'HCPR_FINDING' | 'LICENSE_REVOCATION' | 'PENALTY_LIST' | 'NONE';
  detail?: string;
  effectiveDate?: string;
  evidenceUrl?: string;
}

/** 8.2/8.3 composite — any NC-DHSR-originated exclusion for a person or facility. */
export function dhsrCheckExclusion(
  q: { personId?: string; licenseNumber?: string; ssn4?: string; firstName?: string; lastName?: string }
): Promise<DhsrExclusionResult>;

/** Optional — CON / SMFP guard for new-service enrollment. */
export function dhsrCheckCON(
  q: { licenseNumber?: string; serviceCode: string }
): Promise<{ required: boolean; awarded?: boolean; awardDate?: string; expiresOrDevBy?: string; evidenceUrl?: string }>;
```

### Implementation notes
- **Source-of-truth tier**: prefer CMS open data (`data.cms.gov`) for survey/deficiency content (structured), and DHSR XLSX rosters for license status (authoritative). Fall back to scraping only for HCPR person lookups and PDF-only CON decisions.
- **Cadence**: nightly XLSX pull for facility rosters + nurse aide registry; CMS dataset pull weekly; on-demand HCPR scrape per hire/credentialing event.
- **Caching**: hash the upstream XLSX; only reprocess on hash change. Store original artifacts in the evidence bucket for audit (DHSR licensure decisions are admissible records).
- **Identity matching**: HCPR has no SSN in public output — exact match on `lastName`+`firstName`+`dob` (or `ssn4` if disambiguator). Below threshold → return *all* candidates and queue manual review; never auto-clear ambiguous matches (false-negative cost is regulatory).
- **Rate limiting**: be polite — single-threaded scrape with ≥1s delay between page fetches; respect `robots.txt` on `info.ncdhhs.gov`.
- **Failure handling**: any DHSR upstream outage → adapter returns `UNKNOWN` status and emits a compliance alert; never silently pass a missing license check.

---

## 12. Open Questions / TODO before go-live

1. `[VERIFY]` Current form numbers and fee schedules for each license type (pull live from each section page).
2. `[VERIFY]` Exact URL + format of the downloadable Nurse Aide Registry (XLSX vs CSV vs ZIP).
3. `[VERIFY]` Current CON / SMFP thresholds and the list of services where CON review has been statutorily removed in the most recent session law.
4. Confirm whether DHSR has published any newer JSON/CSV open-data feed (none known at last check — site is still XLSX/PDF dominated).
5. Decide cross-walk strategy for matching DHSR license # ↔ CMS CCN ↔ NPI when the public roster lacks NPI/CCN columns (likely a manual map for the first N facilities, then learned).
6. Legal review of storing HCPR/PII (last name + ssn4) in the evidence store and applicable retention under NCGS 132 (public records) vs. HIPAA minimum-necessary.
