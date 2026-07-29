/**
 * Minimal X12 276 builder for NCTracks claim status (005010X212).
 */
import type { ClaimStatusRequest, NctracksConfig } from '../types';

const SEG = '~';
const ELE = '*';

function pad(s: string, n: number): string { return s.padEnd(n).slice(0, n); }
function ymd(d: Date | string = new Date()): string {
  if (typeof d === 'string') return d.replace(/-/g, '').slice(0, 8);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}
function hm(d = new Date()): string {
  return `${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function build276ForNctracks(req: ClaimStatusRequest, config: NctracksConfig, icn: string): string {
  const ids = config.identifiers;
  const now = new Date();
  const dosFrom = ymd(req.serviceDateFrom ?? now);
  const dosTo = ymd(req.serviceDateTo ?? req.serviceDateFrom ?? now);
  const trace = req.patientControlNumber;
  const out: string[] = [];

  out.push([
    'ISA', '00', pad('', 10), '00', pad('', 10),
    ids.submitterQualifier, pad(ids.submitterId, 15),
    ids.receiverQualifier, pad(ids.receiverId, 15),
    ymd(now).slice(2), hm(now), '^', '00501', icn.padStart(9, '0'), '0', ids.usageIndicator, ':',
  ].join(ELE) + SEG);

  out.push(['GS', 'HR', ids.submitterId, ids.receiverId, ymd(now), hm(now), icn, 'X', '005010X212'].join(ELE) + SEG);
  out.push(['ST', '276', '0001', '005010X212'].join(ELE) + SEG);
  out.push(['BHT', '0010', '13', trace, ymd(now), hm(now)].join(ELE) + SEG);
  out.push(['HL', '1', '', '20', '1'].join(ELE) + SEG);
  out.push(['NM1', 'PR', '2', 'NC MEDICAID', '', '', '', '', 'PI', ids.receiverId].join(ELE) + SEG);
  out.push(['HL', '2', '1', '21', '1'].join(ELE) + SEG);
  out.push(['NM1', '1P', '2', 'PROVIDER', '', '', '', '', 'XX', req.providerNpi ?? ids.billingNpi].join(ELE) + SEG);
  out.push(['HL', '3', '2', '22', '1'].join(ELE) + SEG);
  out.push(['NM1', 'IL', '1', 'SUBSCRIBER', 'UNKNOWN', '', '', '', 'MI', req.subscriberId].join(ELE) + SEG);
  out.push(['HL', '4', '3', '23', '0'].join(ELE) + SEG);
  out.push(['TRN', '1', trace, ids.submitterId].join(ELE) + SEG);
  out.push(['REF', '1K', req.payerClaimControlNumber ?? req.patientControlNumber].join(ELE) + SEG);
  out.push(['DTP', '472', 'RD8', `${dosFrom}-${dosTo}`].join(ELE) + SEG);
  out.push(['SE', String(out.length + 1), '0001'].join(ELE) + SEG);
  out.push(['GE', '1', icn].join(ELE) + SEG);
  out.push(['IEA', '1', icn.padStart(9, '0')].join(ELE) + SEG);
  return out.join('\n');
}