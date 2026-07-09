# NCTracks Trading Partner Agreement (TPA) — Application Packet

**Prepared for:** Gainwell Technologies / NC DHHS EDI Support
**Submitter:** MedGuard360 LLC
**Contact:** Sainté Robinson, Founder — hello@medguard360.com
**Date:** 2026-07-09

---

## Cover letter (paste into email or print on MedGuard360 letterhead)

**To:** NCMMIS_EDI_Support@gdit.com
**Cc:** [TPA intake coordinator name once known]
**Subject:** Trading Partner Agreement Application — MedGuard360 LLC

Dear NCTracks Trading Partner Operations Team,

MedGuard360 LLC is a HIPAA-architected Medicaid platform pursuing a pilot deployment with NC DHHS Division of Health Benefits beginning Q3 2026. We respectfully request initiation of the Trading Partner Agreement onboarding process so we may submit and receive HIPAA EDI transactions on behalf of contracted NC Medicaid providers.

**About MedGuard360 LLC**
- Delaware LLC, EIN [pending — provided at execution]
- Primary office: [TBD — North Carolina]
- HIPAA Security Risk Assessment: in active observation with Coalfire (issuance Nov 2026)
- SOC 2 Type II: in active observation with A-LIGN (issuance Nov 2026)
- HITRUST CSF i1: parallel track with A-LIGN
- Business Associate Agreement template: 45 CFR 164.504(e)-compliant, NC-specific addenda included

**Scope of trading-partner activity sought**
- 270/271 — real-time eligibility (production submitter)
- 837P — professional claim submission (batch via SFTP or Connect:Direct)
- 837I — institutional claim submission (Phase 2)
- 276/277 — claim status inquiry (real-time)
- 835 — remittance advice (batch retrieval)
- 999 / TA1 — acknowledgments

**Vendor relationship**
We are filing as both a clearinghouse and a software vendor. Contracted providers using MedGuard360 will be enrolled as our trading partner sub-IDs under our master TPA, with their own NPIs as billing entities.

**Onboarding readiness**
We have implemented the NCTracks adapter (`integrations/nctracks/`, 50 unit tests) and wired eligibility-service and claims-service to it in stub mode. We are prepared to begin Edifecs Ramp Management testing immediately upon receipt of TPID and SUBMITTER_ID.

We have reviewed:
- NCTracks Trading Partner Connectivity Guide (CG_TPConn.pdf)
- 270/271 Companion Guide v7
- 835 Companion Guide v3.2021
- LME/MCO Encounter Data Submission Manual v3
- All public 5010 Provider Specific Companion Guides

**Requested next steps**
1. Onboarding intake call with your team (we can meet within 5 business days)
2. Sandbox endpoint URLs + test SUBMITTER_ID
3. Production TLS client certificate provisioning instructions
4. IP allowlist process (we will provide static IPs from our AWS GovCloud production region once provisioned)

Thank you for your time. We look forward to a long partnership in service of NC Medicaid members.

Sincerely,

Sainté Robinson
Founder, MedGuard360 LLC
hello@medguard360.com
[phone]

---

## Attachment A — Technical readiness checklist

| Item | Status | Evidence |
|---|---|---|
| Static IP addresses ready for allowlist | ⬜ Pending GovCloud migration | Will provide by [date] |
| TLS client certificate generation capability | ✅ | Standard X.509 / RSA-4096 |
| X12 5010 envelope generator + adapter | ✅ Implemented | `integrations/nctracks/` (50 unit tests); wired to eligibility + claims services |
| Edifecs Ramp Management access | ⬜ Pending | Awaiting your invitation |
| SFTP client (Connect:Direct or libssh2 equivalent) | ✅ | Standard tooling |
| HIPAA Security Risk Assessment | 🟡 In progress | Coalfire engagement letter; issuance Nov 2026 |
| SOC 2 Type II | 🟡 In active observation | A-LIGN engagement letter; issuance Nov 2026 |
| HITRUST CSF i1 | 🟡 Parallel track | A-LIGN |
| 24x7 NOC contact | ✅ | hello@medguard360.com + on-call rotation |
| Breach notification process per 45 CFR 164.410 | ✅ | Documented in our BAA template |

## Attachment B — Authorized representatives

| Role | Name | Email | Phone |
|---|---|---|---|
| Primary technical contact | Sainté Robinson | hello@medguard360.com | [phone] |
| Backup technical contact | [TBD] | [TBD] | [TBD] |
| Security / breach notification | Sainté Robinson | security@medguard360.com | [phone] |
| Legal / contracts | [Outside counsel TBD] | [email] | [phone] |
| Authorized signatory (for TPA) | Sainté Robinson | hello@medguard360.com | [phone] |

## Attachment C — System security plan summary

Full SSP available upon NDA. Highlights:

- **Encryption at rest**: AES-256 (PostgreSQL TDE + MinIO SSE-S3)
- **Encryption in transit**: TLS 1.3 (no TLS ≤ 1.1; HSTS enforced)
- **Authentication**: Clerk (members) / NCID (providers) / hardware MFA (internal)
- **Authorization**: RBAC + PostgreSQL Row-Level Security on every PHI table
- **Audit log**: append-only `audit_log_events` table + Kafka `audit.event` topic (infinite retention)
- **Network segmentation**: separate VPC subnets for PHI tier / app tier / management tier
- **Vulnerability management**: monthly Nessus scans + quarterly pen test (Bishop Fox)
- **Backups**: AES-256 encrypted, daily incremental, weekly full, 7-year retention
- **DR**: warm standby in AWS GovCloud us-gov-west-1; 4-hour RTO, 1-hour RPO

## Attachment D — Required documents we'll submit upon receipt of intake form

- [ ] Completed NCTracks Trading Partner Application (paper or EDIDC.txt)
- [ ] Notarized Trading Partner Agreement signature page
- [ ] Articles of Organization (Delaware LLC) + Certificate of Good Standing
- [ ] W-9
- [ ] EIN letter from IRS
- [ ] Cyber liability insurance certificate (Marsh — pending; binding by [date])
- [ ] Executed BAA (we use our template at `compliance/BAA-template.md` as starting point)
- [ ] Network diagram showing PHI flow (AWS GovCloud architecture)
- [ ] References — minimum 2 healthcare entities; we'll provide pilot LOIs

## Attachment E — Roll-out timeline

| Week | Activity |
|---|---|
| 0 | Submit this packet + cover letter |
| 1-2 | Intake call, receive TPID + SUBMITTER_ID, sandbox URLs |
| 3-4 | Edifecs Ramp 270/271 + 837P + 835 testing |
| 5 | Certification test cycle |
| 6 | Production certification |
| 7 | Live 270/271 (eligibility) with 1 pilot provider |
| 8-12 | Live 837P + 835 with 3-5 pilot providers |
| 13+ | Scale to broader NC pilot population |

---

*This packet is intentionally exhaustive. NCTracks intake will narrow it to whatever forms they actually need.*
