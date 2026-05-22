# NCTracks Adapter Spec (MedGuard360)

Stub spec for a code generator. Target: a TypeScript adapter that wraps NCTracks X12 5010 transactions over CAQH CORE SOAP (real-time) and SFTP/Connect:Direct (batch). All identifiers and endpoints are injected via env vars — **no hardcoding**. See `./README.md` for the underlying protocol details and citations.

---

## 1. Environment variables

All are required unless marked optional. Names follow `NCTRACKS_<DOMAIN>_<FIELD>` and are read once at boot into a typed `NctracksConfig`.

### Endpoints
| Var | Example | Notes |
|---|---|---|
| `NCTRACKS_ENV` | `prod` \| `test` | Selects endpoint set, must match cert/SFTP key issued by GDIT |
| `NCTRACKS_REALTIME_ELIGIBILITY_URL` | `https://edi.nctracks.nc.gov/CORE/Eligibility` | SOAP 270/271 (CAQH CORE 2.2.0) |
| `NCTRACKS_REALTIME_CLAIMSTATUS_URL` | `https://edi.nctracks.nc.gov/CORE/ClaimStatus` | SOAP 276/277 |
| `NCTRACKS_BATCH_SFTP_HOST` | `sftp.nctracks.nc.gov` | |
| `NCTRACKS_BATCH_SFTP_PORT` | `22` | |
| `NCTRACKS_BATCH_SFTP_USER` | `MG360_TP12345` | Assigned with TSN |
| `NCTRACKS_BATCH_SFTP_INBOUND_DIR` | `/inbound/837` | Where we drop claims |
| `NCTRACKS_BATCH_SFTP_OUTBOUND_835_DIR` | `/outbound/835` | |
| `NCTRACKS_BATCH_SFTP_OUTBOUND_999_DIR` | `/outbound/999` | |
| `NCTRACKS_BATCH_SFTP_OUTBOUND_277CA_DIR` | `/outbound/277CA` | |
| `NCTRACKS_CD_NODE_LOCAL` | `MG360.PROD` | Connect:Direct, optional alt to SFTP |
| `NCTRACKS_CD_NODE_REMOTE` | `NCTRACKS.PROD` | |
| `NCTRACKS_RAMP_URL` | `https://nctracks.rampmanagement.com` | Edifecs Ramp — testing only |

### Identifiers (X12 envelope)
| Var | X12 location | Notes |
|---|---|---|
| `NCTRACKS_TPID` | logical | Trading Partner ID assigned by GDIT |
| `NCTRACKS_SUBMITTER_ID` | ISA06, GS02 | The **TSN** (Transaction Supplier Number) |
| `NCTRACKS_SUBMITTER_QUALIFIER` | ISA05 | typically `ZZ` |
| `NCTRACKS_RECEIVER_ID` | ISA08, GS03 | NCTracks-assigned receiver, e.g. `NCXIX` |
| `NCTRACKS_RECEIVER_QUALIFIER` | ISA07 | typically `ZZ` |
| `NCTRACKS_BILLING_NPI` | 2010AA NM109 | Default billing provider NPI (override per-claim) |
| `NCTRACKS_BILLING_TAXONOMY` | 2000A PRV03 | Default billing taxonomy |
| `NCTRACKS_ATYPICAL_ID` | REF*EI | Optional, for atypical providers |
| `NCTRACKS_USAGE_INDICATOR` | ISA15 | `P` for prod, `T` for test |

### Credentials / secrets (load from secret manager, never `.env` in repo)
| Var | Notes |
|---|---|
| `NCTRACKS_CLIENT_CERT` | PEM, client X.509 for mutual TLS on SOAP endpoints |
| `NCTRACKS_CLIENT_KEY` | PEM private key for above |
| `NCTRACKS_CA_BUNDLE` | Optional pinned CA chain for GDIT gateway |
| `NCTRACKS_HTTP_BASIC_USER` | CAQH CORE envelope HTTP Basic |
| `NCTRACKS_HTTP_BASIC_PASS` | |
| `NCTRACKS_SFTP_PRIVATE_KEY` | OpenSSH private key for SFTP |
| `NCTRACKS_SFTP_KEY_PASSPHRASE` | Optional |
| `NCTRACKS_CD_SECUREPLUS_CERT` | Connect:Direct Secure+ cert, optional |

### Operational
| Var | Default | Notes |
|---|---|---|
| `NCTRACKS_REALTIME_TIMEOUT_MS` | `30000` | CAQH CORE max real-time = 60s |
| `NCTRACKS_BATCH_POLL_INTERVAL_SEC` | `300` | Poll outbound dirs |
| `NCTRACKS_RETRY_MAX` | `3` | |
| `NCTRACKS_IP_ALLOWLIST_NOTE` | free text | Reminder: our egress IPs must be registered with GDIT |
| `NCTRACKS_EDI_SUPPORT_EMAIL` | `NCMMIS_EDI_Support@gdit.com` | for runbook references |

---

## 2. TypeScript interfaces

