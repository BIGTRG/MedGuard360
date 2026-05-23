# MedGuard360 — Unified Control Mapping
**Frameworks:** NIST SP 800-53 Rev 5 · HIPAA Security Rule (45 CFR 164.308–.316) · SOC 2 (2017 TSC, 2022 points-of-focus) · HITRUST CSF v11.x i1 (182 requirement statements)
**Owner:** MedGuard360 LLC — Security & Compliance
**Last reviewed:** 2026-05-23
**Audience:** Coalfire / A-LIGN / Drummond assessors, NC DHHS Privacy Office, GA DCH Compliance, internal engineering.

---

## 1. How to read this document

- **Status** — `Implemented` = control operating ≥ 90 days with evidence; `Partial` = design complete, evidence gap; `Not-yet` = on the 26-week plan.
- **Component** points to the actual repo path / service / config file an auditor can pull.
- **Evidence** lists the artifact type (screenshot, log query, config export, ticket) and the system of record.
- Cross-mappings to HITRUST CSF i1 use the v11.4 reference numbers (e.g., `01.b`); HIPAA cites the regulatory subsection; SOC 2 cites the TSC criterion code (`CC6.1`, `A1.2`, etc.).

Authoritative sources:
- NIST SP 800-53 Rev 5 control catalog — https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf
- HHS HIPAA Security Rule — https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
- AICPA TSP Section 100 (2017 TSC, rev. 2022) — https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022
- HITRUST CSF i1 program — https://hitrustalliance.net/assessments-and-certifications/i1

---

## 2. Master control table

### 2.1 Access Control (NIST AC family)

| Control ID | Framework | Title | MedGuard360 Component | Evidence | Status |
|---|---|---|---|---|---|
| AC-2 | NIST 800-53 r5 | Account Management | `services/auth-service` (Clerk + custom Postgres `users` table); JIT provisioning via SCIM from NCID; quarterly review job `jobs/access-review.ts` | Clerk admin export (CSV) of all users + last-login; SCIM event log; Jira ticket `SEC-quarterly-review-2026Q2` | Implemented |
| AC-3 | NIST 800-53 r5 | Access Enforcement | `services/auth-service/AuthGate.ts` middleware on every API route; Postgres Row-Level Security policies in `db/migrations/2026_03_rls.sql` | Source diff; pg_policies export; Burp Suite re-auth test report | Implemented |
| AC-5 | NIST 800-53 r5 | Separation of Duties | RBAC roles `investigator`, `reviewer`, `approver`, `admin` — no role can both create & approve a case; enforced in `services/case-service/policy.ts` | Role matrix in `docs/rbac.md`; unit tests `case-service/policy.test.ts`; sample case with split approval chain | Implemented |
| AC-6 | NIST 800-53 r5 | Least Privilege | All IAM roles scoped via Terraform `infra/iam/*.tf`; PHI-bearing S3 buckets readable only by `phi-reader` role; break-glass via 2-person PagerDuty approval | Terraform plan output; AWS IAM Access Analyzer report; break-glass ticket history | Partial — break-glass automation in flight (Week 6) |
| AC-7 | NIST 800-53 r5 | Unsuccessful Logon Attempts | Clerk policy: 5 failures → 15-min lockout; alert to Datadog after 3 consecutive lockouts on one account | Clerk policy screenshot; Datadog monitor JSON `monitors/auth-bruteforce.json` | Implemented |
| AC-17 | NIST 800-53 r5 | Remote Access | All admin access via Tailscale ACL + hardware key (YubiKey 5C); no public SSH; bastion jump-host logs to CloudTrail | Tailscale ACL export; YubiKey enrollment roster; CloudTrail query saved as `CT-admin-sessions` | Implemented |

**HIPAA cross-map:** 164.308(a)(3) Workforce Security, 164.308(a)(4) Information Access Management, 164.312(a)(1) Access Control, 164.312(a)(2)(i) Unique User ID, 164.312(a)(2)(iii) Automatic Logoff.
**SOC 2 cross-map:** CC6.1, CC6.2, CC6.3, CC6.6, CC6.7.
**HITRUST i1 cross-map:** 01.b, 01.c, 01.j, 01.q, 01.v.

---

### 2.2 Audit & Accountability (NIST AU family)

