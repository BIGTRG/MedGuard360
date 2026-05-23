# Business Associate Agreement (BAA) — Template
**MedGuard360 LLC** — a Delaware limited liability company, principal office Raleigh, NC ("Business Associate")
and
**[COUNTERPARTY LEGAL NAME]** ("Covered Entity" *or* "Upstream Business Associate" — strike whichever is inapplicable)

**Effective Date:** _____________________
**MedGuard360 Form ID:** MG360-BAA-2026.1
**Regulatory basis:** HIPAA Privacy & Security Rules, 45 CFR Parts 160 & 164 (subparts A, C, D, E); HITECH Act (Pub. L. 111-5), and implementing regulations.

> **How to use this template.** This form supports three counterparty types — check one:
> - [ ] **(A) State Medicaid agency** (Covered Entity under 45 CFR 160.103) — e.g., NC DHHS / Division of Health Benefits, GA DCH.
> - [ ] **(B) Provider organization** (Covered Entity) — hospital system, FQHC, physician group.
> - [ ] **(C) Subcontractor of MedGuard360** that creates, receives, maintains, or transmits PHI on MedGuard360's behalf (45 CFR 160.103 definition of Business Associate, paragraph (3)(iii)). MedGuard360 is the "Upstream Business Associate."
> The clause set is identical for A/B/C; the flow-down direction simply reverses for (C). State-specific addenda (NC, GA) are at the end.

---

## Recitals

WHEREAS the Parties wish to comply with the requirements of the HIPAA Privacy, Security, Breach Notification, and Enforcement Rules (45 CFR Parts 160 & 164) as amended by HITECH and the 2013 Omnibus Final Rule (78 Fed. Reg. 5566) and the 2026 Security Rule Update;

WHEREAS Business Associate will create, receive, maintain, or transmit Protected Health Information ("PHI") on behalf of Covered Entity in performance of the Underlying Services Agreement dated _______________ ("Underlying Agreement");

NOW THEREFORE, in consideration of the mutual promises set forth herein, the Parties agree as follows.

---

## 1. Definitions

Capitalized terms not defined herein have the meanings set forth at 45 CFR §§ 160.103 and 164.501. "Breach," "Electronic PHI" ("ePHI"), "Required by Law," "Unsecured PHI," and "Subcontractor" carry the regulatory meanings. "Secretary" means the Secretary of HHS or her designee.

---

## 2. Permitted Uses and Disclosures of PHI
*(Regulatory basis: 45 CFR 164.504(e)(2)(i), 164.504(e)(2)(ii)(A), 164.504(e)(4))*

2.1 **Performance of services.** Business Associate may use and disclose PHI only as necessary to perform the services in the Underlying Agreement and as permitted by this BAA. The permitted PHI categories and minimum-necessary scope are listed in **Exhibit A**.

2.2 **Permitted purposes.** Business Associate may:
  (a) use PHI for the proper management and administration of Business Associate;
  (b) carry out its legal responsibilities;
  (c) provide data aggregation services to Covered Entity as defined at 45 CFR 164.501;
  (d) de-identify PHI in conformance with 45 CFR 164.514(b) (Expert Determination or Safe Harbor) and use the de-identified data without restriction, provided the de-identification methodology is documented and made available on request;
  (e) create limited data sets per 45 CFR 164.514(e), subject to a Data Use Agreement.

2.3 **Prohibited.** Business Associate shall not (i) sell PHI (45 CFR 164.502(a)(5)(ii)); (ii) use or disclose PHI for marketing (164.508(a)(3)) without authorization; (iii) use PHI for any purpose not authorized by this BAA or Required by Law.

---

## 3. Required Safeguards
*(Regulatory basis: 45 CFR 164.504(e)(2)(ii)(B); 164.308, 164.310, 164.312, 164.316; HHS 2026 Security Rule Update)*

3.1 **Administrative Safeguards** (164.308): designated Security Official; workforce training within 30 days of hire and annually; sanction policy; access management with documented authorization; risk analysis at least annually using NIST SP 800-66r2 methodology; contingency plan with quarterly backup verification and annual DR test.

3.2 **Physical Safeguards** (164.310): facility access controls (inherited from AWS GovCloud or equivalent SOC 2 Type II facility); workstation security via MDM with full-disk encryption; secure media disposal per NIST 800-88 with destruction certificate retained 6 years.

