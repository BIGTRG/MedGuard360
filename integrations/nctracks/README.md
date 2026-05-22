# NCTracks Integration — Reference for MedGuard360

Last verified: 2026-05-22. NCTracks is North Carolina's Medicaid Management Information System (MMIS). All EDI traffic, provider enrollment, prior authorization, and FFS claims processing for NC Medicaid Direct (and encounter data from the PHPs/LME-MCOs) flow through it.

---

## 1. What NCTracks is

- **System:** Multi-payer MMIS that adjudicates claims and pays providers for NC Medicaid, NC Health Choice (legacy), Division of Public Health, Division of Mental Health/DD/SAS, and Office of Rural Health programs. Serves ~100,000 enrolled providers and ~2.9M beneficiaries.
- **Owner:** NC Department of Health and Human Services (NC DHHS), via the **Office of NCTracks** within DHHS. (https://www.ncdhhs.gov/about/administrative-offices/nctracks)
- **Fiscal Agent / Operator:** **General Dynamics Information Technology (GDIT)**. CSRA was acquired by GDIT in 2018 — every "CSRA" reference in older docs is now GDIT. GDIT was awarded a **$524M contract extension** to keep operating NCTracks. (https://www.gdit.com/about-gdit/press-releases/gdit-awarded-usd524-million-north-carolina-medicaid-management-information/, https://medicaid.ncdhhs.gov/blog/2018/09/03/csra-now-gdit)
- **Services for trading partners:**
  - EDI submission/receipt (claims, eligibility, status, ERA, 834 enrollment)
  - Provider enrollment / re-credentialing / Manage Change Request (MCR)
  - Prior Authorization submission and lookup
  - Recipient eligibility verification (real-time + batch)
  - Remittance Advice (RA) retrieval — both 835 EDI and PDF RA
  - Encounter data submission for PHPs and LME-MCOs (Tailored Plans)

---

## 2. API & transport options

NCTracks is **EDI-first** (X12 5010), not REST. There is no public REST/JSON API. Connectivity is described in the **NCTracks Trading Partner Connectivity Guide** (`CG_TPConn.pdf` — https://www.nctracks.nc.gov/content/dam/jcr:3922b8d3-9521-459e-8cb7-6b405a2ede5b/CG_TPConn.pdf).

### Supported X12 transactions (HIPAA 5010)
Source: NCTracks Trading Partner FAQ + 270/271 and 835 Companion Guides (https://www.nctracks.nc.gov/content/public/providers/provider-trading-partners.html)

| Direction | Txn | Standard | Purpose |
|---|---|---|---|
| Inbound | **270** | 005010X279A1 | Eligibility inquiry |
| Outbound | **271** | 005010X279A1 | Eligibility response |
| Inbound | **276** | 005010X212 | Claim status request |
| Outbound | **277** | 005010X212 | Claim status response |
| Outbound | **277CA** | 005010X214 | Claim acknowledgment |
| Inbound | **837P** | 005010X222A1 | Professional claim |
| Inbound | **837I** | 005010X223A2 | Institutional claim |
| Inbound | **837D** | 005010X224A2 | Dental claim |
| Outbound | **835** | 005010X221A1 | Remittance / payment advice |
| Inbound | **834I** | 005010X220A1 | Benefit enrollment (encounter file from PHPs) |
| In/Out | **999** | 005010X231A1 | Functional acknowledgment (replaces 997) |
| Inbound | **NCPDP D.0** | NCPDP vD.0 | Pharmacy POS (real-time) |

> Confirm the exact addenda version for each transaction in the corresponding NCTracks Companion Guide before generating envelopes — NC updates these (e.g. updated 270/271 and 835 CGs published; see https://www.nctracks.nc.gov/content/public/providers/provider-trading-partners/trading-partner-announcements/Updated-version-of-270-271-Companion-Guide.html).

### Transport modes

1. **Real-time (synchronous)** — CAQH CORE Phase II compliant **SOAP+WSDL** and **HTTP MIME multipart** envelopes over HTTPS with mutual TLS. Used for **270/271**, **276/277**, and NCPDP D.0 pharmacy. Per-transaction response within seconds. Specification: CORE 270 Connectivity Rule v2.2.0; bound by the NCTracks Connectivity Guide (`CG_TPConn.pdf`).
2. **Batch** — file-based, used for **837P/I/D**, **835**, **834**, large 270 batches:
   - **SFTP** to the GDIT EDI gateway (preferred for new partners).
   - **Connect:Direct (NDM)** with Secure+ option for high-volume submitters / state-contracted partners and PHPs.
   - **Web Batch Upload** through the Trading Partner area of the NCTracks Provider Portal (manual file drop, suitable for small submitters).
3. **Edifecs Ramp Management** — used **only** for certification testing, not for production traffic.

The exact production hostnames, SOAP endpoint URLs, SFTP host, and Connect:Direct node names are **not published publicly**; they are issued to the trading partner together with the EDI Submitter ID/TSN after the TPA is signed and the Contact Information Form is processed by `NCMMIS_EDI_Support@gdit.com`. Treat them as secrets in config.

---

## 3. Onboarding process

Source: NCTracks Trading Partner FAQ (https://www.nctracks.nc.gov/content/public/providers/provider-trading-partners/faqs-for-trading-partners.html), Trading Partner Information page (https://www.nctracks.nc.gov/content/public/providers/provider-trading-partners.html).

### Step-by-step
1. **Decide your role.** Trading Partner can be (a) a provider submitting on its own behalf, (b) a billing agent, or (c) a clearinghouse. Providers may submit directly with their NPI/Atypical ID; billing agents and clearinghouses get their own Trading Partner ID and link providers to it via authorization records.
2. **Get NCIDs.** Every human user touching the Provider Portal needs an individual NCID (https://ncid.nc.gov). MFA enforced since 2024-09-15 via https://myncid.nc.gov.
3. **Email `NCMMIS_EDI_Support@gdit.com`** to request the **Contact Information Form**.
4. **Sign the Trading Partner Agreement (TPA).** Presented in the Provider Portal during EDI enrollment or while testing in Ramp Management.
5. **Receive Trading Partner Logon Name + Transaction Supplier Number (TSN).** TSN = the EDI submitter ID used in ISA06/GS02. PHPs and LME-MCOs that previously could only *receive* can be promoted to also *send* on request.
6. **Certify in Edifecs Ramp Management.** Self-service portal. Must pass ASC X12 HIPAA-compliance testing **for every transaction type you plan to exchange** (e.g. 837P, 270, 276 each tested separately). Trading partners must "pass ASC X12 HIPAA-compliance certification testing" before any production exchange.
7. **Connectivity validation.** Test SOAP/SFTP/Connect:Direct round-trip with the EDI team. Real-time partners must also pass CAQH CORE connectivity testing.
8. **Move to production.** GDIT enables the production credentials/endpoints and you start sending live.

### Interface Technical Framework (ITF)
NC DHHS publishes an **Interface Technical Framework** that governs encounter-data file exchange between PHPs/Tailored Plans/LME-MCOs and NCTracks (837 encounter feeds, 834, eligibility files). The ITF is **versioned** and updated as NC Medicaid Managed Care evolves. Confirm the current published ITF version at onboarding time directly with `NCMMIS_EDI_Support@gdit.com` — NC has not published a stable public URL with the live version number. The LME/MCO Manual for Encounter Data Submission (v3, 05/2019) is the legacy public reference: https://per.nctracks.com/content/dam/jcr:36c968e1-2063-41e0-b194-9fecb2eab160/LME%20MCO%20MANUAL%20FOR%20ENCOUNTER%20DATA%20SUBMISSION%20v3%20512019.pdf. Tailored Plans launched 2024-07-01, which triggered an ITF revision cycle; treat any ITF older than that as stale.

---

## 4. Authentication

| Layer | Mechanism |
|---|---|
| Portal (human) | **NCID** account + **MFA** (TOTP/SMS/email via myncid.nc.gov). Enforced since 2024-09-15. |
| EDI envelope | ISA06 = your **TSN** (Submitter ID); ISA08 = NCTracks Receiver ID (provided at onboarding). |
| SOAP / HTTPS MIME | **Mutual TLS** with an X.509 client certificate issued/registered during connectivity setup; HTTP Basic credentials inside the CORE envelope; **source IP allowlisting** at the GDIT gateway. |
| SFTP | SSH key pair + username; source IP allowlist. |
| Connect:Direct | NDM node-name pairing + Secure+ TLS; source IP allowlist. |
| Pharmacy (NCPDP D.0) | Switch vendor relationship (RelayHealth/Change Healthcare); not a direct cert flow. |

Operationally: the client cert, SFTP key, and Connect:Direct node names are issued per-environment (test and prod separately). Renewal is the trading partner's responsibility — track expiry.

---

## 5. Sandbox / test

- **Certification testing** happens in **Edifecs Ramp Management** (`https://nctracks.rampmanagement.com` — confirm at enrollment; URL is partner-gated). You upload test 837/270/276/834 files and Ramp validates structure + HIPAA compliance + NC-specific Companion Guide rules.
- **End-to-end (E2E) test environment** — GDIT operates a separate test instance of NCTracks. Endpoints are issued after Ramp certification. Use this to validate the full envelope round-trip (999 / 277CA / 835) before flipping to production.
- **There is no anonymous public sandbox** — every test endpoint requires a signed TPA, an issued TSN, and a registered client cert / SFTP key. Plan ~4–8 weeks from first email to production go-live for a new trading partner.

---

## 6. Specific endpoints

Public URLs (no auth):

| Purpose | URL |
|---|---|
| Provider Portal (production) | https://www.nctracks.nc.gov/content/public/NCTracks-Provider-Portal?flow=PP |
| Provider Portal (PER / pre-prod public site) | https://per.nctracks.com/ |
| Recipient Portal | https://www.nctracks.nc.gov/content/public/NCTracks-Recipient-Portal?flow=RP |
| Operations Portal | https://www.nctracks.nc.gov/content/public/NCTracks-Operations-Portal?flow=OP |
| Trading Partner Information | https://www.nctracks.nc.gov/content/public/providers/provider-trading-partners.html |
| EDI FAQ | https://www.nctracks.nc.gov/content/public/providers/faq-main-page/faqs-for-edi.html |
| NCID | https://ncid.nc.gov |
| MyNCID (MFA enrollment) | https://myncid.nc.gov |
| Trading Partner Connectivity Guide (PDF) | https://www.nctracks.nc.gov/content/dam/jcr:3922b8d3-9521-459e-8cb7-6b405a2ede5b/CG_TPConn.pdf |
| 270/271 Companion Guide (PDF) | https://www.nctracks.nc.gov/content/dam/jcr:b987d9f5-d230-4c81-b78b-05780eb0bbaf/270_271%20Health%20Care%20Eligibility%20Benefit%20Inquiry%20and%20Response%20(7).pdf |
| 835 Companion Guide (PDF) | https://www.nctracks.nc.gov/content/dam/jcr:b90ef1df-0ce7-4d10-a034-59297a328ca3/835%20Health%20Care%20Claim%20Payment_Advice%203.2021.pdf |

Private (issued at onboarding — store in vault, never commit):
- `https://<gdit-edi-host>/CORE/Eligibility` — SOAP/MIME real-time 270/271
- `https://<gdit-edi-host>/CORE/ClaimStatus` — SOAP/MIME real-time 276/277
- `sftp://<gdit-sftp-host>:22` — directories typically `/inbound/837P`, `/outbound/835`, `/outbound/999`, `/outbound/277CA`
- Connect:Direct: node `NCTRACKS.PROD` (pattern; confirm at onboarding)

### Real-time CORE envelope (270 example, abridged)
```xml
<COREEnvelopeRealTimeRequest xmlns="http://www.caqh.org/SOAP/WSDL/CORERule2.2.0.xsd">
  <PayloadType>X12_270_Request_005010X279A1</PayloadType>
  <ProcessingMode>RealTime</ProcessingMode>
  <PayloadID>{uuid}</PayloadID>
  <TimeStamp>2026-05-22T12:00:00Z</TimeStamp>
  <SenderID>{TSN}</SenderID>
  <ReceiverID>NCTRACKS</ReceiverID>
  <CORERuleVersion>2.2.0</CORERuleVersion>
  <Payload>{base64 or escaped X12 270}</Payload>
</COREEnvelopeRealTimeRequest>
```

---

## 7. NC-specific quirks

- **Taxonomy required.** NCTracks enforces a valid **provider taxonomy code** on every claim line + the billing/rendering/attending loop (Loop 2000A PRV03, 2310A/B PRV03). NCTracks will deny if the taxonomy is not on the provider's enrollment record. Re-credentialing flips taxonomies — keep them in sync.
- **NPI + Atypical ID.** Atypical providers (PCS, transportation, residential) use an NC-assigned Atypical ID rather than NPI; carry it in REF*EI (or REF*G2 in some loops) per the 837 CG.
- **NC-specific reason codes.** NCTracks RA contains both standard CARC/RARC and NC-specific EOB codes. The **EOB-to-HIPAA Code Crosswalk** maps internal EOB codes back to CARC/RARC and lives on the Provider Portal RA page. Always pair it with your 835 parser.
- **Prior Authorization.** Submitted via the **Prior Approval** section of the NCTracks Provider Portal or via 278 (limited scope). Most clinical PAs route to the medical PBA. Behavioral health PAs route to the member's Tailored Plan / LME-MCO, not NCTracks.
- **Behavioral-health carve-out (LME-MCO / Tailored Plans).** Since 2024-07-01, the four Tailored Plans handle BH/IDD/TBI claims for their members; NCTracks no longer adjudicates those FFS. The four are: **Alliance Health**, **Partners Health Management**, **Trillium Health Resources**, **Vaya Health (Vaya Total Care)**. **Eastpointe was consolidated into Trillium**. Encounter data flows back to NCTracks through the ITF. (https://medicaid.ncdhhs.gov/tailored-plans, https://medicaid.ncdhhs.gov/lmemco-consolidation-overview-and-faqs-providers/open)
- **Standard Plans (Medicaid Managed Care, since 2021-07-01):** five PHPs:
  1. **AmeriHealth Caritas North Carolina** (statewide)
  2. **Healthy Blue (Blue Cross NC + Amerigroup)** (statewide)
  3. **UnitedHealthcare Community Plan of NC** (statewide)
  4. **WellCare of NC** (statewide)
  5. **Carolina Complete Health** (Regions 3, 4, 5 only — physician-led, Centene-backed)
  Source: https://medicaid.ncdhhs.gov/about-nc-medicaid/health-plans, https://medicaid.ncdhhs.gov/managed-care-quick-reference-guide/open
- **EBCI Tribal Option** — separate plan for Eastern Band of Cherokee Indians; not Standard or Tailored.
- **NC Medicaid Direct** — the residual FFS population (some duals, foster youth in certain situations, etc.) — claims go to NCTracks.
- **PHP encounter submission** — PHPs submit encounters to NCTracks per the ITF; format is 837 with PHP-specific ISA/GS sender IDs and additional NC-defined data elements.

---

## 8. Compliance hooks

| Reg | What it forces |
|---|---|
| **42 CFR 455 Subpart E** | Provider screening — **NPI** validation, **PECOS** check, **OIG LEIE** + **GSA SAM** exclusion list scrub, fingerprinting for high-risk categories. NCTracks performs this at enrollment + monthly. Adapter must surface exclusion-hit reasons. |
| **45 CFR 162 (HIPAA Administrative Simplification)** | Mandates X12 5010 transactions, NPI, code sets (ICD-10, CPT, HCPCS, NDC, CDT). All NCTracks EDI is bound by this. |
| **HIPAA Privacy/Security (45 CFR 160, 164)** | Encryption in transit (TLS 1.2+), audit logging, BAA between you and any cloud vendor. NCTracks itself is the covered entity's business associate via GDIT. |
| **42 CFR Part 2** | SUD records — extra disclosure restrictions on behavioral health data routed via LME-MCOs/Tailored Plans. |
| **CMS Interoperability (45 CFR 156.221)** | Doesn't bind state MMIS directly but PHPs must expose Patient Access APIs — relevant if MedGuard360 ingests PHP data. |
| **NC DHHS Provider Permission Matrix** | NC-specific role-based access on the Provider Portal — every NCID user is mapped to functions (claims submit, PA submit, etc.). |
| **NC SL 2015-245 / SL 2018-48** | Statutory basis for NC Medicaid Transformation (Standard + Tailored Plans). Drives the ITF. |
| **CAQH CORE Phase II** | Real-time 270/271 + 276/277 connectivity rules — mandated by HHS. |

---

## 9. Useful URLs (cheat sheet)

- NCTracks home: https://www.nctracks.nc.gov/
- Provider portal: https://www.nctracks.nc.gov/content/public/NCTracks-Provider-Portal?flow=PP
- Trading Partner Info: https://www.nctracks.nc.gov/content/public/providers/provider-trading-partners.html
- Trading Partner FAQ: https://www.nctracks.nc.gov/content/public/providers/provider-trading-partners/faqs-for-trading-partners.html
- EDI FAQ: https://www.nctracks.nc.gov/content/public/providers/faq-main-page/faqs-for-edi.html
- EDI Support email: **NCMMIS_EDI_Support@gdit.com**
- NCTracks Call Center: **1-800-688-6696**
- DIT helpdesk (NCID): **919-754-6000 / 800-722-3946**
- NC DHHS Office of NCTracks: https://www.ncdhhs.gov/about/administrative-offices/nctracks
- NC Medicaid bulletins: https://medicaid.ncdhhs.gov/blog
- NC Medicaid Health Plans: https://medicaid.ncdhhs.gov/about-nc-medicaid/health-plans
- Tailored Plans: https://medicaid.ncdhhs.gov/tailored-plans
- Tailored Plans launch announcement: https://www.nctracks.nc.gov/content/public/providers/provider-communications/2024-Announcements/NC-Medicaid-is-launching-Tailored-Plans-on-July-1st.html
- LME/MCO Encounter Data Submission Manual (legacy, v3): https://per.nctracks.com/content/dam/jcr:36c968e1-2063-41e0-b194-9fecb2eab160/LME%20MCO%20MANUAL%20FOR%20ENCOUNTER%20DATA%20SUBMISSION%20v3%20512019.pdf
- NCID: https://ncid.nc.gov / MyNCID MFA: https://myncid.nc.gov
- Edifecs Ramp Management (testing portal, partner-gated): https://nctracks.rampmanagement.com (confirm at onboarding)

---

## Open questions to settle before implementing

1. Current ITF version number — pull from GDIT EDI Support directly; ensure it post-dates 2024-07-01 Tailored Plan go-live.
2. Production SOAP host, SFTP host, Connect:Direct node names — issued per partner.
3. Whether MedGuard360 will also need encounter submission (837 encounter) or only FFS — different ISA/GS sender IDs and ITF obligations.
4. Whether we proxy provider PA submissions through a portal RPA flow or limit to 278 (limited scope on NCTracks).
5. Cert rotation cadence + key custodian.