| Control ID | Framework | Title | MedGuard360 Component | Evidence | Status |
|---|---|---|---|---|---|
| AU-2 | NIST 800-53 r5 | Event Logging | `services/audit-log-service` writes to immutable AWS QLDB ledger `medguard-audit-ledger`; event schema in `proto/audit_event.proto` | Ledger digest export; sample 24-hr event dump | Implemented |
| AU-3 | NIST 800-53 r5 | Content of Audit Records | Each record: `who, what, when, where, source-IP, session-id, before/after hash, correlation-id` | JSON schema file; sample records | Implemented |
| AU-6 | NIST 800-53 r5 | Audit Review, Analysis, Reporting | Daily SIEM digest in Datadog → reviewed by SecOps; anomalies open Jira `SEC-` ticket | Datadog dashboard screenshot; ticket queue | Partial — automated UEBA rules (Week 9) |
| AU-9 | NIST 800-53 r5 | Protection of Audit Information | QLDB cryptographic ledger (cannot delete); IAM separation — app role cannot delete, only `audit-admin` can export | QLDB doc on immutability; IAM policy JSON | Implemented |
| AU-12 | NIST 800-53 r5 | Audit Record Generation | All services emit OpenTelemetry → Fluent Bit → QLDB & S3 archive (7-yr WORM) | OTel collector config; S3 Object Lock policy | Implemented |

**HIPAA cross-map:** 164.308(a)(1)(ii)(D) Info System Activity Review, 164.312(b) Audit Controls, 164.312(c)(1) Integrity.
**SOC 2 cross-map:** CC7.2, CC7.3.
**HITRUST i1 cross-map:** 09.aa, 09.ab, 09.ac, 09.ad, 09.ae.

---

### 2.3 System & Communications Protection (NIST SC family)

| Control ID | Framework | Title | MedGuard360 Component | Evidence | Status |
|---|---|---|---|---|---|
| SC-7 | NIST 800-53 r5 | Boundary Protection | AWS VPC with private subnets; ALB → nginx ingress (`infra/k8s/ingress.yaml`); AWS WAF managed rules + custom rate-limit | VPC diagram; WAF rule export; nginx config | Implemented |
| SC-8 | NIST 800-53 r5 | Transmission Confidentiality & Integrity | TLS 1.3 only (nginx `ssl_protocols TLSv1.3`); HSTS preload; mTLS between internal services via Linkerd | nginx config; SSL Labs A+ report; Linkerd cert chain | Implemented |
| SC-13 | NIST 800-53 r5 | Cryptographic Protection | FIPS 140-3 validated modules — AWS KMS HSM (CloudHSM cluster `medguard-hsm-1`); BoringCrypto in Go services | KMS key list with `Origin=AWS_CLOUDHSM`; Go build flags | Partial — CloudHSM cluster spins up Week 11 |
| SC-28 | NIST 800-53 r5 | Protection of Info at Rest | AES-256-GCM via KMS envelope encryption on RDS, S3, EBS, QLDB; per-tenant CMK | RDS encryption attribute; S3 bucket policy `aws:kms` enforcement | Implemented |

**HIPAA cross-map:** 164.312(e)(1) Transmission Security, 164.312(e)(2)(ii) Encryption, 164.312(a)(2)(iv) Encryption at Rest.
**SOC 2 cross-map:** CC6.1, CC6.6, CC6.7.
**HITRUST i1 cross-map:** 09.m, 09.s, 10.f, 10.g.

> Note: The 2026 HIPAA Security Rule update made encryption of ePHI at rest and in transit **mandatory** (no longer "addressable"). Compliance deadline: 2027-01-01. See https://www.federalregister.gov/

---

### 2.4 Identification & Authentication (NIST IA family)

| Control ID | Framework | Title | MedGuard360 Component | Evidence | Status |
|---|---|---|---|---|---|
| IA-2 | NIST 800-53 r5 | Identification & Authentication (Users) | Clerk Pro as IdP; phishing-resistant MFA required (WebAuthn / FIDO2); biometric step-up for case approval | Clerk MFA policy screenshot; sample WebAuthn ceremony | Implemented |
| IA-2(1) | NIST 800-53 r5 | MFA to Privileged Accounts | Mandatory hardware key for all `admin` and `audit-admin` accounts | Yubico roster | Implemented |
| IA-2(8) | NIST 800-53 r5 | Replay-Resistant Authentication | WebAuthn challenge-response; JWT `nonce` claim per session | Auth flow diagram | Implemented |
| IA-5 | NIST 800-53 r5 | Authenticator Management | Clerk password policy (NIST 800-63B-aligned, 14-char min, breached-pw screening via HIBP); 90-day key rotation in KMS | Clerk policy export; KMS rotation status | Implemented |
| IA-8 | NIST 800-53 r5 | I&A (Non-Org Users) | NCID federation for NC state staff via SAML 2.0; Georgia GeorgiaGov SSO via OIDC (Q3) | SAML metadata; federation test report | Partial — GA SSO Week 14 |

