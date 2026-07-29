/** Minimal 999 functional acknowledgment parser. */
import type { Ack999 } from '../types';

export function parse999(payload: string): Ack999 {
  const segments = payload.split(/[~\n\r]+/).filter(Boolean);
  let accepted = true;
  const errors: Ack999['errors'] = [];

  for (const seg of segments) {
    const p = seg.split('*');
    if (p[0] === 'AK9') {
      accepted = p[1] === 'A';
    } else if (p[0] === 'IK3' || p[0] === 'IK4') {
      errors.push({
        segment: p[1] ?? p[0],
        element: p[2],
        code: p[3] ?? 'unknown',
        description: p[4] ?? 'Segment validation error',
      });
    }
  }

  if (!accepted && errors.length === 0) {
    errors.push({ segment: 'AK9', code: 'R', description: 'Functional acknowledgment rejected' });
  }

  return { accepted, errors, raw: payload };
}
