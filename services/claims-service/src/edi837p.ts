/**
 * EDI 837P generator — ASC X12 N 5010 (005010X222A1)
 *
 * Segment terminator : ~\n
 * Element separator  : *
 * Component separator: :
 */

import { ClaimLineInput } from './types';

const SEG_TERM = '~\n';
const ELE_SEP = '*';
const COMP_SEP = ':';

/** Format a date as YYYYMMDD. */
function fmtDate(d: Date | string): string {
  if (typeof d === 'string') return d.replace(/-/g, '').slice(0, 8);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dy = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${mo}${dy}`;
}

/** Format a Date as HHMMSS for ISA time. */
function fmtTime(d: Date): string {
  return `${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** Pad or truncate a string to exactly n characters. */
function pad(s: string, n: number): string {
  return s.padEnd(n).slice(0, n);
}

/** Join elements and append segment terminator. */
function seg(...elements: string[]): string {
  return elements.join(ELE_SEP) + SEG_TERM;
}

export interface Edi837PInput {
  ccn: string;
  submitterId: string;
  billingNpi: string;
  billingName: string;
  billingAddress: { street: string; city: string; state: string; zip: string };
  payerId: string;
  payerName: string;
  providerNpi: string;
  providerName: string;
  patientMedicaidId: string;
  patientName: { first: string; last: string };
  patientDob: string; // YYYYMMDD
  patientGender: 'M' | 'F' | 'U';
  serviceDate: string; // YYYYMMDD
  diagnosisCodes: string[];
  claimLines: ClaimLineInput[];
  totalCharge: number;
  placeOfService?: string;
}

export function generateEdi837P(input: Edi837PInput): string {
  const now = new Date();
  const isaDate = fmtDate(now).slice(2); // YYMMDD
  const isaTime = fmtTime(now);

  // ISA control number: derive from CCN (strip dashes, take 9 digits)
  const icn = input.ccn.replace(/\D/g, '').slice(0, 9).padStart(9, '0');
  const gcn = icn; // group control number same as interchange for single-group envelope

  const segments: string[] = [];
  let segCount = 0;

  function push(...args: string[]): void {
    segments.push(seg(...args));
    segCount++;
  }

  // ── ISA — Interchange Control Header ───────────────────────────────────────
  // Fixed 106-character segment; element positions are positional, not named.
  segments.push(
    [
      'ISA',
      '00',                         // ISA01 auth info qualifier
      pad('', 10),                  // ISA02 auth info
      '00',                         // ISA03 security info qualifier
      pad('', 10),                  // ISA04 security info
      'ZZ',                         // ISA05 interchange sender ID qualifier
      pad(input.submitterId, 15),   // ISA06 interchange sender ID
      'ZZ',                         // ISA07 interchange receiver ID qualifier
      pad(input.payerId, 15),       // ISA08 interchange receiver ID
      isaDate,                      // ISA09 date
      isaTime,                      // ISA10 time
      '^',                          // ISA11 repetition separator
      '00501',                      // ISA12 interchange control version
      icn,                          // ISA13 interchange control number
      '0',                          // ISA14 acknowledgment requested
      'T',                          // ISA15 usage indicator (T=test, P=production)
      COMP_SEP,                     // ISA16 component element separator
    ].join(ELE_SEP) + SEG_TERM,
  );
  segCount++;

  // ── GS — Functional Group Header ───────────────────────────────────────────
  push('GS', 'HC', input.submitterId, input.payerId, fmtDate(now), isaTime, gcn, 'X', '005010X222A1');

  // ── ST — Transaction Set Header ─────────────────────────────────────────────
  push('ST', '837', '0001', '005010X222A1');

  // ── BHT — Beginning of Hierarchical Transaction ─────────────────────────────
  push('BHT', '0019', '00', input.ccn, fmtDate(now), isaTime, 'CH');

  // ── 1000A — Submitter Name ───────────────────────────────────────────────────
  push('NM1', '41', '2', input.billingName, '', '', '', '', '46', input.submitterId);
  push('PER', 'IC', input.billingName, 'TE', '0000000000');

  // ── 1000B — Receiver Name ────────────────────────────────────────────────────
  push('NM1', '40', '2', input.payerName, '', '', '', '', '46', input.payerId);

  // ── 2000A — Billing/Pay-to Provider HL ──────────────────────────────────────
  push('HL', '1', '', '20', '1');
  push('PRV', 'BI', 'PXC', '207Q00000X'); // General Practice taxonomy placeholder

  // ── 2010AA — Billing Provider Name ──────────────────────────────────────────
  push('NM1', '85', '2', input.billingName, '', '', '', '', 'XX', input.billingNpi);
  push('N3', input.billingAddress.street);
  push('N4', input.billingAddress.city, input.billingAddress.state, input.billingAddress.zip);
  push('REF', 'EI', input.billingNpi); // NPI reference

  // ── 2010AB — Pay-to Address (same as billing for simplicity) ────────────────
  // (omitted — situational, only needed when different from billing)

  // ── 2000B — Subscriber HL ───────────────────────────────────────────────────
  push('HL', '2', '1', '22', '0');
  push('SBR', 'P', '18', '', '', '', '', '', 'MC'); // MC = Medicaid

  // ── 2010BA — Subscriber Name ────────────────────────────────────────────────
  push(
    'NM1', 'IL', '1',
    input.patientName.last,
    input.patientName.first,
    '', '', '',
    'MI', input.patientMedicaidId,
  );
  push('DMG', 'D8', input.patientDob, input.patientGender);

  // ── 2010BB — Payer Name ──────────────────────────────────────────────────────
  push('NM1', 'PR', '2', input.payerName, '', '', '', '', 'PI', input.payerId);

  // ── 2300 — Claim Information ─────────────────────────────────────────────────
  const pos = input.placeOfService ?? '11';
  push(
    'CLM',
    input.ccn,
    input.totalCharge.toFixed(2),
    '', '',
    `${pos}${COMP_SEP}B${COMP_SEP}1`, // place of service : facility code : frequency
    'Y', 'A', 'Y', 'Y',
  );

  // DTP — Statement Dates
  push('DTP', '472', 'D8', input.serviceDate);

  // REF — Claim reference (CCN as additional reference)
  push('REF', 'D9', input.ccn);

  // ── HI — Health Care Diagnosis Codes ─────────────────────────────────────────
  if (input.diagnosisCodes.length) {
    const codes = input.diagnosisCodes.slice(0, 12);
    const hiElements = codes.map((code, i) => {
      const qualifier = i === 0 ? 'ABK' : 'ABF'; // ABK = principal, ABF = secondary (ICD-10)
      return `${qualifier}${COMP_SEP}${code}`;
    });
    push('HI', ...hiElements);
  }

  // ── 2400 — Service Lines ──────────────────────────────────────────────────────
  for (const line of input.claimLines) {
    push('LX', String(line.line_number));

    // SV1 composite: HC:CPT:mod1:mod2:...
    const mods = (line.modifier_codes ?? []).slice(0, 4);
    const svdComposite = ['HC', line.procedure_code, ...mods].join(COMP_SEP);
    const diagPtrs = (line.diagnosis_pointers ?? [1]).join(COMP_SEP);
    const unitType = line.unit_type ?? 'UN';
    const linePOS = line.place_of_service ?? pos;

    push(
      'SV1',
      svdComposite,
      line.charge_amount.toFixed(2),
      unitType,
      String(line.units),
      linePOS,
      '',
      diagPtrs,
    );

    // DTP — Line Date of Service
    push('DTP', '472', 'D8', line.service_date.replace(/-/g, ''));
  }

  // ── SE — Transaction Set Trailer ──────────────────────────────────────────────
  // segCount includes everything from ST through just before SE; SE itself is +1
  // The SE01 count includes ST and SE.
  push('SE', String(segCount - 1), '0001'); // -1 because ISA and GS are not in ST count

  // ── GE — Functional Group Trailer ────────────────────────────────────────────
  push('GE', '1', gcn);

  // ── IEA — Interchange Control Trailer ────────────────────────────────────────
  push('IEA', '1', icn);

  return segments.join('');
}