3.3 **Technical Safeguards** (164.312): unique user identification; emergency access procedure; automatic logoff ≤ 15 min idle; encryption of ePHI **at rest using AES-256 (FIPS 140-3 validated)** and **in transit using TLS 1.3 or better** — both now mandatory under the 2026 Security Rule Update (HHS NPRM, 90 Fed. Reg. 898); audit controls per 164.312(b); integrity controls (cryptographic hash or ledger).

3.4 **Organizational and Documentation Safeguards** (164.314, 164.316): written policies retained 6 years; this BAA reviewed annually; subcontractor flow-down per Section 5.

3.5 **Standards adopted.** Business Associate represents that it operates a control environment mapped to NIST SP 800-53 Rev 5, SOC 2 Trust Service Criteria, and HITRUST CSF i1, and will provide its most recent SOC 2 Type II report and HITRUST validated report under NDA upon request, no more than annually.

---

## 4. Reporting of Unauthorized Use/Disclosure and Breach Notification
*(Regulatory basis: 45 CFR 164.504(e)(2)(ii)(C), 164.410, 164.404, 164.408, 164.412)*

4.1 **Security Incident reporting.** Business Associate shall report any successful Security Incident affecting ePHI to Covered Entity **without unreasonable delay and no later than ten (10) business days** after discovery. Unsuccessful Security Incidents (e.g., pings, port scans, denied access attempts) are reported in aggregate quarterly per 164.314(a)(2)(i)(C).

4.2 **Breach notification.** Business Associate shall notify Covered Entity of a Breach of Unsecured PHI **without unreasonable delay and in no case later than sixty (60) calendar days** after discovery (45 CFR 164.410(b)). Initial notification within **five (5) business days** of discovery shall include, to the extent then known: (i) identification of each individual affected, (ii) date(s) of Breach and discovery, (iii) description of PHI involved, (iv) description of what occurred, (v) mitigation steps taken. Final report due within 60 days.

4.3 **Cooperation.** Business Associate shall cooperate with Covered Entity's investigation, including providing logs, forensic reports, and access to personnel.

4.4 **Notification costs.** Where the Breach is caused by Business Associate's act or omission, Business Associate shall bear reasonable costs of individual notice, substitute notice, media notice, and credit/identity monitoring (minimum 24 months) — subject to the liability cap in Section 11.

---

## 5. Subcontractor Flow-Down
*(Regulatory basis: 45 CFR 164.502(e)(1)(ii), 164.308(b)(2), 164.504(e)(2)(ii)(D))*

5.1 Business Associate shall, in accordance with 45 CFR 164.502(e)(1)(ii) and 164.308(b)(2), require each Subcontractor that creates, receives, maintains, or transmits PHI on behalf of Business Associate to agree in writing to restrictions and conditions **at least as stringent** as those imposed on Business Associate by this BAA.

5.2 Business Associate maintains a current list of Subcontractors handling PHI ("Sub-BA Register"). The list as of the Effective Date is **Exhibit B**. Material additions will be communicated within 30 days.

5.3 Business Associate is responsible for the acts and omissions of its Subcontractors with respect to PHI.

---

## 6. Individual Rights — Access, Amendment, Accounting

### 6.1 Access (164.524) — *Regulatory basis: 45 CFR 164.504(e)(2)(ii)(E)*
Within **fifteen (15) business days** of Covered Entity's request, Business Associate shall make PHI in a Designated Record Set available to Covered Entity (or directly to the individual if so directed) in the form and format requested, including electronic copies per 164.524(c)(2).

### 6.2 Amendment (164.526) — *Regulatory basis: 45 CFR 164.504(e)(2)(ii)(F)*
Business Associate shall incorporate amendments to PHI made by Covered Entity within **fifteen (15) business days** of receipt.

### 6.3 Accounting of Disclosures (164.528) — *Regulatory basis: 45 CFR 164.504(e)(2)(ii)(G)*
Business Associate shall maintain a log of disclosures of PHI subject to accounting (excluding those listed in 164.528(a)(1)) for **six (6) years** and provide such log within **thirty (30) days** of request.

