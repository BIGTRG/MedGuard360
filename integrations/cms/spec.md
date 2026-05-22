# CMS Adapter — TypeScript Spec

> Implementation spec for `@medguard360/integrations-cms`. Companion to `./README.md`.
>
> Design rules:
> - **No secrets in code.** All credentials via env vars, surfaced through a `CmsConfig` object injected at module init.
> - **Idempotent, retryable.** Every call returns a `Result<T, CmsError>` (no thrown exceptions for expected failures — 404, 429, exclusion-not-found).
> - **Transport-agnostic.** Adapters take an injectable `HttpClient` so tests can stub.
> - **Audit-first.** Every call emits a `CmsAuditEvent` to the platform's audit bus (who, what NPI/TIN, when, response hash).
> - **No PHI in logs.** Beneficiary IDs, SSNs, DOBs are redacted in structured logs by default.

---

## 1. Environment variables

```bash
# NPPES NPI Registry — public, no key, just a configurable base URL for tests/mocks
CMS_NPI_REGISTRY_BASE_URL=https://npiregistry.cms.hhs.gov/api/
CMS_NPI_REGISTRY_VERSION=2.1

# Blue Button 2.0
CMS_BB_ENV=sandbox|production
CMS_BB_BASE_URL_SANDBOX=https://sandbox.bluebutton.cms.gov
CMS_BB_BASE_URL_PROD=https://api.bluebutton.cms.gov
CMS_BB_CLIENT_ID=...
CMS_BB_CLIENT_SECRET=...
CMS_BB_REDIRECT_URI=https://app.medguard360.example/oauth/cms-bb/callback
CMS_BB_SCOPES=patient/Patient.read patient/Coverage.read patient/ExplanationOfBenefit.read profile openid

# SAM.gov (GSA)
CMS_SAM_BASE_URL=https://api.sam.gov
CMS_SAM_API_KEY=...
CMS_SAM_TIER=public|sensitive   # gated behind System Account approval

# OIG LEIE — bulk file mirror (no API)
CMS_LEIE_DOWNLOAD_URL=https://oig.hhs.gov/exclusions/downloadables/UPDATED.csv
CMS_LEIE_LOCAL_MIRROR_PATH=/var/data/leie/UPDATED.csv
CMS_LEIE_REFRESH_CRON="0 6 16 * *"   # 06:00 UTC on the 16th — day after OIG monthly publish

# PECOS / data.cms.gov
CMS_DATA_GOV_BASE_URL=https://data.cms.gov/data-api/v1
CMS_PECOS_ORDER_REFERRING_DATASET_ID=...      # dataset GUID, pin per release
CMS_PECOS_FFS_ENROLLMENT_DATASET_ID=...

# Da Vinci PAS endpoint (per-payer — typically configured per tenant)
CMS_PAS_PAYER_ENDPOINTS_JSON=/etc/medguard/pas-endpoints.json
CMS_PAS_CLIENT_CERT_PATH=/etc/medguard/tls/pas-client.pem
CMS_PAS_CLIENT_KEY_PATH=/etc/medguard/tls/pas-client.key

# QPP (MIPS) — agreement-gated; usually deferred until phase 2
CMS_QPP_BASE_URL=https://qpp.cms.gov/api/submissions
CMS_QPP_JWT=...
```

---

## 2. Core types