**HIPAA cross-map:** 164.308(a)(5)(ii)(D) Password Mgmt, 164.312(d) Person/Entity Authentication.
**SOC 2 cross-map:** CC6.1, CC6.2.
**HITRUST i1 cross-map:** 01.d, 01.q, 01.x.

---

### 2.5 System & Information Integrity (NIST SI family)

| Control ID | Framework | Title | MedGuard360 Component | Evidence | Status |
|---|---|---|---|---|---|
| SI-2 | NIST 800-53 r5 | Flaw Remediation | Snyk + GitHub Dependabot; SLA: Critical 7d, High 30d; patches via ArgoCD GitOps | Snyk monthly export; Dependabot PR list; ArgoCD app history | Implemented |
| SI-4 | NIST 800-53 r5 | System Monitoring | Datadog APM + Wazuh HIDS on every node; AWS GuardDuty; Falco runtime policies in `infra/k8s/falco-rules.yaml` | Datadog screenshot; GuardDuty findings export | Partial — Falco rollout Week 5 |
| SI-7 | NIST 800-53 r5 | Software, Firmware, Info Integrity | Sigstore-signed container images; AWS Signer for Lambda; admission controller blocks unsigned images | Cosign verify output; admission webhook config | Partial — Sigstore Week 7 |

**HIPAA cross-map:** 164.308(a)(1)(ii)(A) Risk Analysis, 164.308(a)(5)(ii)(B) Protection from Malicious Software, 164.312(c)(1) Integrity.
**SOC 2 cross-map:** CC7.1, CC7.2, PI1.1.
**HITRUST i1 cross-map:** 09.j, 10.h, 10.m.

---

### 2.6 Configuration Management (NIST CM family)

| Control ID | Framework | Title | MedGuard360 Component | Evidence | Status |
|---|---|---|---|---|---|
| CM-2 | NIST 800-53 r5 | Baseline Configuration | All infra defined in Terraform (`infra/`); container baselines in `Dockerfile.*` pinned to digest | `terraform state list`; Dockerfile review | Implemented |
| CM-3 | NIST 800-53 r5 | Configuration Change Control | Every change via GitHub PR → 2-reviewer rule; CAB ticket for prod via Jira workflow `CAB` | Branch protection screenshot; sample CAB ticket | Implemented |
| CM-6 | NIST 800-53 r5 | Configuration Settings | CIS Benchmark Level 1 on EKS nodes via Bottlerocket; kube-bench in CI | kube-bench JSON; node AMI ID | Implemented |
| CM-7 | NIST 800-53 r5 | Least Functionality | Distroless base images; SSH disabled on nodes; egress allowlist via Calico network policy | Calico policy YAML; sshd absence | Partial — egress allowlist Week 4 |

**HIPAA cross-map:** 164.308(a)(8) Evaluation, 164.310(d)(1) Device & Media Controls.
**SOC 2 cross-map:** CC8.1.
**HITRUST i1 cross-map:** 09.b, 10.k.

---

### 2.7 Incident Response (NIST IR family)

| Control ID | Framework | Title | MedGuard360 Component | Evidence | Status |
|---|---|---|---|---|---|
| IR-4 | NIST 800-53 r5 | Incident Handling | IR runbook in `docs/runbooks/incident.md`; PagerDuty escalation policy `MedGuard-SecOps` | Runbook; PD policy export; tabletop exercise minutes | Implemented |
| IR-5 | NIST 800-53 r5 | Incident Monitoring | Jira project `IR` with severity SLA; weekly SecOps review | Ticket query | Implemented |
| IR-6 | NIST 800-53 r5 | Incident Reporting | HHS OCR breach portal procedure (60-day); state AG notification matrix (NC, GA); CISA voluntary reporting | Procedure doc citing 45 CFR 164.408, 164.410 | Partial — state notification matrix Week 8 |
| IR-8 | NIST 800-53 r5 | Incident Response Plan | Annual IR plan reviewed by Board; tabletop semi-annually | Board minutes; tabletop after-action report | Implemented |