```ts
// src/integrations/nctracks/types.ts

export type NctracksEnv = "prod" | "test";

export interface NctracksConfig {
  env: NctracksEnv;
  realtime: { eligibilityUrl: string; claimStatusUrl: string; timeoutMs: number };
  batch: {
    sftp?: { host: string; port: number; user: string; keyPem: string; passphrase?: string;
             dirs: { in837: string; out835: string; out999: string; out277ca: string } };
    connectDirect?: { localNode: string; remoteNode: string; securePlusCert?: string };
  };
  identifiers: {
    tpid: string; submitterId: string; submitterQualifier: string;
    receiverId: string; receiverQualifier: string;
    billingNpi: string; billingTaxonomy: string; atypicalId?: string;
    usageIndicator: "P" | "T";
  };
  auth: { clientCertPem: string; clientKeyPem: string; caBundlePem?: string;
          httpBasic: { user: string; pass: string } };
}

// ---- Eligibility (270/271) ----------------------------------------------
export interface EligibilityRequest {
  subscriberId: string;               // NC Medicaid Recipient ID (MID)
  dateOfService: string;              // YYYY-MM-DD
  serviceTypeCodes?: string[];        // X12 service type, e.g. ["30"]
  providerNpi?: string;               // overrides config default
  providerTaxonomy?: string;
  firstName?: string; lastName?: string; dob?: string; // for AAA matching fallback
  traceId?: string;                   // becomes TRN02
}

export interface EligibilityResponse {
  status: "active" | "inactive" | "error";
  benefitPlan?: string;               // e.g. "MEDICAID", "HEALTH CHOICE", "TAILORED_PLAN:TRILLIUM"
  managedCareEnrollment?: {
    planName: string;                 // "Healthy Blue", "Tailored: Vaya Total Care", etc.
    planId: string;                   // PHP id
    effectiveDate: string; termDate?: string;
    carveOut?: "behavioral_health" | "dental" | "none";
  };
  coverageDetails: Array<{
    serviceTypeCode: string; coverageLevel: string;
    copay?: number; deductible?: number;
    inNetwork: boolean;
  }>;
  aaaRejection?: { code: string; followUpAction: string }; // 271 AAA segment
  raw271: string;                     // the X12 payload for audit
  traceId: string;
}

// ---- Claim submission (837P/I/D) ----------------------------------------
export type ClaimType = "professional" | "institutional" | "dental";

export interface ClaimSubmitRequest {
  claimType: ClaimType;
  patientControlNumber: string;       // CLM01
  totalCharge: number;
  subscriberId: string;
  serviceDateFrom: string; serviceDateTo: string;
  billingProvider?: { npi: string; taxonomy: string; atypicalId?: string };
  renderingProvider?: { npi: string; taxonomy: string };
  diagnoses: Array<{ code: string; system: "ICD10CM" | "ICD10PCS" }>;
  lines: Array<{
    procedureCode: string;            // CPT/HCPCS/CDT
    modifiers?: string[];
    units: number; charge: number;
    serviceDate: string;
    placeOfService?: string;          // POS code, 2-digit
    diagnosisPointers: number[];
    ndc?: { code: string; qty: number; unitOfMeasure: string };
  }>;
  priorAuthNumber?: string;           // REF*G1
  attachments?: Array<{ controlNumber: string; transmissionCode: string }>;
}

export interface ClaimSubmitResult {
  interchangeControlNumber: string;   // ISA13 we generated
  groupControlNumber: string;         // GS06
  transactionSetControlNumber: string;// ST02
  fileName: string;                   // what we dropped on SFTP
  submittedAt: string;
  ack999?: Ack999;                    // populated when 999 arrives
  ack277CA?: Ack277CA;                // populated when 277CA arrives
}

export interface Ack999 {
  accepted: boolean;
  errors: Array<{ segment: string; element?: string; code: string; description: string }>;
  raw: string;
}

export interface Ack277CA {
  status: "accepted" | "rejected" | "partial";
  perClaim: Array<{ patientControlNumber: string; status: string;
                    categoryCode: string; statusCode: string; entityCode?: string }>;
  raw: string;
}

// ---- Claim status (276/277) ---------------------------------------------
export interface ClaimStatusRequest {
  patientControlNumber: string;
  subscriberId: string;
  payerClaimControlNumber?: string;   // ICN/TCN if known
  serviceDateFrom?: string; serviceDateTo?: string;
  providerNpi?: string;
}

export interface ClaimStatusResponse {
  status: "pending" | "paid" | "denied" | "in_process" | "unknown";
  categoryCode: string;               // X12 health care claim status category
  statusCode: string;                 // X12 health care claim status
  payerClaimControlNumber?: string;   // NCTracks TCN
  paidAmount?: number; checkNumber?: string; paymentDate?: string;
  raw277: string;
}

// ---- Remittance (835) ---------------------------------------------------
export interface RemittanceQuery {
  since?: string;                     // YYYY-MM-DD; default = last poll watermark
  checkNumber?: string;
  payerClaimControlNumber?: string;
}

export interface RemittanceFile {
  fileName: string;
  receivedAt: string;
  checkOrEftNumber: string;
  paymentDate: string;
  payeeNpi: string;
  totalPaid: number;
  claims: Array<{
    patientControlNumber: string;
    payerClaimControlNumber: string;   // TCN
    chargedAmount: number; paidAmount: number;
    claimStatusCode: string;           // CLP02
    adjustments: Array<{
      groupCode: "CO" | "PR" | "OA" | "PI";
      reasonCode: string;              // CARC
      amount: number;
      ncEobCode?: string;              // NC-specific EOB from RA crosswalk
    }>;
    remarks: Array<{ code: string; description?: string }>; // RARC
    serviceLines: Array<{
      procedureCode: string; modifiers?: string[];
      chargedAmount: number; paidAmount: number;
      adjustments: Array<{ groupCode: string; reasonCode: string; amount: number }>;
    }>;
  }>;
  raw835: string;
}

// ---- Adapter interface --------------------------------------------------
export interface NctracksAdapter {
  /** Real-time 270/271 over CAQH CORE SOAP. */
  checkEligibility(req: EligibilityRequest): Promise<EligibilityResponse>;

  /** Build 837, push via SFTP (or CD), return control numbers + filename.
   *  Acks populate asynchronously via pollAcks(). */
  submitClaim(req: ClaimSubmitRequest): Promise<ClaimSubmitResult>;

  /** Real-time 276/277 over CAQH CORE SOAP. */
  getClaimStatus(req: ClaimStatusRequest): Promise<ClaimStatusResponse>;

  /** Pull new 835 files from outbound dir, parse, return list. Idempotent
   *  via filename watermark; safe to call on schedule. */
  retrieveRemittances(q?: RemittanceQuery): Promise<RemittanceFile[]>;

  /** Pull and parse 999 + 277CA for previously submitted claims. */
  pollAcks(since?: string): Promise<{ ack999: Ack999[]; ack277CA: Ack277CA[] }>;

  /** Health check: TLS handshake to SOAP host + SFTP banner. */
  healthCheck(): Promise<{ realtimeOk: boolean; sftpOk: boolean; cdOk?: boolean }>;
}
```

