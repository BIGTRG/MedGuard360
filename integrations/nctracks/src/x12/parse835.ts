/** Minimal 835 remittance advice parser for NCTracks batch polling. */
import type { RemittanceFile } from '../types';

function isoFromYmd(raw?: string): string {
  if (!raw || raw.length !== 8) return new Date().toISOString().slice(0, 10);
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

export function parse835(payload: string, fileName: string, receivedAt: string): RemittanceFile {
  const segments = payload.split(/[~\n\r]+/).filter(Boolean);
  let checkOrEftNumber = '';
  let paymentDate = new Date().toISOString().slice(0, 10);
  let payeeNpi = '';
  let totalPaid = 0;
  const claims: RemittanceFile['claims'] = [];
  let currentClaim: RemittanceFile['claims'][number] | null = null;

  for (const seg of segments) {
    const p = seg.split('*');
    if (p[0] === 'BPR') {
      totalPaid = Number.parseFloat(p[2] ?? '0') || 0;
      paymentDate = isoFromYmd(p[16]);
    } else if (p[0] === 'TRN') {
      checkOrEftNumber = p[2] ?? p[1] ?? '';
    } else if (p[0] === 'N1' && p[1] === 'PE') {
      payeeNpi = p[4] ?? payeeNpi;
    } else if (p[0] === 'CLP') {
      if (currentClaim) claims.push(currentClaim);
      currentClaim = {
        patientControlNumber: p[1] ?? '',
        payerClaimControlNumber: p[7] ?? '',
        chargedAmount: Number.parseFloat(p[3] ?? '0') || 0,
        paidAmount: Number.parseFloat(p[4] ?? '0') || 0,
        claimStatusCode: p[2] ?? '',
        adjustments: [],
        remarks: [],
        serviceLines: [],
      };
    } else if (p[0] === 'CAS' && currentClaim) {
      for (let i = 1; i + 2 < p.length; i += 3) {
        const groupCode = p[i] as 'CO' | 'PR' | 'OA' | 'PI';
        const reasonCode = p[i + 1] ?? '';
        const amount = Number.parseFloat(p[i + 2] ?? '0') || 0;
        if (groupCode && reasonCode) {
          currentClaim.adjustments.push({ groupCode, reasonCode, amount });
        }
      }
    } else if (p[0] === 'SVC' && currentClaim) {
      const procParts = (p[1] ?? '').split(':');
      currentClaim.serviceLines.push({
        procedureCode: procParts[1] ?? p[1] ?? '',
        modifiers: procParts.slice(2).filter(Boolean),
        chargedAmount: Number.parseFloat(p[2] ?? '0') || 0,
        paidAmount: Number.parseFloat(p[3] ?? '0') || 0,
        adjustments: [],
      });
    }
  }
  if (currentClaim) claims.push(currentClaim);

  return {
    fileName,
    receivedAt,
    checkOrEftNumber,
    paymentDate,
    payeeNpi,
    totalPaid: totalPaid || claims.reduce((s, c) => s + c.paidAmount, 0),
    claims,
    raw835: payload,
  };
}