```ts
export type NPI = string & { readonly __brand: 'NPI' };          // 10 digits
export type EIN = string & { readonly __brand: 'EIN' };          // 9 digits, no dash
export type SSN = string & { readonly __brand: 'SSN' };          // 9 digits, redacted in logs
export type BeneficiaryId = string & { readonly __brand: 'BeneficiaryId' };

export type Result<T, E = CmsError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export interface CmsError {
  code:
    | 'NOT_FOUND'
    | 'INVALID_INPUT'
    | 'RATE_LIMITED'
    | 'UPSTREAM_UNAVAILABLE'
    | 'AUTH_REQUIRED'
    | 'AUTH_FAILED'
    | 'CONFIG_MISSING'
    | 'PARSE_ERROR'
    | 'NOT_IMPLEMENTED';
  source: 'NPPES' | 'BLUEBUTTON' | 'SAM' | 'LEIE' | 'PECOS' | 'PAS' | 'QPP';
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
  cause?: unknown;
}

export interface CmsAuditEvent {
  timestamp: string;       // ISO-8601
  actor: string;           // user / service principal
  source: CmsError['source'];
  operation: string;       // e.g. "cmsPecosLookup"
  targetHash: string;      // sha256(query) — never raw PII
  responseStatus: number;
  durationMs: number;
}

export interface CmsConfig {
  npiRegistryBaseUrl: string;
  npiRegistryVersion: string;
  bb: {
    env: 'sandbox' | 'production';
    baseUrl: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string[];
  };
  sam: { baseUrl: string; apiKey: string; tier: 'public' | 'sensitive' };
  leie: { downloadUrl: string; localMirrorPath: string };
  dataCmsGov: {
    baseUrl: string;
    orderReferringDatasetId: string;
    ffsEnrollmentDatasetId: string;
  };
  pas: { endpointsByPayerId: Record<string, string>; clientCertPath: string; clientKeyPath: string };
  qpp?: { baseUrl: string; jwt: string };
}

export interface HttpClient {
  request<T>(req: {
    method: 'GET' | 'POST' | 'PUT';
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeoutMs?: number;
  }): Promise<{ status: number; headers: Record<string, string>; body: T }>;
}

export interface CmsAdapter {
  cmsNpiRegistryLookup(input: NpiLookupInput): Promise<Result<NpiRecord[]>>;
  cmsPecosLookup(npi: NPI): Promise<Result<PecosRecord>>;
  cmsLeieCheck(input: LeieCheckInput): Promise<Result<LeieMatch[]>>;
  cmsSamCheck(input: SamCheckInput): Promise<Result<SamMatch[]>>;
  cmsBlueButtonGetPatient(beneficiaryId: BeneficiaryId, accessToken: string): Promise<Result<FhirBundle>>;
  cmsBlueButtonGetEob(beneficiaryId: BeneficiaryId, accessToken: string, opts?: EobOpts): Promise<Result<FhirBundle>>;
  cmsPasSubmitPriorAuth(payload: PasSubmission): Promise<Result<PasResponse>>;
}
```

---

## 3. Function specs

### 3.1 `cmsNpiRegistryLookup`

```ts
export interface NpiLookupInput {
  npi?: NPI;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  taxonomyDescription?: string;
  city?: string;
  state?: string;        // 2-letter
  postalCode?: string;
  enumerationType?: 'NPI-1' | 'NPI-2';
  limit?: number;        // default 10, max 200
  skip?: number;
}

export interface NpiRecord {
  npi: NPI;
  enumerationType: 'NPI-1' | 'NPI-2';
  status: 'A' | 'D';
  enumerationDate: string;          // YYYY-MM-DD
  lastUpdated: string;
  deactivationDate?: string;
  deactivationReason?: string;
  basic: {
    firstName?: string; lastName?: string; middleName?: string; credential?: string;
    organizationName?: string; soleProprietor?: boolean;
  };
  addresses: Array<{
    purpose: 'LOCATION' | 'MAILING';
    address1: string; address2?: string; city: string; state: string; postalCode: string;
    countryCode: string; telephoneNumber?: string;
  }>;
  taxonomies: Array<{ code: string; desc: string; primary: boolean; state?: string; license?: string }>;
  identifiers: Array<{ code: string; desc: string; identifier: string; state?: string; issuer?: string }>;
  otherNames: Array<{ type: string; firstName?: string; lastName?: string; organizationName?: string }>;
  endpoints: Array<{ endpointType: string; endpoint: string; useDescription?: string }>;
}
```

- Calls `GET {CMS_NPI_REGISTRY_BASE_URL}?version={CMS_NPI_REGISTRY_VERSION}&...`.
- 200 with `result_count: 0` → `Result.ok([])`, **not** `NOT_FOUND`.
- 429 → `Result.err({ retryable: true, retryAfterMs })`. Caller should backoff.
- Validates NPI checksum (Luhn variant with prefix `80840`) before sending.

### 3.2 `cmsPecosLookup`