**HIPAA cross-map:** 164.308(a)(6) Security Incident Procedures, 164.404, 164.408, 164.410, 164.412.
**SOC 2 cross-map:** CC7.3, CC7.4, CC7.5.
**HITRUST i1 cross-map:** 11.a, 11.c, 11.d.

---

### 2.8 Risk Assessment (NIST RA family)

| Control ID | Framework | Title | MedGuard360 Component | Evidence | Status |
|---|---|---|---|---|---|
| RA-3 | NIST 800-53 r5 | Risk Assessment | Annual HIPAA SRA per NIST 800-30; risk register in `compliance/risk-register.xlsx` | Coalfire SRA report (Week 4); register | Not-yet (kickoff Week 1) |
| RA-5 | NIST 800-53 r5 | Vulnerability Monitoring & Scanning | Authenticated scans monthly (Tenable.io); external ASV scan quarterly; pen test annually | Tenable report; pen test report (Week 22) | Partial |

**HIPAA cross-map:** 164.308(a)(1)(ii)(A) Risk Analysis, 164.308(a)(1)(ii)(B) Risk Management, 164.308(a)(8) Evaluation.
**SOC 2 cross-map:** CC3.1, CC3.2, CC3.4, CC4.1.
**HITRUST i1 cross-map:** 03.a, 03.b, 03.c, 03.d.

---

## 3. HIPAA Security Rule coverage (45 CFR Part 164 Subpart C)

| HIPAA Citation | Safeguard | MedGuard360 Implementation | Evidence | Status |
|---|---|---|---|---|
| **164.308(a)(1)** | Security Management Process | Annual SRA + risk register + sanction policy | SRA report; HR sanction record | Partial |
| **164.308(a)(2)** | Assigned Security Responsibility | CISO designated (Maria Chen); appointment letter on file | Appointment letter | Implemented |
| **164.308(a)(3)** | Workforce Security | Background checks (Checkr); access authorization workflow in Jira | Checkr report; Jira workflow | Implemented |
| **164.308(a)(4)** | Information Access Management | RBAC + RLS; minimum-necessary review quarterly | Access review ticket | Implemented |
| **164.308(a)(5)** | Security Awareness & Training | KnowBe4 monthly modules; phishing simulation quarterly | KnowBe4 reports | Implemented |
| **164.308(a)(6)** | Security Incident Procedures | See IR family | IR runbook | Implemented |
| **164.308(a)(7)** | Contingency Plan | DR plan, RPO 15min / RTO 4hr; multi-AZ RDS + cross-region S3 replication; annual DR test | DR plan; last DR test 2026-Q1 | Implemented |
| **164.308(a)(8)** | Evaluation | This document + annual technical & non-technical eval | This doc; eval report | Partial |
| **164.310(a)(1)** | Facility Access Controls | AWS GovCloud + co-located staff in HQ (badge + camera, ADT) | AWS SOC 2 report; ADT logs | Implemented |
| **164.310(b)** | Workstation Use | Acceptable Use Policy; Jamf MDM (Mac), Intune (Win) — disk encryption, screensaver | MDM compliance report | Implemented |
| **164.310(c)** | Workstation Security | Same as above + Yubikey for unlock | MDM | Implemented |
| **164.310(d)** | Device & Media Controls | No removable media policy (Jamf blocks USB MSC); decommission via NIST 800-88 wipe | Jamf policy; wipe certificates | Implemented |
| **164.312(a)** | Access Control (Technical) | See AC family | — | Implemented |
| **164.312(b)** | Audit Controls | See AU family | — | Implemented |
| **164.312(c)** | Integrity | QLDB; SHA-256 hash chain on case files | Ledger digest | Implemented |
| **164.312(d)** | Person/Entity Authentication | See IA family | — | Implemented |
| **164.312(e)** | Transmission Security | TLS 1.3; mTLS internal | nginx + Linkerd config | Implemented |
| **164.314(a)** | Business Associate Contracts | BAA template (this repo `BAA-template.md`); BAA register in `compliance/baa-register.xlsx` | Template + register | Partial — first signature target Week 26 |
| **164.314(b)** | Group Health Plan Requirements | N/A — not a group health plan | — | N/A |
| **164.316(a)** | Policies & Procedures | All policies in `compliance/policies/`, versioned in git | Repo diff | Implemented |
| **164.316(b)** | Documentation | 6-yr retention via S3 Object Lock | S3 bucket config | Implemented |

