/** Minimal 277 claim status response parser. */
import type { ClaimStatus } from '../types';

export interface Parsed277 {
  status: ClaimStatus;
  categoryCode: string;
  statusCode: string;
  payerClaimControlNumber?: string;
  paidAmount?: number;
  checkNumber?: string;
  paymentDate?: string;
}

function isoFromYmd(raw?: string): string | undefined {
  if (!raw || raw.length !== 8) return undefined;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function mapStatus(categoryCode: string, statusCode: string): ClaimStatus {
  const cat = categoryCode.toUpperCase();
  const code = statusCode;
  if (cat.startsWith('F1') || code === '65' || code === '107') return 'paid';
  if (cat.startsWith('F2') || code === '24' || code === '27') return 'denied';
  if (cat.startsWith('A3') || code === '19') return 'in_process';
  if (cat.startsWith('A1') || code === '20') return 'pending';
  if (cat.startsWith('A0')) return 'pending';
  return 'unknown';
}

export function parse277(payload: string): Parsed277 {
  const segments = payload.split(/[~\n\r]+/).filter(Boolean);
  const out: Parsed277 = { status: 'unknown', categoryCode: '', statusCode: '' };

  for (const seg of segments) {
    const p = seg.split('*');
    if (p[0] === 'STC') {
      const [categoryCode, statusCode] = (p[1] ?? '').split(':');
      out.categoryCode = categoryCode ?? '';
      out.statusCode = statusCode ?? '';
      out.status = mapStatus(out.categoryCode, out.statusCode);
      const payDate = isoFromYmd(p[2]);
      if (payDate) out.paymentDate = payDate;
      if (p[4]) out.payerClaimControlNumber = p[4];
    } else if (p[0] === 'REF' && p[1] === '1K' && p[2]) {
      out.payerClaimControlNumber = p[2];
    } else if (p[0] === 'REF' && p[1] === 'CK' && p[2]) {
      out.checkNumber = p[2];
    } else if (p[0] === 'AMT' && p[1] === 'AU' && p[2]) {
      out.paidAmount = Number.parseFloat(p[2]) || undefined;
    }
  }

  return out;
}