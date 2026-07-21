import { loadNctracksConfig } from './config';
import { NctracksLiveAdapter } from './live-adapter';
import { NctracksSftpAdapter } from './sftp-adapter';
import { NctracksSoapAdapter } from './soap-adapter';
import type {
  Ack277CA,
  Ack999,
  ClaimStatusResponse,
  ClaimSubmitRequest,
  ClaimSubmitResult,
  EligibilityRequest,
  EligibilityResponse,
  NctracksConfig,
  RemittanceFile,
} from './types';

function makeLiveConfig(): NctracksConfig {
  return loadNctracksConfig({
    NCTRACKS_MODE: 'live',
    NCTRACKS_REALTIME_ELIGIBILITY_URL: 'https://edi.example.com/CORE/Eligibility',
    NCTRACKS_CLIENT_CERT: 'cert',
    NCTRACKS_CLIENT_KEY: 'key',
    NCTRACKS_BATCH_SFTP_HOST: 'sftp.example.com',
    NCTRACKS_BATCH_SFTP_USER: 'user',
    NCTRACKS_SFTP_PRIVATE_KEY: '-----PRIVATE KEY-----',
  });
}

const eligibilityRequest: EligibilityRequest = {
  subscriberId: 'NCMD00100001',
  dateOfService: '2026-07-21',
  traceId: 'TRACE-LIVE-001',
};

const eligibilityResponse: EligibilityResponse = {
  status: 'active',
  benefitPlan: 'NC MEDICAID',
  coverageDetails: [],
  raw271: 'ST*271*0001~EB*1*IND*30*MC*NC MEDICAID~SE*3*0001~',
  traceId: 'TRACE-LIVE-001',
};

const claimRequest: ClaimSubmitRequest = {
  claimType: 'professional',
  patientControlNumber: 'PCN-LIVE-001',
  totalCharge: 100,
  subscriberId: 'NCMD00100001',
  serviceDateFrom: '2026-07-21',
  serviceDateTo: '2026-07-21',
  diagnoses: [{ code: 'G44.1', system: 'ICD10CM' }],
  lines: [{
    procedureCode: '99213',
    units: 1,
    charge: 100,
    serviceDate: '2026-07-21',
    diagnosisPointers: [1],
  }],
};

const claimResult: ClaimSubmitResult = {
  interchangeControlNumber: 'ISA000000001',
  groupControlNumber: 'GS000000001',
  transactionSetControlNumber: 'ST0001',
  fileName: 'mg360_P_000000001.837',
  submittedAt: '2026-07-21T10:00:00.000Z',
};

const claimStatusResponse: ClaimStatusResponse = {
  status: 'pending',
  categoryCode: 'A1',
  statusCode: '20',
  raw277: 'ST*277*0001~SE*2*0001~',
};

const remittanceFile: RemittanceFile = {
  fileName: '835-demo.edi',
  receivedAt: '2026-07-21T10:00:00.000Z',
  checkOrEftNumber: 'CHK123',
  paymentDate: '2026-07-21',
  payeeNpi: '1234567890',
  totalPaid: 100,
  claims: [],
  raw835: 'ISA*00*~ST*835*0001~SE*2*0001~',
};

const ack999: Ack999 = {
  accepted: true,
  errors: [],
  raw: 'ST*999*0001~SE*2*0001~',
};

const ack277CA: Ack277CA = {
  status: 'accepted',
  perClaim: [],
  raw: 'ST*277*0001~SE*2*0001~',
};

describe('NctracksLiveAdapter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('delegates realtime eligibility and claim status to SOAP transport', async () => {
    const checkEligibility = jest.spyOn(NctracksSoapAdapter.prototype, 'checkEligibility')
      .mockResolvedValue(eligibilityResponse);
    const getClaimStatus = jest.spyOn(NctracksSoapAdapter.prototype, 'getClaimStatus')
      .mockResolvedValue(claimStatusResponse);

    const adapter = new NctracksLiveAdapter(makeLiveConfig());

    await expect(adapter.checkEligibility(eligibilityRequest))
      .resolves.toBe(eligibilityResponse);
    await expect(adapter.getClaimStatus({
      patientControlNumber: 'PCN-LIVE-001',
      subscriberId: 'NCMD00100001',
    })).resolves.toBe(claimStatusResponse);
    expect(checkEligibility).toHaveBeenCalledWith(eligibilityRequest);
    expect(getClaimStatus).toHaveBeenCalledWith({
      patientControlNumber: 'PCN-LIVE-001',
      subscriberId: 'NCMD00100001',
    });
  });

  it('delegates batch submission, remittance retrieval, and ack polling to SFTP transport', async () => {
    const submitClaim = jest.spyOn(NctracksSftpAdapter.prototype, 'submitClaim')
      .mockResolvedValue(claimResult);
    const retrieveRemittances = jest.spyOn(NctracksSftpAdapter.prototype, 'retrieveRemittances')
      .mockResolvedValue([remittanceFile]);
    const pollAcks = jest.spyOn(NctracksSftpAdapter.prototype, 'pollAcks')
      .mockResolvedValue({ ack999: [ack999], ack277CA: [ack277CA] });

    const adapter = new NctracksLiveAdapter(makeLiveConfig());

    await expect(adapter.submitClaim(claimRequest)).resolves.toBe(claimResult);
    await expect(adapter.retrieveRemittances({ since: '2026-07-01' }))
      .resolves.toEqual([remittanceFile]);
    await expect(adapter.pollAcks('2026-07-01T00:00:00.000Z'))
      .resolves.toEqual({ ack999: [ack999], ack277CA: [ack277CA] });
    expect(submitClaim).toHaveBeenCalledWith(claimRequest);
    expect(retrieveRemittances).toHaveBeenCalledWith({ since: '2026-07-01' });
    expect(pollAcks).toHaveBeenCalledWith('2026-07-01T00:00:00.000Z');
  });

  it('combines SOAP and SFTP health checks for production mode readiness', async () => {
    jest.spyOn(NctracksSoapAdapter.prototype, 'healthCheck')
      .mockResolvedValue({ realtimeOk: true, sftpOk: false });
    jest.spyOn(NctracksSftpAdapter.prototype, 'healthCheck')
      .mockResolvedValue({ realtimeOk: false, sftpOk: true });

    await expect(new NctracksLiveAdapter(makeLiveConfig()).healthCheck())
      .resolves.toEqual({ realtimeOk: true, sftpOk: true });
  });
});