### 6.4 Restrictions and Confidential Communications.
Business Associate shall honor restrictions agreed to by Covered Entity under 164.522 and confidential-communications requests under 164.522(b), provided Covered Entity gives notice.

---

## 7. Access by the Secretary
*(Regulatory basis: 45 CFR 164.504(e)(2)(ii)(H))*

Business Associate shall make its internal practices, books, and records relating to the use and disclosure of PHI available to the Secretary for purposes of determining compliance.

---

## 8. Return or Destruction of PHI on Termination
*(Regulatory basis: 45 CFR 164.504(e)(2)(ii)(J))*

8.1 Upon termination of the Underlying Agreement, Business Associate shall return or destroy all PHI it received from, or created/received on behalf of, Covered Entity, including PHI held by Subcontractors.

8.2 **Infeasibility.** If return or destruction is infeasible (e.g., immutable audit ledger entries required by 164.312(b)), Business Associate shall (a) provide a written statement of infeasibility; (b) extend the protections of this BAA to such PHI; and (c) limit further uses/disclosures to those purposes that make return or destruction infeasible.

8.3 Destruction shall conform to NIST SP 800-88 Rev 1 ("Clear" or "Purge" for ePHI; cross-cut shred for paper). Certificate of destruction provided within 30 days.

---

## 9. Subpoena, Government Request, and Litigation Hold

9.1 Business Associate shall, **within five (5) business days** of receipt and to the extent legally permitted, notify Covered Entity of any subpoena, court order, or governmental demand for PHI so that Covered Entity may seek a protective order.

9.2 Business Associate shall preserve PHI subject to a litigation hold notice from Covered Entity, suspending normal retention/destruction.

---

## 10. Cyber-Liability Insurance
*(Risk-allocation provision; not required by 45 CFR 164.504(e) but standard market term.)*

Business Associate shall maintain at its sole cost:
  (a) Cyber-liability and privacy insurance with limits not less than **$10,000,000** per claim / $20,000,000 aggregate, covering regulatory defense, breach notification, credit monitoring, forensic investigation, and HIPAA penalties to the extent insurable;
  (b) Commercial general liability of $2M / $5M;
  (c) Tech E&O of $5M / $10M.
Certificates naming Covered Entity as additional insured provided annually.

---

## 11. Indemnification and Liability

11.1 Business Associate shall indemnify and hold Covered Entity harmless from third-party claims, governmental fines (where insurable and permitted by law), and reasonable defense costs arising from Business Associate's (i) Breach of Unsecured PHI caused by its act or omission; (ii) violation of this BAA; (iii) gross negligence or willful misconduct.

11.2 **Liability cap.** Except for the carve-outs in §11.3, each Party's aggregate liability under this BAA is capped at the **greater of (a) $5,000,000 or (b) two times (2×) the fees paid under the Underlying Agreement in the 12 months preceding the claim**.

11.3 **Carve-outs from cap** — no cap applies to: (i) breach of confidentiality of PHI; (ii) gross negligence or willful misconduct; (iii) indemnification for third-party IP infringement; (iv) violations of law; (v) the costs Business Associate is required to bear under §4.4.

11.4 **Cyber-insurance carve-out.** Recoveries under §10 do not reduce the liability cap.

---

## 12. Termination
*(Regulatory basis: 45 CFR 164.504(e)(2)(iii), 164.504(e)(1)(ii))*

12.1 **For cause.** Covered Entity may terminate this BAA and the Underlying Agreement, without penalty, if it determines that Business Associate has materially breached this BAA and has not cured within thirty (30) days of written notice (or such shorter period as the breach reasonably requires).

12.2 **For convenience.** Per the Underlying Agreement.

12.3 **Regulatory termination.** Either Party may terminate immediately if continued performance would violate HIPAA or other applicable law.

---

## 13. Survival
*(Regulatory basis: 45 CFR 164.504(e)(2)(ii)(J), implied by the 6-year documentation rule at 164.316(b)(2))*

The obligations in Sections 4 (Breach Notification for incidents discovered post-termination), 6 (Individual Rights for the 6-year retention period), 7 (HHS Access), 8 (Return/Destruction), 10 (Insurance — 3 years tail), 11 (Indemnification), and 13 (Survival) survive termination.

---

## 14. Miscellaneous

