import { NctracksLiveAdapter } from './live-adapter';
import { NctracksSftpAdapter } from './sftp-adapter';
import { NctracksSoapAdapter } from './soap-adapter';
import type {
  ClaimStatusRequest,
  ClaimStatusResponse,
  ClaimSubmitRequest,
  ClaimSubmitResult,
  EligibilityRequest,
  EligibilityResponse,
  NctracksConfig,
} from './types';

function liveConfig(): NctracksConfig {
  return {
    mode: 'live',
    env: 'test',
    realtime: {
      eligibilityUrl: 'https://edi.example.com/CORE/Eligibility',
      claimStatusUrl: 'https://edi.example.com/CORE/ClaimStatus',
      timeoutMs: 30_000,
    },
    batch: {
      sftp: {
        host: 'sftp.example.com',
        port: 22,
        user: 'trading-partner',
        keyPem: '-----PRIVATE KEY-----',
        dirs: {
          in837: '/inbound/837',
          out835: '/outbound/835',
          out999: '/outbound/999',
          out277ca: '/outbound/277CA',
        },
      },
    },
    identifiers: {
      tpid: 'TPID',
      submitterId: 'SUBMITTER',
      submitterQualifier: 'ZZ',
      receiverId: 'NCXIX',
      receiverQualifier: 'ZZ',
      billingNpi: '1234567890',
      billingTaxonomy: '207Q00000X',
      usageIndicator: 'T',
    },
    auth: {
      clientCertPem: 'cert',
      clientKeyPem: 'key',
    },
  };
}

function claimRequest(): ClaimSubmitRequest {
  return {
    claimType: 'professional',
    patientControlNumber: 'PCN-001',
    totalCharge: 125,
    subscriberId: 'NCMD00100001',
    serviceDateFrom: '2026-07-01',
    serviceDateTo: '2026-07-01',
    diagnoses: [{ code: 'Z00.00', system: 'ICD10CM' }],
    lines: [{
      procedureCode: '99213',
      units: 1,
      charge: 125,
      serviceDate: '2026-07-01',
      diagnosisPointers: [1],
    }],
  };
}

describe('NctracksLiveAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('delegates real-time operations to SOAP and batch operations to SFTP', async () => {
    const eligibilityRequest: EligibilityRequest = {
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-01',
      traceId: 'TRACE-001',
    };
    const eligibilityResponse: EligibilityResponse = {
      status: 'active',
      coverageDetails: [],
      raw271: 'ISA*271~',
      traceId: 'TRACE-001',
    };
    const claim = claimRequest();
    const claimResult: ClaimSubmitResult = {
      interchangeControlNumber: '000000001',
      groupControlNumber: '1',
      transactionSetControlNumber: '0001',
      fileName: 'mg360_P_000000001.edi',
      submittedAt: '2026-07-01T00:00:00.000Z',
    };
    const statusRequest: ClaimStatusRequest = {
      patientControlNumber: 'PCN-001',
      subscriberId: 'NCMD00100001',
    };
    const statusResponse: ClaimStatusResponse = {
      status: 'pending',
      categoryCode: 'A1',
      statusCode: '20',
      raw277: 'ISA*277~',
    };

    const checkEligibility = jest
      .spyOn(NctracksSoapAdapter.prototype, 'checkEligibility')
      .mockResolvedValue(eligibilityResponse);
    const getClaimStatus = jest
      .spyOn(NctracksSoapAdapter.prototype, 'getClaimStatus')
      .mockResolvedValue(statusResponse);
    const submitClaim = jest
      .spyOn(NctracksSftpAdapter.prototype, 'submitClaim')
      .mockResolvedValue(claimResult);
    const retrieveRemittances = jest
      .spyOn(NctracksSftpAdapter.prototype, 'retrieveRemittances')
      .mockResolvedValue([]);
    const pollAcks = jest
      .spyOn(NctracksSftpAdapter.prototype, 'pollAcks')
      .mockResolvedValue({ ack999: [], ack277CA: [] });

    const adapter = new NctracksLiveAdapter(liveConfig());

    await expect(adapter.checkEligibility(eligibilityRequest)).resolves.toBe(eligibilityResponse);
    await expect(adapter.submitClaim(claim)).resolves.toBe(claimResult);
    await expect(adapter.getClaimStatus(statusRequest)).resolves.toBe(statusResponse);
    await expect(adapter.retrieveRemittances({ since: '2026-07-01' })).resolves.toEqual([]);
    await expect(adapter.pollAcks('2026-07-01')).resolves.toEqual({ ack999: [], ack277CA: [] });

    expect(checkEligibility).toHaveBeenCalledWith(eligibilityRequest);
    expect(submitClaim).toHaveBeenCalledWith(claim);
    expect(getClaimStatus).toHaveBeenCalledWith(statusRequest);
    expect(retrieveRemittances).toHaveBeenCalledWith({ since: '2026-07-01' });
    expect(pollAcks).toHaveBeenCalledWith('2026-07-01');
  });

  it('combines SOAP and SFTP health checks', async () => {
    jest
      .spyOn(NctracksSoapAdapter.prototype, 'healthCheck')
      .mockResolvedValue({ realtimeOk: true, sftpOk: false });
    jest
      .spyOn(NctracksSftpAdapter.prototype, 'healthCheck')
      .mockResolvedValue({ realtimeOk: false, sftpOk: true });

    await expect(new NctracksLiveAdapter(liveConfig()).healthCheck()).resolves.toEqual({
      realtimeOk: true,
      sftpOk: true,
    });
  });
});
