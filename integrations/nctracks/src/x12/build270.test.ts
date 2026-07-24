import { loadNctracksConfig } from '../config';
import { build270ForNctracks } from './build270';
import type { EligibilityRequest } from '../types';

function baseRequest(overrides: Partial<EligibilityRequest> = {}): EligibilityRequest {
  return {
    subscriberId: 'NCMD00100001',
    dateOfService: '2026-07-24',
    firstName: 'JANE',
    lastName: 'DOE',
    dob: '1980-02-03',
    providerNpi: '1234567890',
    serviceTypeCodes: ['30', '98'],
    traceId: 'TRACE-270-001',
    ...overrides,
  };
}

function splitSegments(x12: string): string[] {
  return x12.split(/[~\n\r]+/).filter(Boolean);
}

describe('build270ForNctracks', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-24T10:15:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds a deterministic 270 with NCTracks trading partner identifiers', () => {
    const config = loadNctracksConfig({
      NCTRACKS_SUBMITTER_ID: 'TP12345',
      NCTRACKS_RECEIVER_ID: 'NCXIX',
      NCTRACKS_BILLING_NPI: '9876543210',
      NCTRACKS_USAGE_INDICATOR: 'T',
    });

    const x12 = build270ForNctracks(baseRequest(), config, '42');
    const segments = splitSegments(x12);

    expect(segments[0]).toBe('ISA*00*          *00*          *ZZ*TP12345        *ZZ*NCXIX          *260724*1015*^*00501*000000042*0*T*:');
    expect(segments).toContain('GS*HS*TP12345*NCXIX*20260724*1015*42*X*005010X279A1');
    expect(segments).toContain('BHT*0022*13*TRACE-270-001*20260724*1015');
    expect(segments).toContain('NM1*1P*2*PROVIDER*****XX*1234567890');
    expect(segments).toContain('NM1*IL*1*DOE*JANE****MI*NCMD00100001');
    expect(segments).toContain('DMG*D8*19800203*U');
    expect(segments).toContain('DTP*291*D8*20260724');
    expect(segments).toContain('EQ*30');
    expect(segments).toContain('IEA*1*000000042');
  });

  it('keeps SE01 aligned with the ST-through-SE transaction segment count', () => {
    const x12 = build270ForNctracks(baseRequest(), loadNctracksConfig({}), '7');
    const segments = splitSegments(x12);
    const stIndex = segments.findIndex((segment) => segment.startsWith('ST*'));
    const seIndex = segments.findIndex((segment) => segment.startsWith('SE*'));

    expect(stIndex).toBeGreaterThanOrEqual(0);
    expect(seIndex).toBeGreaterThan(stIndex);

    const seElements = segments[seIndex].split('*');
    const declaredSegmentCount = Number.parseInt(seElements[1], 10);
    expect(declaredSegmentCount).toBe(seIndex - stIndex + 1);
  });

  it('falls back to configured billing NPI and current service date when optional request fields are absent', () => {
    const config = loadNctracksConfig({ NCTRACKS_BILLING_NPI: '2222222222' });
    const x12 = build270ForNctracks(
      baseRequest({
        dateOfService: '',
        dob: undefined,
        firstName: undefined,
        lastName: undefined,
        providerNpi: undefined,
      }),
      config,
      '5',
    );
    const segments = splitSegments(x12);

    expect(segments).toContain('NM1*1P*2*PROVIDER*****XX*2222222222');
    expect(segments).toContain('NM1*IL*1*UNKNOWN*UNKNOWN****MI*NCMD00100001');
    expect(segments).toContain('DMG*D8*19700101*U');
    expect(segments).toContain('DTP*291*D8*20260724');
  });
});
