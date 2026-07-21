import { loadNctracksConfig } from '../config';
import { postCoreSoap } from './httpsPost';

describe('postCoreSoap', () => {
  it('rejects before network I/O when mTLS client credentials are missing', async () => {
    const config = loadNctracksConfig({});

    await expect(postCoreSoap(
      'https://edi.example.com/CORE/Eligibility',
      '<soap:Envelope />',
      config,
    )).rejects.toThrow(/requires NCTRACKS_CLIENT_CERT and NCTRACKS_CLIENT_KEY/);
  });
});
