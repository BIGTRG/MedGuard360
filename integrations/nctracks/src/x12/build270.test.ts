import { loadNctracksConfig } from '../config';
import type { EligibilityRequest } from '../types';
import { build270ForNctracks } from './build270';

function segments(x12: string): string[][] {
  return x12
    .split(/[~\n\r]+/)
    .filter(Boolean)
    .map((segment) => segment.split('*'));
}

function segmentById(x12Segments: string[][], id: string): string[] {
  const segment = x12Segments.find((candidate) => candidate[0] === id);
  if (!segment) {
    throw new Error(`Missing X12 segment ${id}`);
  }
  return segment;
}

describe('build270ForNctracks', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-11T12:34:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function request(overrides: Partial<EligibilityRequest> = {}): EligibilityRequest {
    return {
      subscriberId: 'NCMD00100007',
      dateOfService: '2026-05-22',
      serviceTypeCodes: ['88', '30'],
      firstName: 'JANE',
      lastName: 'DOE',
      dob: '1980-04-05',
      traceId: 'TRACE-270-1',
      ...overrides,
    };
  }

  it('builds deterministic NCTracks 270 identifiers and request demographics', () => {
    const config = loadNctracksConfig({
      NCTRACKS_SUBMITTER_ID: 'TP12345',
      NCTRACKS_RECEIVER_ID: 'NCXIX',
      NCTRACKS_BILLING_NPI: '1234567890',
      NCTRACKS_USAGE_INDICATOR: 'T',
    });

    const parsed = segments(build270ForNctracks(request(), config, '42'));

    expect(segmentById(parsed, 'ISA')).toEqual([
      'ISA', '00', '          ', '00', '          ',
      'ZZ', 'TP12345        ', 'ZZ', 'NCXIX          ',
      '260711', '1234', '^', '00501', '000000042', '0', 'T', ':',
    ]);
    expect(segmentById(parsed, 'GS')).toEqual([
      'GS', 'HS', 'TP12345', 'NCXIX', '20260711', '1234', '42', 'X', '005010X279A1',
    ]);
    expect(segmentById(parsed, 'BHT')).toEqual([
      'BHT', '0022', '13', 'TRACE-270-1', '20260711', '1234',
    ]);
    expect(segmentById(parsed, 'NM1')).toEqual([
      'NM1', 'PR', '2', 'NC MEDICAID', '', '', '', '', 'PI', 'NCXIX',
    ]);
    expect(parsed).toContainEqual([
      'NM1', '1P', '2', 'PROVIDER', '', '', '', '', 'XX', '1234567890',
    ]);
    expect(parsed).toContainEqual([
      'NM1', 'IL', '1', 'DOE', 'JANE', '', '', '', 'MI', 'NCMD00100007',
    ]);
    expect(segmentById(parsed, 'DMG')).toEqual(['DMG', 'D8', '19800405', 'U']);
    expect(segmentById(parsed, 'DTP')).toEqual(['DTP', '291', 'D8', '20260522']);
    expect(segmentById(parsed, 'EQ')).toEqual(['EQ', '88']);
  });

  it('uses the provider NPI override when present', () => {
    const config = loadNctracksConfig({
      NCTRACKS_BILLING_NPI: '1234567890',
    });

    const parsed = segments(build270ForNctracks(
      request({ providerNpi: '1098765432' }),
      config,
      '7',
    ));

    expect(parsed).toContainEqual([
      'NM1', '1P', '2', 'PROVIDER', '', '', '', '', 'XX', '1098765432',
    ]);
  });

  it('sets SE01 to the ST-through-SE transaction segment count', () => {
    const config = loadNctracksConfig({});
    const parsed = segments(build270ForNctracks(request(), config, '123'));

    const stIndex = parsed.findIndex((segment) => segment[0] === 'ST');
    const seIndex = parsed.findIndex((segment) => segment[0] === 'SE');
    const se = segmentById(parsed, 'SE');
    const transactionSegmentCount = parsed.slice(stIndex, seIndex + 1).length;

    expect(stIndex).toBeGreaterThanOrEqual(0);
    expect(seIndex).toBeGreaterThan(stIndex);
    expect(Number.parseInt(se[1], 10)).toBe(transactionSegmentCount);
    expect(se[2]).toBe('0001');
  });
});