14.1 **Amendment.** The Parties shall negotiate in good faith to amend this BAA as necessary to comply with changes in HIPAA or other applicable law within 60 days of effectiveness of such change.

14.2 **Regulatory interpretation.** Any ambiguity shall be resolved in favor of an interpretation that permits the Parties to comply with HIPAA.

14.3 **No third-party beneficiaries** except individuals as expressly contemplated by HIPAA.

14.4 **Governing law.** [State of Covered Entity for State Medicaid agency; otherwise Delaware], excluding conflict-of-law principles. Venue: state and federal courts of the same jurisdiction.

14.5 **Order of precedence.** This BAA controls over the Underlying Agreement with respect to PHI handling; the Underlying Agreement controls in all other respects.

14.6 **Notices.** As specified in the Underlying Agreement; security/breach notices additionally sent to security@medguard360.com and to Covered Entity's designated Privacy Officer.

14.7 **Counterparts; e-signature.** May be executed in counterparts; electronic signature valid under E-SIGN and UETA.

---

## 15. Signatures

**MedGuard360 LLC**
By: ___________________________
Name: _________________________
Title: __________________________
Date: __________________________

**[Counterparty]**
By: ___________________________
Name: _________________________
Title: __________________________
Date: __________________________

---

# Exhibit A — Permitted PHI Categories & Minimum-Necessary Scope

| # | PHI Category (per 45 CFR 164.514(b)(2) identifiers) | Permitted? | Purpose | Minimum-Necessary Justification |
|---|---|---|---|---|
| 1 | Names | Yes | Case identification, provider outreach | Required to link claim to member |
| 2 | Geographic subdivisions smaller than state | Yes | Fraud-pattern geo-clustering | Aggregated to 3-digit ZIP for analytics; full ZIP retained only in case files |
| 3 | Dates (DOB, admission, discharge, DOS) | Yes | Claims time-series analysis | Required for ML feature engineering |
| 4 | Phone / fax | Yes | Provider outreach for investigations | Limited to provider-level, not member contact |
| 5 | Email | Limited | Investigator-to-provider comms only | No member-direct email |
| 6 | SSN | **No** | — | MedGuard360 does **not** ingest SSN; Medicaid ID used instead |
| 7 | Medical Record Number | Yes | Cross-claim linkage | Required for unique-member identification |
| 8 | Health Plan / Medicaid Beneficiary ID | Yes | Eligibility verification | Core identifier |
| 9 | Account numbers | Yes | Claim reference | — |
| 10 | Certificate/license numbers (provider NPI) | Yes | Provider risk-scoring | — |
| 11 | Vehicle / device IDs | No | — | Out of scope |
| 12 | URLs / IP addresses | Limited | Security audit logs only | Not used for clinical purposes |
| 13 | Biometric identifiers | No | — | MedGuard360 uses biometric **authentication** (no biometric template stored centrally — kept on user device per WebAuthn) |
| 14 | Full-face photos | No | — | Out of scope |
| 15 | ICD-10 / CPT / HCPCS codes & clinical narratives | Yes | Fraud detection ML | Core feature set |
| 16 | Pharmacy claims (NDC, days supply, prescriber) | Yes | Opioid / DME fraud patterns | Core feature set |

**Minimum-necessary standard:** Business Associate's RBAC and Row-Level Security enforce that each investigator can access only PHI for cases assigned to their queue. Bulk access requires a documented justification ticket reviewed by the Privacy Officer.

---

# Exhibit B — Subcontractor (Sub-BA) Register

*Sub-BAs that create, receive, maintain, or transmit PHI on behalf of MedGuard360 as of the Effective Date. Each has executed a downstream BAA on the MedGuard360 form. Material additions will be communicated within 30 days per §5.2.*