---

## 4. SOC 2 Trust Service Criteria coverage

Source: AICPA TSP Section 100 (2017 TSC w/ 2022 revised points of focus).

### 4.1 Security (Common Criteria — required)

| TSC | Criterion | Mapped MedGuard360 control(s) | Evidence | Status |
|---|---|---|---|---|
| CC1.1–CC1.5 | Control Environment | Board charter; Code of Conduct; org chart; CISO reporting line | Board minutes; HR | Implemented |
| CC2.1–CC2.3 | Communication & Information | Status page; customer notification SOP; internal Slack `#sec-announce` | Comms log | Implemented |
| CC3.1–CC3.4 | Risk Assessment | RA-3, RA-5 | Risk register | Partial |
| CC4.1–CC4.2 | Monitoring Activities | Internal audit calendar; quarterly control self-assessment | Audit calendar | Partial |
| CC5.1–CC5.3 | Control Activities | All technical controls listed above | This doc | Implemented |
| CC6.1–CC6.8 | Logical & Physical Access | AC, IA, SC families | — | Implemented |
| CC7.1–CC7.5 | System Operations | SI, IR families | — | Partial |
| CC8.1 | Change Management | CM-3 | CAB tickets | Implemented |
| CC9.1–CC9.2 | Risk Mitigation (Vendor) | Vendor risk SOP; SIG-Lite for every BA subcontractor | Vendor register | Partial |

### 4.2 Availability (selected)

| TSC | Criterion | Implementation | Evidence | Status |
|---|---|---|---|---|
| A1.1 | Capacity | k8s HPA + AWS Auto Scaling; quarterly capacity review | Datadog dashboard | Implemented |
| A1.2 | Environmental Protections / Backup / Recovery | RDS PITR (35d); cross-region S3 replication; quarterly restore test | Restore test report | Implemented |
| A1.3 | Recovery Testing | Annual full DR failover | DR after-action | Implemented |

### 4.3 Processing Integrity (selected)

| TSC | Criterion | Implementation | Evidence | Status |
|---|---|---|---|---|
| PI1.1 | Definition of processing | API contract tests in `services/*/contract.test.ts`; data dictionary | Test reports | Implemented |
| PI1.4 | Output accuracy | Reconciliation jobs vs source-of-truth claim files; daily variance < 0.01% | Variance report | Partial |
| PI1.5 | Storage completeness | Idempotent ingestion w/ dedupe on `claim_id` | Ingestion logs | Implemented |

### 4.4 Confidentiality

| TSC | Criterion | Implementation | Evidence | Status |
|---|---|---|---|---|
| C1.1 | Identification of confidential info | Data classification policy; auto-tagging via Macie on S3 | Macie findings | Partial |
| C1.2 | Disposal | NIST 800-88 wipe; certificate of destruction | Wipe certs | Implemented |

### 4.5 Privacy

| TSC | Criterion | Implementation | Evidence | Status |
|---|---|---|---|---|
| P1.1–P8.1 | Notice, choice, collection, use, retention, disclosure, quality, monitoring | Privacy notice (NC & GA versions); DSAR portal at `privacy.medguard360.com`; retention schedule in `compliance/retention.md` | Notices; DSAR ticket queue | Partial |

---

## 5. HITRUST CSF v11 i1 — the 182 requirement statements

The i1 assessment is a **threat-adapted, moderate-baseline** evaluation with ~182 requirement statements (HITRUST Alliance, v11.4). Below is the i1 mapping grouped by the 14 CSF control categories. (`#` = approximate number of i1 requirements in that domain.)