```ts
export interface PecosRecord {
  npi: NPI;
  isOrderingReferring: boolean;             // present in Order/Referring CSV
  lastName?: string; firstName?: string;
  medicareEnrollmentStatus?: 'ENROLLED' | 'NOT_ENROLLED' | 'UNKNOWN';
  specialty?: string;                       // from FFS Public Enrollment dataset
  enrollmentState?: string;
  source: 'ORDER_REFERRING' | 'FFS_PUBLIC_ENROLLMENT' | 'BOTH';
  retrievedAt: string;
}
```

- Implementation queries **both** `data.cms.gov` datasets (Order/Referring CSV mirror + FFS Public Enrollment) and merges.
- Recommended internal pattern: nightly bulk download to Postgres; `cmsPecosLookup` is a local query, not a live HTTP call. Adapter exposes the same signature either way.
- **Flag in README:** ownership/managing-employee/adverse-history data is **NOT** retrievable via this function — it requires CMS data-use agreement and internal PECOS access. Returns `NOT_IMPLEMENTED` if requested.

### 3.3 `cmsLeieCheck`

```ts
export interface LeieCheckInput {
  npi?: NPI;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  dob?: string;            // YYYY-MM-DD, optional, improves match confidence
  ssn?: SSN;               // accepted but used ONLY for hash comparison if OIG file has hashed SSN; never sent over the wire
  ein?: EIN;
}

export interface LeieMatch {
  matchConfidence: 'EXACT' | 'HIGH' | 'POSSIBLE';
  lastName?: string; firstName?: string; midName?: string;
  businessName?: string;
  general: string;                          // OIG "GENERAL" field (specialty/business type)
  specialty?: string;
  exclusionType: string;                    // e.g. "1128(a)(1)"
  exclusionDate: string;                    // YYYYMMDD
  reinstateDate?: string;
  waiverDate?: string; waiverState?: string;
  npi?: NPI;
  dob?: string;
  address?: string; city?: string; state?: string; zip?: string;
}
```

- **No live API.** Implementation reads from `CMS_LEIE_LOCAL_MIRROR_PATH`.
- A separate job (`refreshLeieMirror()`) downloads `CMS_LEIE_DOWNLOAD_URL` on schedule and atomically replaces the local file. Function returns `UPSTREAM_UNAVAILABLE` if mirror file is older than 45 days.
- Matching logic:
  1. NPI exact match → `EXACT`.
  2. (Last, First, DOB) exact → `HIGH`.
  3. (Last, First) exact, no DOB → `POSSIBLE`.
  4. Business name fuzzy (token-set ratio ≥ 95) + state match → `HIGH`; ≥ 85 → `POSSIBLE`.
- `POSSIBLE` matches must be routed to manual adjudication queue — never auto-deny.

### 3.4 `cmsSamCheck`

```ts
export interface SamCheckInput {
  ein?: EIN;
  uei?: string;                    // 12-char SAM UEI
  entityName?: string;
  individualName?: { first: string; last: string; middle?: string };
  exclusionTypeFilter?: ('Individual' | 'Firm' | 'Special Entity Designation')[];
}

export interface SamMatch {
  classification: 'Individual' | 'Firm' | 'Special Entity Designation';
  exclusionType: string;
  exclusionProgram: string;        // "Reciprocal", "Procurement", "Nonprocurement"
  excludingAgency: string;
  activeDate: string;
  terminationDate?: string;
  recordStatus: 'Active' | 'Inactive';
  uei?: string;
  cageCode?: string;
  name: string;
  address?: { line1: string; city: string; state: string; zip: string; country: string };
  crossReference?: string;
}
```

- Calls `GET {CMS_SAM_BASE_URL}/entity-information/v4/exclusions?api_key=...`.
- **Tier sensitivity:** EIN/SSN-based search requires `sensitive` tier — function returns `AUTH_REQUIRED` if `CMS_SAM_TIER=public` and caller supplies EIN/SSN.
- Rate-limit: caller-side token-bucket; SAM responds with `X-RateLimit-Remaining`.
- Optional entity-status companion: `cmsSamEntityStatus(uei)` → registration active/expired (separate v3 entities endpoint). Not required for 42 CFR 455 but useful for vendor onboarding.

### 3.5 `cmsBlueButtonGetPatient` / `cmsBlueButtonGetEob`

