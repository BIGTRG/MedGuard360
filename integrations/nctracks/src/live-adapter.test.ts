import { NctracksLiveAdapter } from './live-adapter';
import { postCoreSoap } from './transport/httpsPost';
import type { ClaimSubmitRequest, NctracksConfig } from './types';

jest.mock('./transport/httpsPost', () => ({
  postCoreSoap: jest.fn(),
}));

const mockedPostCoreSoap = postCoreSoap as jest.MockedFunction<typeof postCoreSoap>;

const config: NctracksConfig = {
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
      keyPem: 'private-key',
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
    receiverId: 'RECEIVER',
    receiverQualifier: 'ZZ',
    billingNpi: '9876543210',
    billingTaxonomy: '207Q00000X',
    usageIndicator: 'T',
  },
  auth: {
    clientCertPem: 'cert',
    clientKeyPem: 'key',
  },
};

const claim: ClaimSubmitRequest = {
  claimType: 'professional',
  patientControlNumber: 'PCN-LIVE',
  totalCharge: 125,
  subscriberId: 'NCMD00100007',
  serviceDateFrom: '2026-07-10',
  serviceDateTo: '2026-07-10',
  diagnoses: [{ code: 'F41.1', system: 'ICD10CM' }],
  lines: [{
    procedureCode: '90834',
    units: 1,
    charge: 125,
    serviceDate: '2026-07-10',
    diagnosisPointers: [1],
  }],
};

describe('NctracksLiveAdapter', () => {
  beforeEach(() => {
    mockedPostCoreSoap.mockReset();
  });

  it('delegates real-time eligibility checks to SOAP transport', async () => {
    mockedPostCoreSoap.mockResolvedValue(
      '<COREEnvelopePayload>EB*1*IND*30**NC MEDICAID DIRECT*23*0~</COREEnvelopePayload>',
    );

    const response = await new NctracksLiveAdapter(config).checkEligibility({
      subscriberId: 'NCMD00100007',
      dateOfService: '2026-07-10',
      traceId: 'TRACE-LIVE',
    });

    expect(response.status).toBe('active');
    expect(response.traceId).toBe('TRACE-LIVE');
    expect(mockedPostCoreSoap).toHaveBeenCalledTimes(1);
  });

  it('delegates batch and scaffolded operations to the expected transport paths', async () => {
    const adapter = new NctracksLiveAdapter(config);

    await expect(adapter.submitClaim(claim)).rejects.toThrow(/SFTP upload to sftp.example.com/);
    await expect(adapter.getClaimStatus({
      patientControlNumber: 'PCN-LIVE',
      subscriberId: 'NCMD00100007',
    })).rejects.toThrow(/276\/277 SOAP transport scaffolded/);
    await expect(adapter.retrieveRemittances()).rejects.toThrow(/835 SFTP poll/);
    await expect(adapter.pollAcks('2026-07-01')).rejects.toThrow(/999\/277CA SFTP poll/);
    await expect(adapter.healthCheck()).resolves.toEqual({ realtimeOk: true, sftpOk: true });
  });
});
