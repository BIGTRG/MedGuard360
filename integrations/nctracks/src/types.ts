/**
 * NCTracks adapter — type definitions.
 *
 * Source of truth: integrations/nctracks/spec.md §2.
 * Implements the surface required for NC Medicaid MMIS integration
 * (eligibility 270/271, claims 837P/I/D, claim status 276/277, remittance 835).
 */

export type NctracksEnv = 'prod' | 'test';

export type NctracksMode = 'stub' | 'soap' | 'sftp';

/** Loaded once at boot from env vars. */
export interface NctracksConfig {
  mode: NctracksMode;
  env: NctracksEnv;
  realtime: {
    eligibilityUrl: string;
    claimStatusUrl: string;
    timeoutMs: number;
  };
  batch: {
    sftp?: {
      host: string;
      port: number;
      user: string;
      keyPem: string;
      passphrase?: string;
      dirs: {
        in837: string;
        out835: string;
        out999: string;
        out277ca: string;
      };
    };
    connectDirect?: {
      localNode: string;
      remoteNode: string;
      securePlusCert?: string;
    };
  };
  identifiers: {
    tpid: string;
    submitterId: string;
    submitterQualifier: string;
    receiverId: string;
    receiverQualifier: string;
    billingNpi: string;
    billingTaxonomy: string;
    atypicalId?: string;
    usageIndicator: 'P' | 'T';
  };
  auth: {
    clientCertPem?: string;
    clientKeyPem?: string;
    caBundlePem?: string;
    httpBasic?: { user: string; pass: string };
  };
}

// ─── Eligibility (270/271) ────────────────────────────────────────────────

export interface EligibilityRequest {
  subscriberId: string;             // NC Medicaid Recipient ID (MID)
  dateOfService: string;            // YYYY-MM-DD
  serviceTypeCodes?: string[];      // X12 service type, e.g. ['30']
  providerNpi?: string;
  providerTaxonomy?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;                     // YYYY-MM-DD; for AAA-rejection fallback matching
  traceId?: string;                 // becomes TRN02 on the 270
}

export type EligibilityStatus = 'active' | 'inactive' | 'error';

export interface EligibilityResponse {
  status: EligibilityStatus;
  benefitPlan?: string;             // e.g. 'MEDICAID', 'HEALTH_CHOICE', 'TAILORED_PLAN:TRILLIUM'
  managedCareEnrollment?: {
    planName: string;
    planId: string;
    effectiveDate: string;
    termDate?: string;
    carveOut?: 'behavioral_health' | 'dental' | 'none';
  };
  coverageDetails: Array<{
    serviceTypeCode: string;
    coverageLevel: string;
    copay?: number;
    deductible?: number;
    inNetwork: boolean;
  }>;
  /** Populated when 271 returns an AAA rejection. */
  aaaRejection?: { code: string; followUpAction: string };
  /** Raw X12 271 payload, for audit / debugging. Stub mode returns a synthetic example. */
  raw271: string;
  traceId: string;
}

// ─── Claim submission (837P/I/D) ──────────────────────────────────────────

export type ClaimType = 'professional' | 'institutional' | 'dental';

export interface ClaimSubmitRequest {
  claimType: ClaimType;
  patientControlNumber: string;     // CLM01
  totalCharge: number;
  subscriberId: string;
  serviceDateFrom: string;
  serviceDateTo: string;
  billingProvider?: { npi: string; taxonomy: string; atypicalId?: string };
  renderingProvider?: { npi: string; taxonomy: string };
  diagnoses: Array<{ code: string; system: 'ICD10CM' | 'ICD10PCS' }>;
  lines: Array<{
    procedureCode: string;          // CPT/HCPCS/CDT
    modifiers?: string[];
    units: number;
    charge: number;
    serviceDate: string;
    placeOfService?: string;        // POS code, 2-digit
    diagnosisPointers: number[];
    ndc?: { code: string; qty: number; unitOfMeasure: string };
  }>;
  priorAuthNumber?: string;         // REF*G1
  attachments?: Array<{ controlNumber: string; transmissionCode: string }>;
}

