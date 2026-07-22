import { createNctracksAdapter } from './index';
import { loadNctracksConfig } from './config';

describe('createNctracksAdapter factory', () => {
  it('returns a stub adapter when mode=stub (default)', () => {
    const a = createNctracksAdapter({ envSource: {} });
    expect(a.mode).toBe('stub');
  });

  it('passes config through when explicitly provided', () => {
    const cfg = loadNctracksConfig({});
    const a = createNctracksAdapter({ config: cfg });
    expect(a.mode).toBe('stub');
  });

  it('returns soap adapter when mode=soap and credentials are configured', () => {
    const a = createNctracksAdapter({
      envSource: {
        NCTRACKS_MODE: 'soap',
        NCTRACKS_REALTIME_ELIGIBILITY_URL: 'https://edi.example.com/CORE/Eligibility',
        NCTRACKS_CLIENT_CERT: 'cert',
        NCTRACKS_CLIENT_KEY:  'key',
      },
    });
    expect(a.mode).toBe('soap');
  });

  it('returns sftp adapter when mode=sftp and SFTP config is present', () => {
    const a = createNctracksAdapter({
      envSource: {
        NCTRACKS_MODE: 'sftp',
        NCTRACKS_BATCH_SFTP_HOST: 'sftp.example.com',
        NCTRACKS_BATCH_SFTP_USER: 'user',
        NCTRACKS_SFTP_PRIVATE_KEY: '-----PRIVATE KEY-----',
      },
    });
    expect(a.mode).toBe('sftp');
  });

  it('returns live adapter when mode=live has SOAP and SFTP config', () => {
    const a = createNctracksAdapter({
      envSource: {
        NCTRACKS_MODE: 'live',
        NCTRACKS_REALTIME_ELIGIBILITY_URL: 'https://edi.example.com/CORE/Eligibility',
        NCTRACKS_CLIENT_CERT: 'cert',
        NCTRACKS_CLIENT_KEY: 'key',
        NCTRACKS_BATCH_SFTP_HOST: 'sftp.example.com',
        NCTRACKS_BATCH_SFTP_USER: 'user',
        NCTRACKS_SFTP_PRIVATE_KEY: '-----PRIVATE KEY-----',
      },
    });
    expect(a.mode).toBe('live');
  });
});