| # | Sub-BA | Service Provided | PHI Categories | BAA on file | Latest SOC 2 / HITRUST |
|---|---|---|---|---|---|
| 1 | Amazon Web Services, Inc. (GovCloud) | Hosting, KMS, S3, RDS, QLDB | All Exhibit A items processed/stored | AWS BAA executed | SOC 2 Type II + FedRAMP High |
| 2 | Clerk Inc. | Identity / authentication | Names, email (no clinical PHI) | Clerk BAA executed | SOC 2 Type II |
| 3 | Datadog, Inc. | Observability (PHI scrubbing required) | Limited — audit log metadata only | Datadog HIPAA BAA executed | SOC 2 Type II + HITRUST |
| 4 | Twilio Inc. (Flex / SendGrid) | Investigator-to-provider comms | Phone, email, content of comms | Twilio BAA executed | SOC 2 Type II |
| 5 | Snowflake Inc. (HIPAA edition) | Analytics warehouse | De-identified + limited data sets | Snowflake BAA executed | SOC 2 Type II + HITRUST r2 |
| 6 | PagerDuty, Inc. | Incident response routing | None (metadata only) | DPA + BAA executed | SOC 2 Type II |
| 7 | [Pen-test firm — Bishop Fox] | Annual penetration test | Read-only access to test PHI in non-prod | BAA executed pre-engagement | SOC 2 Type II |

---

# Exhibit C — State-Specific Addenda

## C-1. North Carolina Addendum

- **NC Identity Theft Protection Act (N.C. Gen. Stat. § 75-65):** Business Associate shall notify the NC Attorney General's Consumer Protection Division and affected NC residents of a security breach of personal information without unreasonable delay; coordinated with HIPAA breach notice.
- **NC DHHS Privacy & Security Office requirements:** Business Associate shall comply with NC DHHS Privacy and Security Manual and the NC Statewide Information Security Manual where referenced by Covered Entity.
- **NCID identity federation:** Where Covered Entity is NC DHHS or a NC state-funded provider, Business Associate shall integrate with NCID per the NCID SAML profile and the NC DIT Identity Management Service Agreement.
- **NCTracks Trading Partner Agreement (TPA):** Where Business Associate exchanges 837/835/270/271 with NCTracks, the Trading Partner Agreement is incorporated by reference and controls EDI specifics.
- **Public records:** Business Associate acknowledges that some Covered Entity records may be subject to NC Public Records Act (Chapter 132); PHI remains exempt under N.C. Gen. Stat. § 132-1.7 and HIPAA preemption.

## C-2. Georgia Addendum

- **Georgia Personal Identity Protection Act (O.C.G.A. § 10-1-910 et seq.):** Notification of breach of personal information to Georgia residents and, where 10,000+ residents affected, to consumer reporting agencies.
- **GA DCH Medicaid Provider Agreement & GAMMIS:** Where data flows through Gainwell-operated GAMMIS, Business Associate shall comply with DCH Policies and Procedures Manual Part I and the GAMMIS Trading Partner Agreement.
- **GA Open Records Act (O.C.G.A. § 50-18-70):** Same PHI exemption as above via O.C.G.A. § 50-18-72(a)(2) and HIPAA preemption.
- **Georgia SSO / SAML federation:** Where state staff access is required, federation via GeorgiaGov OIDC per GTA standards.

---

## Authoritative regulatory citations

- HIPAA Privacy Rule — 45 CFR Part 164 Subpart E — https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E
- HIPAA Security Rule — 45 CFR Part 164 Subpart C — https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-C
- 45 CFR 164.504(e) Business Associate Contracts — https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E/section-164.504
- 45 CFR 164.410 Breach Notification by a BA — https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-D/section-164.410
- HHS BA guidance — https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/business-associates/index.html
- 2026 Security Rule Update NPRM — https://www.federalregister.gov/documents/2025/01/06/2024-30983/hipaa-security-rule-to-strengthen-the-cybersecurity-of-electronic-protected-health-information
- NIST SP 800-66 Rev 2 — https://csrc.nist.gov/pubs/sp/800/66/r2/final
- NIST SP 800-88 Rev 1 (Media Sanitization) — https://csrc.nist.gov/pubs/sp/800/88/r1/final
- N.C. Gen. Stat. § 75-65 — https://www.ncleg.gov/EnactedLegislation/Statutes/HTML/BySection/Chapter_75/GS_75-65.html
- O.C.G.A. § 10-1-910 et seq. — https://law.justia.com/codes/georgia/title-10/chapter-1/article-34/

> **Legal review required before execution.** This template reflects MedGuard360's standard position. Outside counsel (Womble Bond Dickinson — NC; Alston & Bird — GA) must review counterparty redlines before signing.
