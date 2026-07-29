/** Minimal 277CA claim acknowledgment parser. */
import type { Ack277CA } from '../types';

function isoFromYmd(raw?: string): string | undefined {
  if (!raw || raw.length !== 8) return undefined;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

export function parse277CA(payload: string): Ack277CA {
  const segments = payload.split(/[~\n\r]+/).filter(Boolean);
  const perClaim: Ack277CA['perClaim'] = [];
  let status: Ack277CA['status'] = 'accepted';

  for (const seg of segments) {
    const p = seg.split('*');
    if (p[0] !== 'STC') continue;
    const [categoryCode, statusCode] = (p[1] ?? '').split(':');
    const pcn = p[4] ?? p[3] ?? '';
    const claimStatus = categoryCode?.startsWith('A7') ? 'rejected' : 'accepted';
    if (claimStatus === 'rejected') status = perClaim.length ? 'partial' : 'rejected';
    perClaim.push({
      patientControlNumber: pcn,
      status: claimStatus,
      categoryCode: categoryCode ?? '',
      statusCode: statusCode ?? '',
      entityCode: p[2],
    });
    void isoFromYmd(p[2]);
  }

  if (perClaim.length === 0) {
    return { status: 'rejected', perClaim: [], raw: payload };
  }
  if (status !== 'rejected' && perClaim.some((c) => c.status === 'rejected')) {
    status = 'partial';
  }
  return { status, perClaim, raw: payload };
}
