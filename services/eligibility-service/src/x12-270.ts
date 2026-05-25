/**
 * X12 270 builder + 271 parser.
 *
 * ASC X12 N 005010X279A1 (270 / 271 Eligibility, Coverage, or Benefit Inquiry/Response).
 *
 * Per CLAUDE.md compliance section + 45 CFR Part 162.
 *
 * This is a minimal but well-formed implementation. Real payer integration
 * requires per-payer companion guide compliance (segment ordering for HMOs vs
 * Medicaid traditional, eligibility-vs-coverage inquiry types, etc.).
 */

const SEG = '~';
const ELE = '*';
const SUB = ':';

export interface Build270Input {
  /** ISA/GS envelope party (clearinghouse or payer EDI gateway). */
  sender:   { qualifier: string; id: string; name: string };
  receiver: { qualifier: string; id: string; name: string };
  /** Interchange Control Number — 9 digits. */
  interchangeControlNumber: string;
  /** Functional Group Control Number — 9 digits. */
  groupControlNumber: string;
  productionMode: 'P' | 'T';
  /** Payer (information receiver). */
  payerId: string;
  payerName: string;
  /** Provider (information source). */
  providerNpi: string;
  providerName: string;
  /** Subscriber (the patient). */
  subscriberLastName: string;
  subscriberFirstName: string;
  subscriberMemberId: string;
  subscriberDateOfBirth: string;   // YYYYMMDD
  subscriberGender?: 'M' | 'F' | 'U';
  /** Date(s) of service to check eligibility for. Defaults to today. */
  serviceDate?: string;            // YYYYMMDD
  /** Service-type code (e.g., '30'=Health Benefit Plan Coverage, '47'=Hospital, '52'=Acupuncture). */
  serviceTypeCode?: string;
  /**
   * HETS Submitter UID (CMS HETS Trading Partner Management System).
   * REQUIRED for Medicare 270/271 transactions effective 2026-05-11.
   * When set, this value populates ISA06 sender ID (overriding sender.id) so
   * CMS can match the inquiry to the originating submitter. Providers whose
   * NPI is not yet attested under this submitter UID will receive AAA error 41.
   * Source: /opt/credential-vault/<service>.json → HETS_SUBMITTER_UID
   */
  hetsSubmitterUid?: string;
}

