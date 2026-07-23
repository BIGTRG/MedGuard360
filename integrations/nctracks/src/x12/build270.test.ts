import { loadNctracksConfig } from '../config';
import type { EligibilityRequest } from '../types';
import { build270ForNctracks } from './build270';

function splitSegments(x12: string): string[] {
  return x12.split(/[~\n\r]+/).filter(Boolean);
}

describe('build270ForNctracks', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-11T12:34:56.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds a deterministic NCTracks 270 with request identifiers and dates', () => {
    const config = loadNctracksConfig({
      NCTRACKS_SUBMITTER_ID: 'TP123456',
      NCTRACKS_RECEIVER_ID: 'NCXIX',
      NCTRACKS_BILLING_NPI: '1234567890',
      NCTRACKS_USAGE_INDICATOR: 'T',
    });
    const request: EligibilityRequest = {
      subscriberId: 'NCMD00100007',
      dateOfService: '2026-05-22',
      serviceTypeCodes: ['98', '30'],
      providerNpi: '1098765432',
      firstName: 'JANE',
      lastName: 'DOE',
      dob: '1980-03-04',
      traceId: 'TRACE-270-1',
    };

    const segments = splitSegments(build270ForNctracks(request, config, '42'));

    expect(segments).toContain('GS*HS*TP123456*NCXIX*20260711*1234*42*X*005010X279A1');
    expect(segments).toContain('BHT*0022*13*TRACE-270-1*20260711*1234');
    expect(segments).toContain('NM1*1P*2*PROVIDER*****XX*1098765432');
    expect(segments).toContain('NM1*IL*1*DOE*JANE****MI*NCMD00100007');
    expect(segments).toContain('DMG*D8*19800304*U');
    expect(segments).toContain('DTP*291*D8*20260522');
    expect(segments).toContain('EQ*98');
    expect(segments).toContain('IEA*1*000000042');
  });

  it('reports the actual ST-through-SE transaction segment count', () => {
    const config = loadNctracksConfig({});
    const request: EligibilityRequest = {
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-11',
      traceId: 'TRACE-COUNT',
    };

    const segments = splitSegments(build270ForNctracks(request, config, '7'));
    const stIndex = segments.findIndex((segment) => segment.startsWith('ST*'));
    const seIndex = segments.findIndex((segment) => segment.startsWith('SE*'));

    expect(stIndex).toBeGreaterThanOrEqual(0);
    expect(seIndex).toBeGreaterThan(stIndex);
    expect(segments[seIndex]).toBe(`SE*${seIndex - stIndex + 1}*0001`);
  });

  it('falls back to billing NPI, current service date, default DOB, and generated trace id', () => {
    const config = loadNctracksConfig({
      NCTRACKS_BILLING_NPI: '1234567890',
    });

    const segments = splitSegments(build270ForNctracks({
      subscriberId: 'NCMD00100001',
      dateOfService: '',
    }, config, '8'));

    expect(segments).toContain('BHT*0022*13*MG-1783773296000*20260711*1234');
    expect(segments).toContain('NM1*1P*2*PROVIDER*****XX*1234567890');
    expect(segments).toContain('DMG*D8*19700101*U');
    expect(segments).toContain('DTP*291*D8*20260711');
    expect(segments).toContain('EQ*30');
  });
});