```ts
export interface FhirBundle { resourceType: 'Bundle'; type: string; entry?: Array<{ resource: unknown }>; link?: Array<{ relation: string; url: string }>; }

export interface EobOpts {
  type?: ('carrier' | 'inpatient' | 'outpatient' | 'hha' | 'hospice' | 'snf' | 'dme' | 'pde')[];
  serviceDateFrom?: string;
  serviceDateTo?: string;
  _count?: number;        // default 50
  pageUrl?: string;       // if set, fetch next page verbatim
}

export interface BlueButtonAuthUrlInput {
  state: string;          // CSRF token
  codeChallenge: string;  // PKCE S256
}

export interface BlueButtonTokenResponse {
  accessToken: string;
  refreshToken: string;
  patient: BeneficiaryId;  // CMS BFD patient ID, NOT MBI
  expiresAt: string;
  scope: string;
}
```

- `cmsBlueButtonGetPatient(beneficiaryId, accessToken)`:
  `GET {baseUrl}/v2/fhir/Patient/{beneficiaryId}` with `Authorization: Bearer {token}`.
- `cmsBlueButtonGetEob`:
  `GET {baseUrl}/v2/fhir/ExplanationOfBenefit?patient={beneficiaryId}&type={...}&_count=...`.
- Supporting helpers (not in the headline 6, but required to make BB usable):
  - `buildBlueButtonAuthorizeUrl(input: BlueButtonAuthUrlInput): string`
  - `exchangeBlueButtonCode(code, codeVerifier): Promise<Result<BlueButtonTokenResponse>>`
  - `refreshBlueButtonToken(refreshToken): Promise<Result<BlueButtonTokenResponse>>`
- 401 from BB → mark token revoked, surface `AUTH_FAILED` (not retryable until re-consent).
- All BB responses are PHI — adapter MUST tag the audit event with `phi: true` and never log resource bodies.

### 3.6 `cmsPasSubmitPriorAuth`

```ts
export interface PasSubmission {
  payerId: string;                     // lookup endpoint via CMS_PAS_PAYER_ENDPOINTS_JSON
  claimBundle: unknown;                // FHIR R4 Bundle of type 'collection' per Da Vinci PAS IG
                                       //  - Claim (use=preauthorization)
                                       //  - Patient, Coverage, Practitioner, Organization, Encounter, ServiceRequest, ...
                                       //  - Required Da Vinci PAS profiles
  correlationId: string;               // client-generated UUID for idempotency
  attachments?: Array<{ contentType: string; data: string; title?: string }>;
}

export interface PasResponse {
  claimResponseId: string;
  outcome: 'queued' | 'complete' | 'partial' | 'error';
  disposition?: string;                // human-readable
  preAuthRef?: string;                 // payer auth number when granted
  preAuthPeriod?: { start: string; end?: string };
  items: Array<{
    sequence: number;
    decision: 'approved' | 'denied' | 'pended' | 'modified';
    reasonCode?: string;
    reasonText?: string;
    adjudication?: unknown;
  }>;
  errors?: Array<{ code: string; severity: 'fatal' | 'error' | 'warning'; text: string; expression?: string }>;
  rawClaimResponse: unknown;           // full FHIR ClaimResponse for audit
}
```

- Transport: mutual TLS + OAuth2 client-credentials (UDAP recommended). Payer endpoint resolved per `payerId`.
- POST to `{payerEndpoint}/Claim/$submit` with `Content-Type: application/fhir+json`.
- **Validates against Da Vinci PAS profiles** before send (use `fhir.js` + IG package `hl7.fhir.us.davinci-pas`). Validation failures return `INVALID_INPUT` with FHIR `OperationOutcome` in `cause`.
- **Idempotency**: `correlationId` placed in `Bundle.identifier`. Server-side dedupe required because PAS is not idempotent at the spec level.
- Companion (Phase 2):
  - `cmsCrdRequest(hookContext)` — fires CDS Hooks `order-sign` / `order-select` against payer CRD service.
  - `cmsDtrLaunch(launchContext)` — returns SMART launch URL for DTR Questionnaire fulfillment.

---

## 4. Cross-cutting concerns

### 4.1 Retry policy

