/** Minimal 277CA claim acknowledgment parser. */
import type { Ack277CA } from '../types';

function isoFromYmd(raw?: string): string | undefined {
  if (!raw || raw.length !== 8) return undefined;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

export function parse277CA(payload: string): Ack277CA {
  const segments = payload.split(/[~\n\r]+/).filter(Boolean);
  const perClaim: Ack277CA['perClaim'] = [];

  for (const seg of segments) {
    const p = seg.split('*');
    if (p[0] !== 'STC') continue;
    const [rawCategoryCode, statusCode] = (p[1] ?? '').split(':');
    const categoryCode = rawCategoryCode?.toUpperCase() ?? '';
    const pcn = p[4] ?? p[3] ?? '';
    const claimStatus = /^(A3|A4|A6|A7|A8)/.test(categoryCode) ? 'rejected' : 'accepted';
    perClaim.push({
      patientControlNumber: pcn,
      status: claimStatus,
      categoryCode,
      statusCode: statusCode ?? '',
      entityCode: p[2],
    });
    void isoFromYmd(p[2]);
  }

  if (perClaim.length === 0) {
    return { status: 'rejected', perClaim: [], raw: payload };
  }
  const rejectedCount = perClaim.filter((c) => c.status === 'rejected').length;
  let status: Ack277CA['status'] = 'partial';
  if (rejectedCount === 0) {
    status = 'accepted';
  } else if (rejectedCount === perClaim.length) {
    status = 'rejected';
  }
  return { status, perClaim, raw: payload };
}
