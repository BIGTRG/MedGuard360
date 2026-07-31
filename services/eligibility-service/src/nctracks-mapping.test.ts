import {
  createNctracksAdapter,
  type EligibilityResponse,
  type NctracksAdapter,
  type NctracksMode,
} from '@medguard360/nctracks';
import { recordEligibilityX12Audit } from './nctracks-audit';
import { lookupNctracks } from './nctracks';

jest.mock('@medguard360/nctracks', () => ({
  createNctracksAdapter: jest.fn(),
}));

jest.mock('./nctracks-audit', () => ({
  recordEligibilityX12Audit: jest.fn(),
}));

const createAdapterMock = jest.mocked(createNctracksAdapter);
const recordAuditMock = jest.mocked(recordEligibilityX12Audit);

function makeAdapter(mode: NctracksMode, response: EligibilityResponse): jest.Mocked<NctracksAdapter> {
  return {
    mode,
    checkEligibility: jest.fn<
      ReturnType<NctracksAdapter['checkEligibility']>,
      Parameters<NctracksAdapter['checkEligibility']>
    >().mockResolvedValue(response),
    submitClaim: jest.fn<
      ReturnType<NctracksAdapter['submitClaim']>,
      Parameters<NctracksAdapter['submitClaim']>
    >(),
    getClaimStatus: jest.fn<
      ReturnType<NctracksAdapter['getClaimStatus']>,
      Parameters<NctracksAdapter['getClaimStatus']>
    >(),
    retrieveRemittances: jest.fn<
      ReturnType<NctracksAdapter['retrieveRemittances']>,
      Parameters<NctracksAdapter['retrieveRemittances']>
    >(),
    pollAcks: jest.fn<
      ReturnType<NctracksAdapter['pollAcks']>,
      Parameters<NctracksAdapter['pollAcks']>
    >(),
    healthCheck: jest.fn<
      ReturnType<NctracksAdapter['healthCheck']>,
      Parameters<NctracksAdapter['healthCheck']>
    >(),
  };
}

describe('lookupNctracks response mapping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    recordAuditMock.mockResolvedValue();
  });

  it('prefers managed-care plan details and service type 30 copay for active members', async () => {
    const response: EligibilityResponse = {
      status: 'active',
      benefitPlan: 'STANDARD_PLAN:HEALTHY_BLUE',
      managedCareEnrollment: {
        planName: 'Healthy Blue',
        planId: 'PHP_HEALTHY_BLUE',
        effectiveDate: '2024-01-01',
        carveOut: 'none',
      },
      coverageDetails: [
        { serviceTypeCode: '88', coverageLevel: 'IND', copay: 3, inNetwork: true },
        { serviceTypeCode: '30', coverageLevel: 'IND', copay: 1.25, inNetwork: true },
      ],
      raw271: '271-active',
      traceId: 'TRACE-ACTIVE',
    };
    createAdapterMock.mockReturnValue(makeAdapter('stub', response));

    const result = await lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'NCMD00100007',
      patientFirstName: 'Jane',
      patientLastName: 'Doe',
    });

    expect(result).toMatchObject({
      active: true,
      effectiveFrom: '2024-01-01',
      planName: 'Healthy Blue',
      copayCents: 125,
      source: 'nctracks_270_271',
    });
    expect(result.raw).toMatchObject({
      mode: 'stub',
      traceId: 'TRACE-ACTIVE',
      benefitPlan: 'STANDARD_PLAN:HEALTHY_BLUE',
      managedCareEnrollment: response.managedCareEnrollment,
    });
    expect(recordAuditMock).toHaveBeenCalledWith({
      subscriberId: 'NCMD00100007',
      traceId: 'TRACE-ACTIVE',
      adapterMode: 'stub',
      raw271: '271-active',
    });
  });

  it('returns inactive coverage while preserving AAA rejection metadata', async () => {
    const response: EligibilityResponse = {
      status: 'error',
      coverageDetails: [],
      aaaRejection: { code: '75', followUpAction: 'C' },
      raw271: '271-aaa',
      traceId: 'TRACE-AAA',
    };
    createAdapterMock.mockReturnValue(makeAdapter('soap', response));

    const result = await lookupNctracks({
      stateCode: 'NC',
      payerId: 'NCXIX',
      medicaidId: 'NCMD00100999',
    });

    expect(result.active).toBe(false);
    expect(result.planName).toBe('NC Medicaid');
    expect(result.copayCents).toBe(0);
    expect(result.raw).toMatchObject({
      mode: 'soap',
      status: 'error',
      aaaRejection: { code: '75', followUpAction: 'C' },
      raw271: '271-aaa',
    });
    expect(recordAuditMock).toHaveBeenCalledWith({
      subscriberId: 'NCMD00100999',
      traceId: 'TRACE-AAA',
      adapterMode: 'soap',
      raw271: '271-aaa',
    });
  });
});
