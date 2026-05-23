/**
 * NCTracks adapter — stub implementation.
 *
 * Deterministic, in-memory adapter for development, demo, and tests. Honors
 * the full `NctracksAdapter` contract so consumers (eligibility-service,
 * claims-service, prior-auth-service) can DI-inject this today and swap to
 * the real SOAP/SFTP transport later without touching call sites.
 *
 * Determinism rules:
 *  - Eligibility: subscriberId modulo 10 picks an outcome
 *      0..6 → active; 7,8 → managed-care (Healthy Blue / Tailored: Trillium); 9 → inactive
 *      "999" suffix → AAA rejection (invalid recipient)
 *  - Claim submission: monotonic ICN per process; ack999 + ack277CA returned
 *    inline (real mode would populate via pollAcks).
 *  - Claim status: subscriberId modulo 4 → pending | paid | denied | in_process.
 *  - Remittances: returns an empty array unless `since` is within ~14 days,
 *    in which case returns a single synthetic 835 with 2 paid claims.
 *  - healthCheck: always returns realtimeOk:true, sftpOk:true.
 *
 * Logs (when `verbose` is true) include the full would-be request so it's
 * obvious what would have been sent in real mode.
 */

import type {
  Ack277CA,
  Ack999,
  ClaimStatusRequest,
  ClaimStatusResponse,
  ClaimSubmitRequest,
  ClaimSubmitResult,
  EligibilityRequest,
  EligibilityResponse,
  NctracksAdapter,
  NctracksConfig,
  NctracksMode,
  RemittanceFile,
  RemittanceQuery,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — deterministic ID + envelope generation
// ─────────────────────────────────────────────────────────────────────────────

/** Monotonic ICN within a process. Real-mode persists this to Postgres. */
class ControlNumberSource {
  private counter = 1;
  next(prefix: string): string {
    const n = this.counter++;
    return `${prefix}${String(n).padStart(9, '0')}`;
  }
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function isoNow(): string {
  return new Date().toISOString();
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(d: string): number {
  const t = Date.parse(d);
  if (Number.isNaN(t)) return Number.MAX_SAFE_INTEGER;
  return Math.floor((Date.now() - t) / 86_400_000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic X12 payload builders (just enough to look real for audit/logging)
// ─────────────────────────────────────────────────────────────────────────────

function fakeRaw271(req: EligibilityRequest, status: 'active' | 'inactive', plan?: string): string {
  const trn = req.traceId ?? 'STUB-TRACE';
  const eb = status === 'active'
    ? `EB*1*IND*30**${plan ?? 'MEDICAID'}~`
    : `EB*6~`;
  return [
    `ISA*00*          *00*          *ZZ*NCXIX          *ZZ*STUB-TSN       *${todayYmd().replace(/-/g, '').slice(2)}*1200*^*00501*000000001*0*T*:~`,
    `GS*HB*NCXIX*STUB-TSN*${todayYmd().replace(/-/g, '')}*1200*1*X*005010X279A1~`,
    `ST*271*0001*005010X279A1~`,
    `BHT*0022*11*${trn}*${todayYmd().replace(/-/g, '')}*120000~`,
    `HL*1**20*1~`,
    `NM1*PR*2*NC MEDICAID*****PI*NCXIX~`,
    `HL*2*1*21*1~`,
    `NM1*1P*1*PROVIDER*STUB****XX*${req.providerNpi ?? '0000000000'}~`,
    `HL*3*2*22*0~`,
    `NM1*IL*1*${req.lastName ?? 'DOE'}*${req.firstName ?? 'JOHN'}****MI*${req.subscriberId}~`,
    eb,
    `SE*10*0001~`,
    `GE*1*1~`,
    `IEA*1*000000001~`,
  ].join('');
}

function fake999(accepted: boolean): string {
  return `ISA*00* *00* *ZZ*NCXIX*ZZ*STUB-TSN*..*999*ACK~AK1*HC*1~AK9*${accepted ? 'A' : 'R'}*1*1*1~IEA*1*~`;
}

function fake277CA(patientControlNumber: string, accepted: boolean): string {
  return `ISA*00* *00* *ZZ*NCXIX*ZZ*STUB-TSN*..*277*CA~ST*277*0001*005010X214~STC*${accepted ? 'A0:20' : 'A7:21'}*${todayYmd()}*WQ*${patientControlNumber}~SE*3*0001~`;
}

function fakeRaw835(checkNo: string, claims: { pcn: string; tcn: string; paid: number; charged: number }[]): string {
  const lines = [
    `ISA*00* *00* *ZZ*NCXIX*ZZ*STUB-TSN*..*835*RA~`,
    `GS*HP*NCXIX*STUB-TSN*..*1*X*005010X221A1~`,
    `ST*835*0001~`,
    `BPR*I*${claims.reduce((s, c) => s + c.paid, 0).toFixed(2)}*C*CHK*****01*021000021*DA*123*..*${todayYmd().replace(/-/g, '')}~`,
    `TRN*1*${checkNo}*1234567890~`,
  ];
  for (const c of claims) {
    lines.push(`CLP*${c.pcn}*1*${c.charged.toFixed(2)}*${c.paid.toFixed(2)}**MC*${c.tcn}*11*1~`);
  }
  lines.push(`SE*${lines.length}*0001~GE*1*1~IEA*1*~`);
  return lines.join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// The stub adapter
// ─────────────────────────────────────────────────────────────────────────────

export interface StubOptions {
  /** Console-log the would-be requests for debugging. Default false. */
  verbose?: boolean;
  /** Inject fake "now" for deterministic tests. */
  now?: () => Date;
}

export class NctracksStubAdapter implements NctracksAdapter {
  public readonly mode: NctracksMode = 'stub';
  private readonly cn = new ControlNumberSource();
  private readonly verbose: boolean;

  constructor(public readonly config: NctracksConfig, opts: StubOptions = {}) {
    if (config.mode !== 'stub') {
      throw new Error(
        `NctracksStubAdapter requires config.mode === 'stub' (got '${config.mode}'). ` +
          `Use createNctracksAdapter() factory to pick the right implementation.`,
      );
    }
    this.verbose = opts.verbose ?? false;
  }

  // ── Eligibility ───────────────────────────────────────────────────────

  async checkEligibility(req: EligibilityRequest): Promise<EligibilityResponse> {
    this.log('checkEligibility', req);
    const traceId = req.traceId ?? `STUB-${hashCode(req.subscriberId + req.dateOfService)}`;

    // AAA rejection trigger for testing the unhappy path
    if (req.subscriberId.endsWith('999')) {
      return {
        status: 'error',
        coverageDetails: [],
        aaaRejection: { code: '75', followUpAction: 'C' },
        raw271: fakeRaw271(req, 'inactive'),
        traceId,
      };
    }

    const lastDigit = Number.parseInt(req.subscriberId.slice(-1), 10) || 0;
    if (lastDigit === 9) {
      return {
        status: 'inactive',
        coverageDetails: [],
        raw271: fakeRaw271(req, 'inactive'),
        traceId,
      };
    }

    // 7,8 → managed-care; 0..6 → straight Medicaid
    let benefitPlan: string;
    let mc: EligibilityResponse['managedCareEnrollment'];
    if (lastDigit === 7) {
      benefitPlan = 'STANDARD_PLAN:HEALTHY_BLUE';
      mc = {
        planName: 'Healthy Blue',
        planId: 'PHP_HEALTHY_BLUE',
        effectiveDate: '2024-01-01',
        carveOut: 'none',
      };
    } else if (lastDigit === 8) {
      benefitPlan = 'TAILORED_PLAN:TRILLIUM';
      mc = {
        planName: 'Trillium Health Resources',
        planId: 'TP_TRILLIUM',
        effectiveDate: '2024-07-01',
        carveOut: 'behavioral_health',
      };
    } else {
      benefitPlan = 'MEDICAID';
    }

    return {
      status: 'active',
      benefitPlan,
      managedCareEnrollment: mc,
      coverageDetails: [
        { serviceTypeCode: '30', coverageLevel: 'IND', copay: 0, inNetwork: true },
        { serviceTypeCode: '88', coverageLevel: 'IND', copay: 3,  inNetwork: true }, // pharmacy
      ],
      raw271: fakeRaw271(req, 'active', benefitPlan),
      traceId,
    };
  }

  // ── Claim submission ──────────────────────────────────────────────────

  async submitClaim(req: ClaimSubmitRequest): Promise<ClaimSubmitResult> {
    this.log('submitClaim', req);
    const isa13 = this.cn.next('ISA');
    const gs06 = this.cn.next('GS');
    const st02 = this.cn.next('ST');
    const ts = Date.now();
    const fileName = `mg360_${req.claimType[0].toUpperCase()}_${ts}_${isa13}.x12`;

    // 999 always accepted in stub mode; 277CA rejects when totalCharge < 0 (edge-case test)
    const accepted = req.totalCharge >= 0 && req.diagnoses.length > 0;
    const ack999: Ack999 = {
      accepted,
      errors: accepted ? [] : [{ segment: 'CLM', code: '1', description: 'Invalid totalCharge or no diagnosis' }],
      raw: fake999(accepted),
    };
    const ack277CA: Ack277CA = {
      status: accepted ? 'accepted' : 'rejected',
      perClaim: [
        {
          patientControlNumber: req.patientControlNumber,
          status: accepted ? 'accepted' : 'rejected',
          categoryCode: accepted ? 'A0' : 'A7',
          statusCode: accepted ? '20' : '21',
        },
      ],
      raw: fake277CA(req.patientControlNumber, accepted),
    };

    return {
      interchangeControlNumber: isa13,
      groupControlNumber: gs06,
      transactionSetControlNumber: st02,
      fileName,
      submittedAt: isoNow(),
      ack999,
      ack277CA,
    };
  }

  // ── Claim status ──────────────────────────────────────────────────────

  async getClaimStatus(req: ClaimStatusRequest): Promise<ClaimStatusResponse> {
    this.log('getClaimStatus', req);
    const mod = hashCode(req.patientControlNumber + req.subscriberId) % 4;
    const tcn = req.payerClaimControlNumber ?? `STUB-TCN-${hashCode(req.patientControlNumber)}`;
    const raw277 = `STC*${mod}~REF*1K*${tcn}~`;

    if (mod === 0) {
      return { status: 'pending',    categoryCode: 'A1', statusCode: '20', payerClaimControlNumber: tcn, raw277 };
    }
    if (mod === 1) {
      return {
        status: 'paid', categoryCode: 'F1', statusCode: '65',
        payerClaimControlNumber: tcn,
        paidAmount: 87.42, checkNumber: 'STUB-CHK-12345', paymentDate: todayYmd(),
        raw277,
      };
    }
    if (mod === 2) {
      return { status: 'denied',     categoryCode: 'F2', statusCode: '24', payerClaimControlNumber: tcn, raw277 };
    }
    return   { status: 'in_process', categoryCode: 'A3', statusCode: '19', payerClaimControlNumber: tcn, raw277 };
  }

  // ── Remittance ────────────────────────────────────────────────────────

  async retrieveRemittances(q?: RemittanceQuery): Promise<RemittanceFile[]> {
    this.log('retrieveRemittances', q ?? {});
    // Only return something if `since` is within ~14 days
    if (q?.since && daysAgo(q.since) > 14) return [];

    const checkNo = q?.checkNumber ?? `STUB-CHK-${hashCode(q?.since ?? todayYmd())}`;
    const claims = [
      { pcn: 'PCN-STUB-1', tcn: 'TCN-STUB-1', charged: 200, paid: 175.50 },
      { pcn: 'PCN-STUB-2', tcn: 'TCN-STUB-2', charged: 80,  paid: 80.00  },
    ];
    return [
      {
        fileName: `RA_${todayYmd()}_${checkNo}.835`,
        receivedAt: isoNow(),
        checkOrEftNumber: checkNo,
        paymentDate: todayYmd(),
        payeeNpi: this.config.identifiers.billingNpi,
        totalPaid: claims.reduce((s, c) => s + c.paid, 0),
        claims: claims.map(c => ({
          patientControlNumber: c.pcn,
          payerClaimControlNumber: c.tcn,
          chargedAmount: c.charged,
          paidAmount: c.paid,
          claimStatusCode: '1', // primary, paid as billed-ish
          adjustments: c.charged === c.paid
            ? []
            : [{ groupCode: 'CO', reasonCode: '45', amount: c.charged - c.paid }],
          remarks: [],
          serviceLines: [],
        })),
        raw835: fakeRaw835(checkNo, claims),
      },
    ];
  }

  // ── Acks ──────────────────────────────────────────────────────────────

  async pollAcks(since?: string): Promise<{ ack999: Ack999[]; ack277CA: Ack277CA[] }> {
    this.log('pollAcks', { since });
    // Stub returns empty — real submitClaim() already populated acks inline.
    return { ack999: [], ack277CA: [] };
  }

  // ── Health check ──────────────────────────────────────────────────────

  async healthCheck(): Promise<{ realtimeOk: boolean; sftpOk: boolean; cdOk?: boolean }> {
    return { realtimeOk: true, sftpOk: true, cdOk: this.config.batch.connectDirect ? true : undefined };
  }

  // ── Internals ─────────────────────────────────────────────────────────

  private log(op: string, payload: unknown): void {
    if (!this.verbose) return;
    // eslint-disable-next-line no-console
    console.log(`[nctracks:stub] ${op}`, JSON.stringify(payload));
  }
}
