/**
 * Minimal X12 837P builder for NCTracks batch submission (005010X222A1).
 */
import type { ClaimSubmitRequest, NctracksConfig } from '../types';

const SEG = '~\n';
const ELE = '*';
const COMP = ':';

function pad(s: string, n: number): string { return s.padEnd(n).slice(0, n); }
function ymd(d: Date | string): string {
  if (typeof d === 'string') return d.replace(/-/g, '').slice(0, 8);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}
function hm(d = new Date()): string {
  return `${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export interface Build837Result {
  payload: string;
  interchangeControlNumber: string;
  groupControlNumber: string;
  transactionSetControlNumber: string;
}

export function build837PForNctracks(
  req: ClaimSubmitRequest,
  config: NctracksConfig,
  icn: string,
): Build837Result {
  const ids = config.identifiers;
  const now = new Date();
  const st02 = '0001';
  const gcn = icn;
  const billing = req.billingProvider ?? { npi: ids.billingNpi, taxonomy: ids.billingTaxonomy, atypicalId: ids.atypicalId };
  const rendering = req.renderingProvider ?? billing;
  const dosFrom = ymd(req.serviceDateFrom);
  const dosTo = ymd(req.serviceDateTo);
  const pos = req.lines[0]?.placeOfService ?? '11';
  const segments: string[] = [];
  let stSegCount = 0;

  function push(...elements: string[]): void {
    segments.push(elements.join(ELE) + SEG);
    stSegCount++;
  }

  segments.push([
    'ISA', '00', pad('', 10), '00', pad('', 10),
    ids.submitterQualifier, pad(ids.submitterId, 15),
    ids.receiverQualifier, pad(ids.receiverId, 15),
    ymd(now).slice(2), hm(now), '^', '00501', icn.padStart(9, '0'), '0', ids.usageIndicator, COMP,
  ].join(ELE) + SEG);

  push('GS', 'HC', ids.submitterId, ids.receiverId, ymd(now), hm(now), gcn, 'X', '005010X222A1');
  push('ST', '837', st02, '005010X222A1');
  push('BHT', '0019', '00', req.patientControlNumber, ymd(now), hm(now), 'CH');
  push('NM1', '41', '2', 'MEDGUARD360', '', '', '', '', '46', ids.submitterId);
  push('NM1', '40', '2', 'NC MEDICAID', '', '', '', '', '46', ids.receiverId);
  push('HL', '1', '', '20', '1');
  push('PRV', 'BI', 'PXC', billing.taxonomy);
  push('NM1', '85', '2', 'BILLING PROVIDER', '', '', '', '', 'XX', billing.npi);
  if (billing.atypicalId) push('REF', 'G2', billing.atypicalId);
  push('HL', '2', '1', '22', '0');
  push('SBR', 'P', '18', '', '', '', '', '', 'MC');
  push('NM1', 'IL', '1', 'SUBSCRIBER', 'UNKNOWN', '', '', '', 'MI', req.subscriberId);
  push('NM1', 'PR', '2', 'NC MEDICAID', '', '', '', '', 'PI', ids.receiverId);
  push('CLM', req.patientControlNumber, req.totalCharge.toFixed(2), '', '', `${pos}${COMP}B${COMP}1`, 'Y', 'A', 'Y', 'Y');
  push('DTP', '434', 'RD8', `${dosFrom}-${dosTo}`);
  if (req.priorAuthNumber) push('REF', 'G1', req.priorAuthNumber);
  if (req.diagnoses.length) {
    const hi = req.diagnoses.slice(0, 12).map((dx, i) => {
      const q = i === 0 ? 'ABK' : 'ABF';
      return `${q}${COMP}${dx.code}`;
    });
    push('HI', ...hi);
  }
  push('NM1', '82', '1', 'RENDERING', 'PROVIDER', '', '', '', 'XX', rendering.npi);
  push('PRV', 'PE', 'PXC', rendering.taxonomy);

  req.lines.forEach((line, idx) => {
    push('LX', String(idx + 1));
    const mods = (line.modifiers ?? []).slice(0, 4);
    const composite = ['HC', line.procedureCode, ...mods].join(COMP);
    const ptrs = line.diagnosisPointers.map(String).join(COMP);
    push('SV1', composite, line.charge.toFixed(2), 'UN', String(line.units), line.placeOfService ?? pos, '', ptrs);
    push('DTP', '472', 'D8', ymd(line.serviceDate));
    if (line.ndc) push('LIN', '', 'N4', line.ndc.code);
  });

  push('SE', String(stSegCount), st02);
  push('GE', '1', gcn);
  push('IEA', '1', icn.padStart(9, '0'));

  return {
    payload: segments.join(''),
    interchangeControlNumber: icn.padStart(9, '0'),
    groupControlNumber: gcn,
    transactionSetControlNumber: st02,
  };
}

export function claim837FileName(req: ClaimSubmitRequest, icn: string): string {
  const prefix = req.claimType === 'professional' ? 'P' : req.claimType === 'institutional' ? 'I' : 'D';
  return `mg360_${prefix}_${Date.now()}_${icn}.x12`;
}
