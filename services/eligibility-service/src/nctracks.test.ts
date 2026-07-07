import type { EligibilityRequest, EligibilityResponse } from '@medguard360/nctracks';
import { lookupNctracks, shouldUseNctracks } from './nctracks';

const mockCheckEligibility = jest.fn<Promise<EligibilityResponse>, [EligibilityRequest]>();

jest.mock('@medguard360/nctracks', () => ({
  createNctracksAdapter: jest.fn(() => ({
    mode: 'stub',
    checkEligibility: mockCheckEligibility,
  })),
}));

const activeEligibilityResponse: EligibilityResponse = {
  status: 'active',
  benefitPlan: 'MEDICAID',
  coverageDetails: [
    { serviceTypeCode: '30', coverageLevel: 'IND', copay: 0, inNetwork: true },
  ],
  raw271: 'ISA*00*stub~',
  traceId: 'TRACE-NC-001',
};

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.NCTRACKS_MODE;
  delete process.env.MEDGUARD_BILLING_NPI;
  mockCheckEligibility.mockResolvedValue(activeEligibilityResponse);
});

describe('shouldUseNctracks', () => {
  it('routes NC to NCTracks by default', () => {
    expect(shouldUseNctracks('NC')).toBe(true);
  });

  it('skips non-NC states', () => {
    expect(shouldUseNctracks('GA')).toBe(false);
  });

  it('respects NCTRACKS_MODE=disabled', () => {
    process.env.NCTRACKS_MODE = 'disabled';
    expect(shouldUseNctracks('NC')).toBe(false);
    delete process.env.NCTRACKS_MODE;
  });
});

describe('lookupNctracks', () => {
  it('returns active coverage for standard Medicaid IDs', async () => {
    const result = await lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'NCMD00100001',
      patientFirstName: 'Jane',
      patientLastName: 'Doe',
    });
    expect(result.active).toBe(true);
    expect(result.source).toBe('nctracks_270_271');
    expect(result.raw.source).toBe('nctracks');
    expect(result.raw.mode).toBe('stub');
  });

  it('returns inactive for IDs ending in 9', async () => {
    mockCheckEligibility.mockResolvedValueOnce({
      status: 'inactive',
      coverageDetails: [],
      raw271: 'ISA*00*inactive~',
      traceId: 'TRACE-NC-INACTIVE',
    });

    const result = await lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'NCMD00100009',
    });
    expect(result.active).toBe(false);
  });

  it('sends patient identity and billing NPI details to the NCTracks adapter', async () => {
    process.env.MEDGUARD_BILLING_NPI = '1987654321';

    await lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'NCMD00100007',
      patientFirstName: 'Jane',
      patientLastName: 'Doe',
      patientDateOfBirth: '1985-04-12',
    });

    expect(mockCheckEligibility).toHaveBeenCalledWith(expect.objectContaining({
      subscriberId: 'NCMD00100007',
      firstName: 'Jane',
      lastName: 'Doe',
      dob: '1985-04-12',
      providerNpi: '1987654321',
    }));
    expect(mockCheckEligibility.mock.calls[0][0].traceId).toMatch(/^MG360-NC-\d+$/);
    expect(mockCheckEligibility.mock.calls[0][0].dateOfService).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('maps managed-care plan, effective dates, and health-benefit copay from 271 data', async () => {
    mockCheckEligibility.mockResolvedValueOnce({
      status: 'active',
      benefitPlan: 'STANDARD_PLAN:HEALTHY_BLUE',
      managedCareEnrollment: {
        planName: 'Healthy Blue',
        planId: 'PHP_HEALTHY_BLUE',
        effectiveDate: '2024-01-01',
        termDate: '2026-12-31',
        carveOut: 'none',
      },
      coverageDetails: [
        { serviceTypeCode: '88', coverageLevel: 'IND', copay: 3, inNetwork: true },
        { serviceTypeCode: '30', coverageLevel: 'IND', copay: 1.25, inNetwork: true },
      ],
      raw271: 'ISA*00*managed-care~',
      traceId: 'TRACE-NC-MCO',
    });

    const result = await lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'NCMD00100007',
    });

    expect(result).toEqual(expect.objectContaining({
      active: true,
      effectiveFrom: '2024-01-01',
      effectiveTo: '2026-12-31',
      planName: 'Healthy Blue',
      copayCents: 125,
      deductibleRemainingCents: 0,
      source: 'nctracks_270_271',
    }));
    expect(result.raw).toEqual(expect.objectContaining({
      benefitPlan: 'STANDARD_PLAN:HEALTHY_BLUE',
      managedCareEnrollment: expect.objectContaining({ planId: 'PHP_HEALTHY_BLUE' }),
      raw271: 'ISA*00*managed-care~',
    }));
  });

  it('preserves AAA rejection details while returning inactive coverage', async () => {
    mockCheckEligibility.mockResolvedValueOnce({
      status: 'error',
      coverageDetails: [],
      aaaRejection: { code: '75', followUpAction: 'C' },
      raw271: 'ISA*00*aaa-reject~',
      traceId: 'TRACE-NC-AAA',
    });

    const result = await lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'BADMEM999',
    });

    expect(result.active).toBe(false);
    expect(result.planName).toBe('NC Medicaid');
    expect(result.copayCents).toBe(0);
    expect(result.raw).toEqual(expect.objectContaining({
      aaaRejection: { code: '75', followUpAction: 'C' },
      status: 'error',
      traceId: 'TRACE-NC-AAA',
      payer_id: 'NCXIX',
    }));
  });
});