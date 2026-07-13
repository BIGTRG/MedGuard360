import { NctracksSoapAdapter, NctracksTransportError } from './soap-adapter';
import { postCoreSoap } from './transport/httpsPost';
import type { ClaimSubmitRequest, NctracksConfig } from './types';

jest.mock('./transport/httpsPost', () => ({
  postCoreSoap: jest.fn(),
}));

const mockedPostCoreSoap = postCoreSoap as jest.MockedFunction<typeof postCoreSoap>;

const config: NctracksConfig = {
  mode: 'soap',
  env: 'test',
  realtime: {
    eligibilityUrl: 'https://edi.example.com/CORE/Eligibility',
    claimStatusUrl: 'https://edi.example.com/CORE/ClaimStatus',
    timeoutMs: 30_000,
  },
  batch: {},
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
  patientControlNumber: 'PCN-SOAP',
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

describe('NctracksSoapAdapter.checkEligibility', () => {
  beforeEach(() => {
    mockedPostCoreSoap.mockReset();
  });

  it('maps active 271 coverage into eligibility response fields', async () => {
    mockedPostCoreSoap.mockResolvedValue([
      '<cor:COREEnvelopePayload>',
      'EB*1*IND*30**NC MEDICAID DIRECT*23*2.5~',
      '</cor:COREEnvelopePayload>',
    ].join(''));

    const response = await new NctracksSoapAdapter(config).checkEligibility({
      subscriberId: 'NCMD00100007',
      dateOfService: '2026-07-10',
      providerNpi: '1234567890',
      firstName: 'Ada',
      lastName: 'Lovelace',
      dob: '1980-02-03',
      traceId: 'TRACE-270',
    });

    expect(mockedPostCoreSoap).toHaveBeenCalledWith(
      config.realtime.eligibilityUrl,
      expect.stringContaining('<cor:PayloadID>TRACE-270</cor:PayloadID>'),
      config,
    );
    expect(response).toEqual({
      status: 'active',
      benefitPlan: 'NC MEDICAID DIRECT',
      coverageDetails: [{
        serviceTypeCode: '30',
        coverageLevel: 'IND',
        copay: 2.5,
        inNetwork: true,
      }],
      aaaRejection: undefined,
      raw271: 'EB*1*IND*30**NC MEDICAID DIRECT*23*2.5~',
      traceId: 'TRACE-270',
    });
  });

  it('maps AAA rejection responses to error status for human review', async () => {
    mockedPostCoreSoap.mockResolvedValue(
      '<COREEnvelopePayload>AAA*N**72*C~</COREEnvelopePayload>',
    );

    const response = await new NctracksSoapAdapter(config).checkEligibility({
      subscriberId: 'NCMD00100008',
      dateOfService: '2026-07-10',
      traceId: 'TRACE-AAA',
    });

    expect(response.status).toBe('error');
    expect(response.aaaRejection).toEqual({ code: '72', followUpAction: 'C' });
    expect(response.coverageDetails).toEqual([]);
    expect(response.traceId).toBe('TRACE-AAA');
  });

  it('throws explicit transport errors for batch and scaffolded operations', async () => {
    const adapter = new NctracksSoapAdapter(config);

    await expect(adapter.submitClaim(claim)).rejects.toThrow(NctracksTransportError);
    await expect(adapter.getClaimStatus({
      patientControlNumber: 'PCN-SOAP',
      subscriberId: 'NCMD00100007',
    })).rejects.toThrow(/276\/277 SOAP transport scaffolded/);
    await expect(adapter.retrieveRemittances()).rejects.toThrow(/835 retrieval requires SFTP/);
    await expect(adapter.pollAcks('2026-07-01')).rejects.toThrow(/999\/277CA polling requires SFTP/);
    await expect(adapter.healthCheck()).resolves.toEqual({ realtimeOk: true, sftpOk: false });
  });
});
