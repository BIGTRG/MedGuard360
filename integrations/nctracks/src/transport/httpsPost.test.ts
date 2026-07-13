import { postCoreSoap } from './httpsPost';
import type { NctracksConfig } from '../types';

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
  auth: {},
};

describe('postCoreSoap', () => {
  it('rejects before network IO when mTLS credentials are missing', async () => {
    await expect(postCoreSoap(
      config.realtime.eligibilityUrl,
      '<soap:Envelope />',
      config,
    )).rejects.toThrow(/requires NCTRACKS_CLIENT_CERT and NCTRACKS_CLIENT_KEY/);
  });
});