function pad(s: string, n: number): string { return s.padEnd(n).slice(0, n); }
function ymd(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}
function hm(d: Date = new Date()): string {
  return `${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function build270(input: Build270Input): string {
  const out: string[] = [];
  const now = new Date();
  const dateOfService = input.serviceDate ?? ymd(now);
  const serviceTypeCode = input.serviceTypeCode ?? '30';

  // ---- ISA envelope ----
  // HETS UID, when supplied, takes precedence over input.sender.id in ISA06.
  // CMS HETS effective 2026-05-11.
  const isa06Id = input.hetsSubmitterUid && input.hetsSubmitterUid.trim().length > 0
    ? input.hetsSubmitterUid
    : input.sender.id;
  out.push([
    'ISA',
    '00', pad('', 10),
    '00', pad('', 10),
    input.sender.qualifier, pad(isa06Id, 15),
    input.receiver.qualifier, pad(input.receiver.id, 15),
    ymd(now).slice(2), hm(now),
    '^',
    '00501',
    input.interchangeControlNumber.padStart(9, '0'),
    '0',
    input.productionMode,
    SUB,
  ].join(ELE) + SEG);

  // ---- GS functional group ----
  out.push(['GS', 'HS', input.sender.id, input.receiver.id,
    ymd(now), hm(now), input.groupControlNumber, 'X', '005010X279A1'].join(ELE) + SEG);

  // ---- ST transaction set ----
  out.push(['ST', '270', '0001', '005010X279A1'].join(ELE) + SEG);

  // ---- BHT beginning of hierarchical transaction ----
  out.push(['BHT', '0022', '13', `MG-${Date.now()}`, ymd(now), hm(now)].join(ELE) + SEG);

  // ---- 2000A: Information Source (Payer) ----
  out.push(['HL', '1', '', '20', '1'].join(ELE) + SEG);
  out.push(['NM1', 'PR', '2', input.payerName, '', '', '', '', 'PI', input.payerId].join(ELE) + SEG);

  // ---- 2000B: Information Receiver (Provider) ----
  out.push(['HL', '2', '1', '21', '1'].join(ELE) + SEG);
  out.push(['NM1', '1P', '2', input.providerName, '', '', '', '', 'XX', input.providerNpi].join(ELE) + SEG);

  // ---- 2000C: Subscriber (Patient) ----
  out.push(['HL', '3', '2', '22', '0'].join(ELE) + SEG);
  out.push(['TRN', '1', `TRN-${Date.now()}`, '9' + input.providerNpi].join(ELE) + SEG);
  out.push(['NM1', 'IL', '1', input.subscriberLastName, input.subscriberFirstName, '', '', '', 'MI', input.subscriberMemberId].join(ELE) + SEG);
  out.push(['DMG', 'D8', input.subscriberDateOfBirth, input.subscriberGender ?? 'U'].join(ELE) + SEG);

  // Date of service
  out.push(['DTP', '291', 'D8', dateOfService].join(ELE) + SEG);

  // Service type inquiry
  out.push(['EQ', serviceTypeCode].join(ELE) + SEG);

  // ---- closers ----
  out.push(['SE', String(out.length + 1), '0001'].join(ELE) + SEG);
  out.push(['GE', '1', input.groupControlNumber].join(ELE) + SEG);
  out.push(['IEA', '1', input.interchangeControlNumber.padStart(9, '0')].join(ELE) + SEG);

  return out.join('\n');
}

// ============================================================
// 271 PARSER
// ============================================================

export interface Parsed271 {
  active: boolean;
  rejectReason?: string;
  /** AAA reject codes returned by payer. Code 41 = HETS submitter not authorized for this NPI. */
  aaaCodes: string[];
  /** True when AAA code 41 is present — NPI must complete HETS attestation. */
  requiresHetsAttestation: boolean;
  planName?: string;
  effectiveFrom?: string;    // YYYY-MM-DD
  effectiveTo?: string;
  copayCents?: number;
  deductibleRemainingCents?: number;
  benefits: Array<{
    serviceType: string;
    coverageLevel: string;
    inPlanNetwork?: boolean;
    amountCents?: number;
  }>;
  raw: Record<string, unknown>;
}

/** Parses a 271 response. The 271 uses EB segments — one per benefit returned. */
export function parse271(payload: string): Parsed271 {
  const segments = payload.split(/[~\n\r]+/).filter(Boolean);
  const out: Parsed271 = {
    active: false, benefits: [], aaaCodes: [], requiresHetsAttestation: false,
    raw: { rawSegmentCount: segments.length },
  };

  for (const seg of segments) {
    const parts = seg.split('*');
    const tag = parts[0];

    if (tag === 'AAA') {
      // Application error - subscriber not found, HETS attestation missing, etc.
      // AAA01: valid request indicator (Y/N)
      // AAA02: rejection reason code (technical)
      // AAA03: reject reason code (business) — '41' = HETS submitter not authorized for NPI
      // AAA04: follow-up action code
      out.active = false;
      const reject = parts[3] ?? 'unknown';
      out.aaaCodes.push(reject);
      out.rejectReason = `AAA reject code ${reject}`;
      if (reject === '41') {
        out.requiresHetsAttestation = true;
        out.rejectReason = 'HETS submitter not authorized for this NPI (AAA 41). '
          + 'Provider must complete HETS attestation linking their NPI to the MedGuard360 HETS Submitter UID.';
      }
    } else if (tag === 'EB') {
      // Eligibility/Benefit segment
      // EB01: coverage status (1=Active, 6=Inactive, V=Cannot Process)
      // EB02: coverage level (IND, FAM, ESP, etc.)
      // EB03: service type code (30=Plan Coverage, 1=Medical Care, etc.)
      // EB04: insurance type
      // EB05: plan coverage description (often the plan name)
      // EB06: time period qualifier
      // EB07: monetary amount
      // EB08: percent
      // EB09: quantity qualifier
      // EB12: in-network indicator (Y/N)
      const status = parts[1];
      if (status === '1') out.active = true;
      if (parts[5] && !out.planName) out.planName = parts[5];

      const amountStr = parts[7];
      const amountCents = amountStr ? Math.round(Number.parseFloat(amountStr) * 100) : undefined;
      if (parts[3] === '30' && amountCents !== undefined && !out.copayCents) {
        out.copayCents = amountCents;
      }

      out.benefits.push({
        serviceType: parts[3] ?? '',
        coverageLevel: parts[2] ?? '',
        inPlanNetwork: parts[12] === 'Y',
        amountCents,
      });
    } else if (tag === 'DTP') {
      // DTP*291 = Plan Begin / coverage effective
      const qualifier = parts[1];
      const format = parts[2];
      const date = parts[3];
      if (format === 'D8' && date && date.length === 8) {
        const iso = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`;
        if (qualifier === '291' && !out.effectiveFrom) out.effectiveFrom = iso;
        if (qualifier === '292')                       out.effectiveTo   = iso;
      }
    } else if (tag === 'AMT') {
      // AMT*R = remaining deductible
      const qualifier = parts[1];
      const amount = parts[2];
      if (qualifier === 'R' && amount) out.deductibleRemainingCents = Math.round(Number.parseFloat(amount) * 100);
    }
  }

  return out;
}