| Domain # | Domain | i1 reqs (#) | Sample requirement statements | Primary MedGuard360 owner | Status |
|---|---|---|---|---|---|
| 00 | Information Security Management Program | 3 | 00.a Info Sec Mgmt Program established | CISO | Implemented |
| 01 | Access Control | 27 | 01.b User Registration; 01.c Privilege Mgmt; 01.j User Authentication for External Conns; 01.q User ID & Auth; 01.v Info Access Restriction | auth-service, IAM | Implemented |
| 02 | Human Resources Security | 9 | 02.a Roles & Responsibilities; 02.e Info Sec Awareness, Education & Training; 02.f Disciplinary Process | People Ops | Implemented |
| 03 | Risk Management | 4 | 03.a Risk Mgmt Program; 03.b Performing Risk Assessments; 03.c Risk Mitigation; 03.d Risk Evaluation | CISO | Partial |
| 04 | Security Policy | 2 | 04.a Info Sec Policy Document; 04.b Review of Info Sec Policy | CISO | Implemented |
| 05 | Organization of Information Security | 7 | 05.a Mgmt Commitment; 05.h External Parties; 05.k Addressing Sec in 3P Agreements | CISO, Legal | Partial |
| 06 | Compliance | 10 | 06.c Protection of Org Records; 06.d Data Protection & Privacy of Covered Info; 06.h Tech Compliance Checking | Legal, SecOps | Partial |
| 07 | Asset Management | 5 | 07.a Inventory of Assets; 07.c Acceptable Use; 07.d Classification Guidelines | IT Ops | Implemented |
| 08 | Physical & Environmental Security | 7 | 08.a Physical Security Perimeter; 08.b Physical Entry Controls; 08.l Secure Disposal | AWS (inherited) + HQ Facilities | Implemented |
| 09 | Communications & Operations Mgmt | 53 | 09.a Documented Operating Procedures; 09.j Controls Against Malicious Code; 09.m Network Controls; 09.s Info Exchange Policies; 09.aa Audit Logging; 09.ab Monitoring Sys Use; 09.ad Admin & Op Logs | Platform, SecOps | Partial |
| 10 | Information Systems Acquisition, Dev & Maintenance | 23 | 10.b Input Data Validation; 10.f Policy on Cryptographic Controls; 10.h Control of Operational Software; 10.k Change Control Procedures; 10.m Control of Tech Vulnerabilities | Engineering | Partial |
| 11 | Incident Management | 5 | 11.a Reporting Info Sec Events; 11.c Responsibilities & Procedures; 11.d Learning from Sec Incidents | SecOps | Implemented |
| 12 | Business Continuity Management | 6 | 12.a Including Info Sec in BCM Process; 12.c Developing & Implementing Continuity Plans; 12.d BC Planning Framework | SRE | Implemented |
| 13 | Privacy Practices | 21 | 13.a Privacy Notice; 13.d Consent; 13.j Use & Disclosure; 13.r Accounting of Disclosures | Privacy Office | Partial |
| — | **Total** | **~182** | | | **~62% Implemented, 35% Partial, 3% Not-yet (target 100% by Week 24)** |

> **Procurement note:** Full requirement-statement text is licensed by HITRUST and pulled from MyCSF. Each i1 requirement carries a single "Implemented" maturity score (i1 does not assess Policy/Procedure/Measured/Managed maturity — that is r2). See https://hitrustalliance.net/assessments-and-certifications/i1.

---

## 6. Gap summary (auditor briefing one-pager)

- **Open Critical gaps:** RA-3 SRA report (closes Week 4), SC-13 CloudHSM (Week 11), SI-4 Falco (Week 5).
- **Compensating controls in place** for all Partial items above; documented in `compliance/compensating-controls.md`.
- **First BAA-signable date target:** 2026-11-23 (Week 26 of plan).
- **External engagements:** Coalfire (HIPAA SRA), A-LIGN (SOC 2 Type II + HITRUST i1), Bishop Fox (pen test).

---

## 7. Authoritative references

- NIST SP 800-53 Rev 5 — https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
- NIST SP 800-53 r5 control catalog (XLSX) — https://csrc.nist.gov/files/pubs/sp/800/53/r5/upd1/final/docs/sp800-53r5-control-catalog.xlsx
- NIST SP 800-66 Rev 2 (HIPAA Security Rule Implementation Guide) — https://csrc.nist.gov/pubs/sp/800/66/r2/final
- HHS HIPAA Security Rule — https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html
- AICPA Trust Services Criteria — https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022
- HITRUST CSF v11 — https://hitrustalliance.net/hitrust-framework
- HITRUST i1 — https://hitrustalliance.net/assessments-and-certifications/i1