---

## 3. Module layout (target)

```
integrations/nctracks/
  README.md                   # protocol reference (this dir)
  spec.md                     # this file
  src/
    index.ts                  # exports NctracksAdapter factory
    config.ts                 # loadConfig() from env, with zod validation
    types.ts                  # interfaces above
    x12/
      builder.ts              # build270, build276, build837 (P/I/D)
      parser.ts               # parse271, parse277, parse835, parse999, parse277ca
      envelope.ts             # ISA/GS/ST framing helpers
    transport/
      coreSoap.ts             # CAQH CORE 2.2.0 SOAP client (mTLS)
      sftp.ts                 # ssh2-sftp-client wrapper
      connectDirect.ts        # optional NDM bridge
    services/
      eligibility.ts          # checkEligibility
      claims.ts               # submitClaim
      claimStatus.ts          # getClaimStatus
      remittance.ts           # retrieveRemittances + watermark store
      acks.ts                 # pollAcks
    util/
      controlNumbers.ts       # monotonic ICN/GCN generator (persistent)
      taxonomy.ts             # NC taxonomy validation
      eobCrosswalk.ts         # NC EOB -> CARC/RARC
```

---

## 4. Non-functional requirements

- **Idempotency:** outbound 837 filenames embed our ICN; replaying the same logical claim must not double-submit (dedupe by `patientControlNumber + claimType + serviceDateFrom + totalCharge`).
- **Audit:** persist every raw X12 (in + out) with hash + timestamp for 10 years (HIPAA + NC retention).
- **PHI handling:** scrub logs of subscriber IDs, DOBs, names by default; full payload only in encrypted audit store.
- **Cert rotation:** config supports hot-reload of `NCTRACKS_CLIENT_CERT` so we can rotate without restart.
- **Observability:** emit metrics `nctracks.realtime.latency_ms{txn}`, `nctracks.batch.files_in`, `nctracks.batch.files_out`, `nctracks.ack999.reject_rate`.
- **Failure modes to surface:**
  - 999 reject (envelope-level): retry with fix, never resubmit blindly.
  - 277CA reject per-claim: route to a remediation queue.
  - 271 AAA rejection codes 42/72/75: invalid recipient → halt downstream.
  - Tailored Plan member detected on a 271 → reroute claim to the PHP adapter, do **not** submit FFS to NCTracks.

---

## 5. Test plan stub

1. Unit-test X12 builders against fixtures from the NCTracks 270/271, 837, 835 Companion Guides.
2. Contract tests in Ramp Management for each transaction type (gate to prod).
3. Integration tests against NCTracks test environment using sanitized recipient IDs supplied by GDIT.
4. Chaos: cert expiry, SFTP host swap, 999 reject loop.

---

References: see `./README.md`.
