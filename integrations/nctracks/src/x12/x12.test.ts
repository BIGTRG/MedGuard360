import { loadNctracksConfig } from '../config';
import type { EligibilityRequest, NctracksConfig } from '../types';
import { build270ForNctracks } from './build270';
import { parse271 } from './parse271';

function testConfig(): NctracksConfig {
  return loadNctracksConfig({
    NCTRACKS_SUBMITTER_ID: 'TP123456789',
    NCTRACKS_SUBMITTER_QUALIFIER: 'ZZ',
    NCTRACKS_RECEIVER_ID: 'NCXIX',
    NCTRACKS_RECEIVER_QUALIFIER: 'ZZ',
    NCTRACKS_BILLING_NPI: '1234567893',
    NCTRACKS_USAGE_INDICATOR: 'T',
  });
}

function baseEligibilityRequest(overrides: Partial<EligibilityRequest> = {}): EligibilityRequest {
  return {
    subscriberId: 'NCMD00123456',
    dateOfService: '2026-07-15',
    serviceTypeCodes: ['98', '30'],
    firstName: 'JANE',
    lastName: 'DOE',
    dob: '1981-04-05',
    traceId: 'TRACE-270-1',
    ...overrides,
  };
}

function segmentRows(x12: string): string[][] {
  return x12.split(/[~\n\r]+/).filter(Boolean).map((segment) => segment.split('*'));
}

function findSegment(rows: string[][], id: string, qualifier?: string): string[] {
  const row = rows.find((candidate) => candidate[0] === id && (qualifier === undefined || candidate[1] === qualifier));
  if (!row) {
    throw new Error(`Missing segment ${id}${qualifier ? `*${qualifier}` : ''}`);
  }
  return row;
}

describe('build270ForNctracks', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-15T13:45:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('maps eligibility request fields into the NCTracks 270 envelope', () => {
    const rows = segmentRows(build270ForNctracks(baseEligibilityRequest(), testConfig(), '42'));

    expect(findSegment(rows, 'ISA')).toMatchObject([
      'ISA',
      '00',
      '          ',
      '00',
      '          ',
      'ZZ',
      'TP123456789    ',
      'ZZ',
      'NCXIX          ',
    ]);
    expect(findSegment(rows, 'ISA')[13]).toBe('000000042');
    expect(findSegment(rows, 'ISA')[15]).toBe('T');
    expect(findSegment(rows, 'GS')).toEqual([
      'GS',
      'HS',
      'TP123456789',
      'NCXIX',
      '20260715',
      '1345',
      '42',
      'X',
      '005010X279A1',
    ]);
    expect(findSegment(rows, 'BHT')[3]).toBe('TRACE-270-1');
    expect(findSegment(rows, 'NM1', '1P')[9]).toBe('1234567893');
    expect(findSegment(rows, 'NM1', 'IL')).toEqual([
      'NM1',
      'IL',
      '1',
      'DOE',
      'JANE',
      '',
      '',
      '',
      'MI',
      'NCMD00123456',
    ]);
    expect(findSegment(rows, 'DMG')).toEqual(['DMG', 'D8', '19810405', 'U']);
    expect(findSegment(rows, 'DTP')).toEqual(['DTP', '291', 'D8', '20260715']);
    expect(findSegment(rows, 'EQ')).toEqual(['EQ', '98']);
  });

  it('reports the transaction-set segment count from ST through SE', () => {
    const rows = segmentRows(build270ForNctracks(baseEligibilityRequest(), testConfig(), '7'));

    const stIndex = rows.findIndex((row) => row[0] === 'ST');
    const seIndex = rows.findIndex((row) => row[0] === 'SE');
    const se = findSegment(rows, 'SE');

    expect(stIndex).toBeGreaterThanOrEqual(0);
    expect(seIndex).toBeGreaterThan(stIndex);
    expect(se[1]).toBe(String(seIndex - stIndex + 1));
    expect(se[2]).toBe('0001');
  });

  it('uses safe NCTracks defaults when optional member fields are omitted', () => {
    const rows = segmentRows(build270ForNctracks(baseEligibilityRequest({
      dateOfService: '',
      serviceTypeCodes: undefined,
      firstName: undefined,
      lastName: undefined,
      dob: undefined,
      traceId: undefined,
      providerNpi: '1999999999',
    }), testConfig(), '8'));

    expect(findSegment(rows, 'BHT')[3]).toBe('MG-1784123100000');
    expect(findSegment(rows, 'NM1', '1P')[9]).toBe('1999999999');
    expect(findSegment(rows, 'NM1', 'IL')[3]).toBe('UNKNOWN');
    expect(findSegment(rows, 'NM1', 'IL')[4]).toBe('UNKNOWN');
    expect(findSegment(rows, 'DMG')).toEqual(['DMG', 'D8', '19700101', 'U']);
    expect(findSegment(rows, 'DTP')).toEqual(['DTP', '291', 'D8', '20260715']);
    expect(findSegment(rows, 'EQ')).toEqual(['EQ', '30']);
  });
});

describe('parse271', () => {
  it('parses active benefits, date spans, plan names, and copays', () => {
    const parsed = parse271([
      'ISA*00*',
      'EB*1*IND*30**NC MEDICAID PLAN**20.00',
      'DTP*291*D8*20260701',
      'DTP*292*D8*20260731',
      'SE*5*0001',
    ].join('~'));

    expect(parsed).toEqual({
      active: true,
      planName: 'NC MEDICAID PLAN',
      effectiveFrom: '2026-07-01',
      effectiveTo: '2026-07-31',
      copay: 20,
    });
  });

  it('keeps AAA rejections non-active even when benefit segments also appear', () => {
    const parsed = parse271([
      'AAA*N**72*C',
      'EB*1*IND*30**NC MEDICAID PLAN**0',
    ].join('~'));

    expect(parsed.active).toBe(false);
    expect(parsed.aaaCode).toBe('72');
    expect(parsed.planName).toBe('NC MEDICAID PLAN');
  });
});
