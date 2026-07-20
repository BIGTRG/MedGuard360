import { NctracksLiveAdapter } from './live-adapter';
import { NctracksSftpAdapter } from './sftp-adapter';
import { postCoreSoap } from './transport/httpsPost';
import type {
  ClaimSubmitRequest,
  EligibilityRequest,
  NctracksConfig,
} from './types';

jest.mock('./transport/httpsPost', () => ({
  postCoreSoap: jest.fn(),
}));

const mockPostCoreSoap = jest.mocked(postCoreSoap);

const liveConfig: NctracksConfig = {
  mode: 'live',
  env: 'test',
  realtime: {
    eligibilityUrl: 'https://edi.example.test/core/eligibility',
    claimStatusUrl: 'https://edi.example.test/core/status',
    timeoutMs: 10_000,
  },
  batch: {
    sftp: {
      host: 'sftp.example.test',
      port: 22,
      user: 'trading-partner',
      keyPem: 'test-private-key',
      dirs: {
        in837: '/inbound/837',
        out835: '/outbound/835',
        out999: '/outbound/999',
        out277ca: '/outbound/277CA',
      },
    },
  },
  identifiers: {
    tpid: 'TPID-TEST',
    submitterId: 'SUBMITTER01',
    submitterQualifier: 'ZZ',
    receiverId: 'NCXIX',
    receiverQualifier: 'ZZ',
    billingNpi: '1111111111',
    billingTaxonomy: '207Q00000X',
    usageIndicator: 'T',
  },
  auth: {
    clientCertPem: 'test-cert',
    clientKeyPem: 'test-key',
  },
};

const eligibilityRequest: EligibilityRequest = {
  subscriberId: 'NCMD00100001',
  dateOfService: '2026-07-20',
  traceId: 'TRACE-LIVE-001',
};

const claimRequest: ClaimSubmitRequest = {
  claimType: 'professional',
  patientControlNumber: 'PCN-001',
  totalCharge: 100,
  subscriberId: 'NCMD00100001',
  serviceDateFrom: '2026-07-20',
  serviceDateTo: '2026-07-20',
  diagnoses: [{ code: 'G44.1', system: 'ICD10CM' }],
  lines: [{
    procedureCode: '99213',
    units: 1,
    charge: 100,
    serviceDate: '2026-07-20',
    diagnosisPointers: [1],
  }],
};

function coreResponse(x12Payload: string): string {
  return `<cor:COREEnvelopePayload>${x12Payload}</cor:COREEnvelopePayload>`;
}

describe('NctracksLiveAdapter', () => {
  beforeEach(() => {
    mockPostCoreSoap.mockReset();
  });

  it('delegates real-time eligibility to SOAP and batch health to SFTP', async () => {
    mockPostCoreSoap.mockResolvedValue(
      coreResponse('ISA*00*~ST*271*0001~EB*1**30**NC MEDICAID**0~SE*3*0001~'),
    );

    const adapter = new NctracksLiveAdapter(liveConfig);

    await expect(adapter.checkEligibility(eligibilityRequest)).resolves.toMatchObject({
      status: 'active',
      benefitPlan: 'NC MEDICAID',
      traceId: 'TRACE-LIVE-001',
    });
    expect(mockPostCoreSoap).toHaveBeenCalledWith(
      liveConfig.realtime.eligibilityUrl,
      expect.stringContaining('<cor:PayloadType>270</cor:PayloadType>'),
      liveConfig,
    );
    await expect(adapter.healthCheck()).resolves.toEqual({ realtimeOk: true, sftpOk: true });
  });

  it('delegates batch operations to the SFTP scaffold and preserves loud failures', async () => {
    const adapter = new NctracksLiveAdapter(liveConfig);

    await expect(adapter.submitClaim(claimRequest))
      .rejects.toThrow('SFTP upload to sftp.example.test not yet connected');
    await expect(adapter.retrieveRemittances())
      .rejects.toThrow('835 SFTP poll not yet implemented');
    await expect(adapter.pollAcks())
      .rejects.toThrow('999/277CA SFTP poll not yet implemented');
  });

  it('keeps claim-status on the SOAP scaffold until endpoint details are confirmed', async () => {
    const adapter = new NctracksLiveAdapter(liveConfig);

    await expect(adapter.getClaimStatus({
      patientControlNumber: 'PCN-001',
      subscriberId: 'NCMD00100001',
    })).rejects.toThrow('276/277 SOAP transport scaffolded');
  });
});

describe('NctracksSftpAdapter', () => {
  it('rejects construction without SFTP credentials', () => {
    const missingSftpConfig: NctracksConfig = {
      ...liveConfig,
      mode: 'sftp',
      batch: {},
    };

    expect(() => new NctracksSftpAdapter(missingSftpConfig))
      .toThrow('NCTRACKS_MODE=sftp requires NCTRACKS_BATCH_SFTP_HOST and credentials');
  });

  it('keeps real-time operations on SOAP mode', async () => {
    const adapter = new NctracksSftpAdapter({ ...liveConfig, mode: 'sftp' });

    await expect(adapter.checkEligibility(eligibilityRequest))
      .rejects.toThrow('270/271 requires SOAP');
    await expect(adapter.getClaimStatus({
      patientControlNumber: 'PCN-001',
      subscriberId: 'NCMD00100001',
    })).rejects.toThrow('276/277 requires SOAP');
    await expect(adapter.healthCheck()).resolves.toEqual({ realtimeOk: false, sftpOk: true });
  });
});
