/**
 * Minimal X12 270 builder for NCTracks (005010X279A1).
 */
import type { EligibilityRequest, NctracksConfig } from '../types';

const SEG = '~';
const ELE = '*';

function pad(s: string, n: number): string { return s.padEnd(n).slice(0, n); }
function ymd(d = new Date()): string {
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}
function hm(d = new Date()): string {
  return `${String(d.getUTCHours()).padStart(2, '0')}${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function build270ForNctracks(req: EligibilityRequest, config: NctracksConfig, icn: string): string {
  const ids = config.identifiers;
  const now = new Date();
  const dos = (req.dateOfService ?? '').replace(/-/g, '') || ymd(now);
  const dob = (req.dob ?? '').replace(/-/g, '') || '19700101';
  const out: string[] = [];

  out.push([
    'ISA', '00', pad('', 10), '00', pad('', 10),
    ids.submitterQualifier, pad(ids.submitterId, 15),
    ids.receiverQualifier, pad(ids.receiverId, 15),
    ymd(now).slice(2), hm(now), '^', '00501', icn.padStart(9, '0'), '0', ids.usageIndicator, ':',
  ].join(ELE) + SEG);

  out.push(['GS', 'HS', ids.submitterId, ids.receiverId, ymd(now), hm(now), icn, 'X', '005010X279A1'].join(ELE) + SEG);
  out.push(['ST', '270', '0001', '005010X279A1'].join(ELE) + SEG);
  out.push(['BHT', '0022', '13', req.traceId ?? `MG-${Date.now()}`, ymd(now), hm(now)].join(ELE) + SEG);
  out.push(['HL', '1', '', '20', '1'].join(ELE) + SEG);
  out.push(['NM1', 'PR', '2', 'NC MEDICAID', '', '', '', '', 'PI', ids.receiverId].join(ELE) + SEG);
  out.push(['HL', '2', '1', '21', '1'].join(ELE) + SEG);
  out.push(['NM1', '1P', '2', 'PROVIDER', '', '', '', '', 'XX', req.providerNpi ?? ids.billingNpi].join(ELE) + SEG);
  out.push(['HL', '3', '2', '22', '0'].join(ELE) + SEG);
  out.push(['NM1', 'IL', '1', req.lastName ?? 'UNKNOWN', req.firstName ?? 'UNKNOWN', '', '', '', 'MI', req.subscriberId].join(ELE) + SEG);
  out.push(['DMG', 'D8', dob, 'U'].join(ELE) + SEG);
  out.push(['DTP', '291', 'D8', dos].join(ELE) + SEG);
  out.push(['EQ', (req.serviceTypeCodes?.[0] ?? '30')].join(ELE) + SEG);
  const transactionSegmentCount = out.slice(2).length + 1; // ST through SE; exclude ISA/GS.
  out.push(['SE', String(transactionSegmentCount), '0001'].join(ELE) + SEG);
  out.push(['GE', '1', icn].join(ELE) + SEG);
  out.push(['IEA', '1', icn.padStart(9, '0')].join(ELE) + SEG);
  return out.join('\n');
}