export interface ClaimSubmitResult {
  interchangeControlNumber: string; // ISA13 we generated
  groupControlNumber: string;       // GS06
  transactionSetControlNumber: string; // ST02
  fileName: string;                 // what we dropped on SFTP / would have dropped
  submittedAt: string;              // ISO timestamp
  /** Populated asynchronously by pollAcks(). */
  ack999?: Ack999;
  /** Populated asynchronously by pollAcks(). */
  ack277CA?: Ack277CA;
}

export interface Ack999 {
  accepted: boolean;
  errors: Array<{ segment: string; element?: string; code: string; description: string }>;
  raw: string;
}

export interface Ack277CA {
  status: 'accepted' | 'rejected' | 'partial';
  perClaim: Array<{
    patientControlNumber: string;
    status: string;
    categoryCode: string;
    statusCode: string;
    entityCode?: string;
  }>;
  raw: string;
}

// ─── Claim status (276/277) ───────────────────────────────────────────────

export interface ClaimStatusRequest {
  patientControlNumber: string;
  subscriberId: string;
  payerClaimControlNumber?: string; // ICN/TCN if known
  serviceDateFrom?: string;
  serviceDateTo?: string;
  providerNpi?: string;
}

export type ClaimStatus = 'pending' | 'paid' | 'denied' | 'in_process' | 'unknown';

export interface ClaimStatusResponse {
  status: ClaimStatus;
  categoryCode: string;             // X12 health care claim status category
  statusCode: string;               // X12 health care claim status
  payerClaimControlNumber?: string; // NCTracks TCN
  paidAmount?: number;
  checkNumber?: string;
  paymentDate?: string;
  raw277: string;
}

// ─── Remittance (835) ─────────────────────────────────────────────────────

export interface RemittanceQuery {
  /** YYYY-MM-DD; default = last poll watermark. */
  since?: string;
  checkNumber?: string;
  payerClaimControlNumber?: string;
}

export interface RemittanceAdjustment {
  groupCode: 'CO' | 'PR' | 'OA' | 'PI';
  reasonCode: string;               // CARC
  amount: number;
  /** NC-specific EOB code, when present in the RA crosswalk. */
  ncEobCode?: string;
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
    payerClaimControlNumber: string; // TCN
    chargedAmount: number;
    paidAmount: number;
    claimStatusCode: string;         // CLP02
    adjustments: RemittanceAdjustment[];
    remarks: Array<{ code: string; description?: string }>; // RARC
    serviceLines: Array<{
      procedureCode: string;
      modifiers?: string[];
      chargedAmount: number;
      paidAmount: number;
      adjustments: Array<{ groupCode: string; reasonCode: string; amount: number }>;
    }>;
  }>;
  raw835: string;
}

// ─── Adapter interface ────────────────────────────────────────────────────

export interface NctracksAdapter {
  /** Real-time 270/271 over CAQH CORE SOAP. */
  checkEligibility(req: EligibilityRequest): Promise<EligibilityResponse>;

  /**
   * Build 837, push via SFTP (or Connect:Direct), return control numbers + filename.
   * Acks (999, 277CA) populate asynchronously and arrive via pollAcks().
   */
  submitClaim(req: ClaimSubmitRequest): Promise<ClaimSubmitResult>;

  /** Real-time 276/277 over CAQH CORE SOAP. */
  getClaimStatus(req: ClaimStatusRequest): Promise<ClaimStatusResponse>;

  /**
   * Pull new 835 files from outbound dir, parse, return list.
   * Idempotent via filename watermark; safe to call on schedule.
   */
  retrieveRemittances(q?: RemittanceQuery): Promise<RemittanceFile[]>;

  /** Pull and parse 999 + 277CA for previously submitted claims. */
  pollAcks(since?: string): Promise<{ ack999: Ack999[]; ack277CA: Ack277CA[] }>;

  /** Health check: TLS handshake to SOAP host + SFTP banner reach. */
  healthCheck(): Promise<{ realtimeOk: boolean; sftpOk: boolean; cdOk?: boolean }>;

  /** Identifies which transport mode is active. */
  readonly mode: NctracksMode;
}
