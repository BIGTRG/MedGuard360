import { loadNctracksConfig } from '../config';
import type { EligibilityRequest } from '../types';
import { build270ForNctracks } from './build270';

function segments(x12: string): string[] {
  return x12.split(/[~\n\r]+/).filter(Boolean);
}

function segment(x12: string, prefix: string): string {
  const found = segments(x12).find((s) => s.startsWith(`${prefix}*`));
  if (!found) {
    throw new Error(`Missing ${prefix} segment in ${x12}`);
  }
  return found;
}

describe('build270ForNctracks', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-19T13:24:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function makeRequest(overrides: Partial<EligibilityRequest> = {}): EligibilityRequest {
    return {
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-19',
      firstName: 'Jane',
      lastName: 'Doe',
      dob: '1975-01-02',
      providerNpi: '1234567890',
      traceId: 'TRACE-270',
      ...overrides,
    };
  }

  it('normalizes service and birth dates into X12 D8 format', () => {
    const x12 = build270ForNctracks(makeRequest(), loadNctracksConfig({}), '42');

    expect(segment(x12, 'DMG')).toBe('DMG*D8*19750102*U');
    expect(segment(x12, 'DTP')).toBe('DTP*291*D8*20260719');
  });

  it('uses deterministic defaults for missing dates and service type', () => {
    const x12 = build270ForNctracks(
      makeRequest({ dateOfService: '', dob: undefined, serviceTypeCodes: [] }),
      loadNctracksConfig({}),
      '42',
    );

    expect(segment(x12, 'DMG')).toBe('DMG*D8*19700101*U');
    expect(segment(x12, 'DTP')).toBe('DTP*291*D8*20260719');
    expect(segment(x12, 'EQ')).toBe('EQ*30');
  });

  it('pads interchange control number and ISA sender/receiver identifiers', () => {
    const config = loadNctracksConfig({
      NCTRACKS_SUBMITTER_ID: 'SUBMITTER-IDENTIFIER-LONG',
      NCTRACKS_RECEIVER_ID: 'RECEIVER-IDENTIFIER-LONG',
    });
    const x12 = build270ForNctracks(makeRequest(), config, '42');
    const isa = segment(x12, 'ISA').split('*');

    expect(isa[6]).toBe('SUBMITTER-IDENT');
    expect(isa[6]).toHaveLength(15);
    expect(isa[8]).toBe('RECEIVER-IDENTI');
    expect(isa[8]).toHaveLength(15);
    expect(isa[13]).toBe('000000042');
    expect(segment(x12, 'IEA')).toBe('IEA*1*000000042');
  });

  it('uses caller trace ID and first requested service type code', () => {
    const x12 = build270ForNctracks(
      makeRequest({ serviceTypeCodes: ['98', '30'], traceId: 'CALLER-TRACE' }),
      loadNctracksConfig({}),
      '42',
    );

    expect(segment(x12, 'BHT')).toBe('BHT*0022*13*CALLER-TRACE*20260719*1324');
    expect(segment(x12, 'EQ')).toBe('EQ*98');
  });
});
