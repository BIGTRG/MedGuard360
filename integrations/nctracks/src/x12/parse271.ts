/** Minimal 271 parser for NCTracks eligibility responses. */
export interface Parsed271 {
  active: boolean;
  planName?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  copay?: number;
  aaaCode?: string;
}

export function parse271(payload: string): Parsed271 {
  const segments = payload.split(/[~\n\r]+/).filter(Boolean);
  const out: Parsed271 = { active: false };
  let rejected = false;
  for (const seg of segments) {
    const p = seg.split('*');
    if (p[0] === 'AAA') {
      rejected = true;
      out.active = false;
      out.aaaCode = p[3];
    } else if (p[0] === 'EB') {
      const serviceType = p[3];
      if (serviceType === '30') {
        if (p[1] === '1' && !rejected) out.active = true;
        if (p[1] === '6') out.active = false;
      }
      if (p[5] && !out.planName) out.planName = p[5];
      if (serviceType === '30' && p[7]) out.copay = Number.parseFloat(p[7]);
    } else if (p[0] === 'DTP' && p[2] === 'D8' && p[3]?.length === 8) {
      const iso = `${p[3].slice(0, 4)}-${p[3].slice(4, 6)}-${p[3].slice(6, 8)}`;
      if (p[1] === '291') out.effectiveFrom = iso;
      if (p[1] === '292') out.effectiveTo = iso;
    }
  }
  if (rejected) out.active = false;
  return out;
}