| Source | Retry on | Strategy |
|---|---|---|
| NPPES | 429, 502, 503, 504 | Exponential backoff, base 500ms, max 6 attempts, jitter |
| SAM | 429, 5xx | Honor `Retry-After`; otherwise exp backoff |
| Blue Button | 502, 503, 504 (never 401/403) | Exp backoff, max 3 |
| PAS | 5xx only | Max 2 retries; PA must not be silently duplicated |
| data.cms.gov | 5xx | Exp backoff, max 3 |
| LEIE / paper | n/a | File mirror — alert if stale > 45 days |

### 4.2 Caching

- NPI lookups: 24h TTL keyed by NPI. Invalidate on deactivation webhook (none exists from CMS — schedule weekly refresh).
- PECOS dataset mirror: refresh weekly (Order/Referring is weekly), quarterly (FFS enrollment).
- LEIE: monthly per OIG cadence; SAM exclusions snapshot daily for high-volume screening.
- Blue Button: **do not cache PHI** beyond the request scope unless a tenant-level consent record permits it.

### 4.3 Observability

- Each adapter call emits OpenTelemetry span `cms.<operation>` with attributes: `cms.source`, `cms.status_code`, `cms.retry_count`, `cms.from_cache`.
- Counters: `cms_requests_total{source,operation,status}`, `cms_match_results_total{source,confidence}`.

### 4.4 Testing

- Contract tests using recorded fixtures in `__fixtures__/cms/` (no live calls in CI).
- Sandbox suite (nightly): runs against NPPES (live), Blue Button sandbox, SAM.gov sandbox (`https://api-alpha.sam.gov` requires separate key).
- LEIE: tests use a 100-row synthetic CSV with crafted match/no-match cases including diacritics and hyphenated names.
- PAS: validate against published Da Vinci PAS examples; use HAPI FHIR validator in CI with the IG package.

### 4.5 Module surface

```ts
// packages/integrations-cms/src/index.ts
export { createCmsAdapter } from './adapter';
export type { CmsAdapter, CmsConfig, CmsError, CmsAuditEvent } from './types';

// Re-exported per-function for tree-shaking by call sites that only need one
export { cmsNpiRegistryLookup } from './npi';
export { cmsPecosLookup } from './pecos';
export { cmsLeieCheck, refreshLeieMirror } from './leie';
export { cmsSamCheck, cmsSamEntityStatus } from './sam';
export {
  cmsBlueButtonGetPatient,
  cmsBlueButtonGetEob,
  buildBlueButtonAuthorizeUrl,
  exchangeBlueButtonCode,
  refreshBlueButtonToken,
} from './bluebutton';
export { cmsPasSubmitPriorAuth, cmsCrdRequest, cmsDtrLaunch } from './pas';
```

### 4.6 What this adapter explicitly does NOT cover

- **CMS-855 enrollment submission** — no API exists; out of scope.
- **EQRS / CROWNWeb (CMS-2728/2746)** — contractor-only access.
- **QPP submission** — separate package `@medguard360/integrations-qpp` (gated by access agreement).
- **HPMS / MARx / MMR / Encounter Data Submission (EDS)** — Medicare Advantage plan-side systems; if MedGuard360 expands into the MA plan vertical, add a separate `@medguard360/integrations-cms-ma` package.
- **Da Vinci CRD/DTR server-side** (we are a client/sender). If MedGuard360 acts as the payer publishing CRD/DTR, that is a separate FHIR server build.
- **CAQH CORE certification testing harness** — handled by ops, not this adapter.

---

## 5. Open questions / verify before implementation

1. **[VERIFY]** Pinned IG versions for PAS/CRD/DTR/PDex matching the CMS-0057-F rule text in force at deploy time.
2. **[VERIFY]** Whether NC DHHS publishes a single FHIR endpoint or one-per-PHP for the Provider Access / Payer-to-Payer APIs by Jan 2027.
3. **[VERIFY]** SAM.gov v4 exclusions endpoint stability — GSA has versioned this multiple times.
4. **[VERIFY]** Blue Button 2.0 v2 (R4) remains the supported version (v1 DSTU2 has long been on deprecation watch).
5. **Confirm** UDAP vs SMART-on-FHIR Backend Services choice with each payer partner for PAS B2B auth.
6. **Confirm** retention policy for raw FHIR ClaimResponse payloads (audit need vs storage cost).
