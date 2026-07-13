import { NctracksSftpAdapter } from './sftp-adapter';
import { NctracksTransportError } from './soap-adapter';
import type { ClaimSubmitRequest, NctracksConfig } from './types';

const config: NctracksConfig = {
  mode: 'sftp',
  env: 'test',
  realtime: {
    eligibilityUrl: '',
    claimStatusUrl: '',
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
  auth: {},
};

const claim: ClaimSubmitRequest = {
  claimType: 'professional',
  patientControlNumber: 'PCN-1',
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

describe('NctracksSftpAdapter', () => {
  it('fails fast when instantiated without SFTP connection details', () => {
    const missingSftpConfig: NctracksConfig = { ...config, batch: {} };

    expect(() => new NctracksSftpAdapter(missingSftpConfig))
      .toThrow(/requires NCTRACKS_BATCH_SFTP_HOST/);
  });

  it('reports SFTP health from configured host presence', async () => {
    await expect(new NctracksSftpAdapter(config).healthCheck())
      .resolves.toEqual({ realtimeOk: false, sftpOk: true });
  });

  it('throws transport errors for real-time-only and scaffolded batch operations', async () => {
    const adapter = new NctracksSftpAdapter(config);

    await expect(adapter.checkEligibility({
      subscriberId: 'NCMD00100007',
      dateOfService: '2026-07-10',
    })).rejects.toThrow(NctracksTransportError);
    await expect(adapter.submitClaim(claim)).rejects.toThrow(/Claim PCN-1 ready for batch/);
    await expect(adapter.getClaimStatus({
      patientControlNumber: 'PCN-1',
      subscriberId: 'NCMD00100007',
    })).rejects.toThrow(/276\/277 requires SOAP/);
    await expect(adapter.retrieveRemittances()).rejects.toThrow(/835 SFTP poll/);
    await expect(adapter.pollAcks('2026-07-01')).rejects.toThrow(/999\/277CA SFTP poll/);
  });
});
