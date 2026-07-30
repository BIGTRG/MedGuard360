import { loadNctracksConfig } from '../config';
import { build270ForNctracks } from './build270';
import { parse271 } from './parse271';

describe('parse271', () => {
  it('keeps AAA rejections inactive even when later EB rows report active coverage', () => {
    const parsed = parse271([
      'ST*271*0001*005010X279A1~',
      'AAA*N**75*C~',
      'EB*1*IND*30**MEDICAID~',
      'SE*4*0001~',
    ].join(''));

    expect(parsed.active).toBe(false);
    expect(parsed.aaaCode).toBe('75');
  });

  it('does not mark health-plan eligibility active from non-health-plan EB rows', () => {
    const parsed = parse271([
      'ST*271*0001*005010X279A1~',
      'EB*6*IND*30~',
      'EB*1*IND*88**PHARMACY~',
      'SE*4*0001~',
    ].join(''));

    expect(parsed.active).toBe(false);
  });
});

describe('build270ForNctracks', () => {
  it('sets SE01 to the ST-through-SE segment count', () => {
    const config = loadNctracksConfig({ NCTRACKS_MODE: 'stub' });
    const payload = build270ForNctracks({
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-30',
      firstName: 'Jane',
      lastName: 'Doe',
      dob: '1980-01-01',
      traceId: 'TRACE-1',
    }, config, '42');

    const segments = payload.split(/[~\n\r]+/).filter(Boolean);
    const stIndex = segments.findIndex((segment) => segment.startsWith('ST*'));
    const seSegment = segments.find((segment) => segment.startsWith('SE*'));
    expect(seSegment).toBeDefined();

    const seCount = Number.parseInt(seSegment?.split('*')[1] ?? '', 10);
    expect(seCount).toBe(segments.slice(stIndex, segments.indexOf(seSegment ?? '') + 1).length);
  });
});
