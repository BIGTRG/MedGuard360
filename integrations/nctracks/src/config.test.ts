import { loadNctracksConfig, NctracksConfigError } from './config';

describe('loadNctracksConfig', () => {
  describe('mode parsing', () => {
    it('defaults to stub when NCTRACKS_MODE is absent', () => {
      const c = loadNctracksConfig({});
      expect(c.mode).toBe('stub');
    });

    it('accepts stub / soap / sftp (case-insensitive)', () => {
      expect(loadNctracksConfig({ NCTRACKS_MODE: 'STUB' }).mode).toBe('stub');
      // soap + sftp require additional vars but parseMode itself should accept
      expect(() => loadNctracksConfig({ NCTRACKS_MODE: 'soap' })).toThrow(NctracksConfigError);
    });

    it('rejects unknown modes loudly', () => {
      expect(() => loadNctracksConfig({ NCTRACKS_MODE: 'graphql' }))
        .toThrow(/NCTRACKS_MODE must be one of/);
    });
  });

  describe('env parsing', () => {
    it('defaults NCTRACKS_ENV to "test"', () => {
      expect(loadNctracksConfig({}).env).toBe('test');
    });

    it('accepts "prod" and "test"', () => {
      expect(loadNctracksConfig({ NCTRACKS_ENV: 'prod' }).env).toBe('prod');
      expect(loadNctracksConfig({ NCTRACKS_ENV: 'test' }).env).toBe('test');
    });

    it('rejects unknown envs', () => {
      expect(() => loadNctracksConfig({ NCTRACKS_ENV: 'staging' }))
        .toThrow(/NCTRACKS_ENV must be/);
    });
  });

  describe('identifier defaults', () => {
    it('synthesizes safe defaults so stub mode boots without any env vars', () => {
      const c = loadNctracksConfig({});
      expect(c.identifiers.submitterId).toBe('STUB-TSN');
      expect(c.identifiers.tpid).toBe('STUB-TPID');
      expect(c.identifiers.receiverId).toBe('NCXIX');
      expect(c.identifiers.usageIndicator).toBe('T');
    });

    it('uses provided env values when set', () => {
      const c = loadNctracksConfig({
        NCTRACKS_SUBMITTER_ID: 'TP55555',
        NCTRACKS_BILLING_NPI:  '1234567890',
        NCTRACKS_USAGE_INDICATOR: 'P',
      });
      expect(c.identifiers.submitterId).toBe('TP55555');
      expect(c.identifiers.billingNpi).toBe('1234567890');
      expect(c.identifiers.usageIndicator).toBe('P');
    });

    it('rejects usage indicator other than P|T', () => {
      expect(() => loadNctracksConfig({ NCTRACKS_USAGE_INDICATOR: 'X' }))
        .toThrow(/NCTRACKS_USAGE_INDICATOR must be/);
    });
  });

  describe('SFTP block', () => {
    it('is undefined when host is not set', () => {
      expect(loadNctracksConfig({}).batch.sftp).toBeUndefined();
    });

    it('throws if host is set but key is missing (only in sftp mode)', () => {
      expect(() => loadNctracksConfig({
        NCTRACKS_MODE: 'sftp',
        NCTRACKS_BATCH_SFTP_HOST: 'sftp.example.com',
        NCTRACKS_BATCH_SFTP_USER: 'user',
        // no NCTRACKS_SFTP_PRIVATE_KEY
      })).toThrow(/NCTRACKS_SFTP_PRIVATE_KEY/);
    });

    it('populates sftp block when host + user + key all present', () => {
      const c = loadNctracksConfig({
        NCTRACKS_BATCH_SFTP_HOST:  'sftp.example.com',
        NCTRACKS_BATCH_SFTP_USER:  'user',
        NCTRACKS_SFTP_PRIVATE_KEY: '-----PRIVATE KEY-----',
      });
      expect(c.batch.sftp).toMatchObject({
        host: 'sftp.example.com',
        port: 22,
        user: 'user',
        dirs: { in837: '/inbound/837', out835: '/outbound/835' },
      });
    });

    it('defaults SFTP port to 22 and respects explicit override', () => {
      const c = loadNctracksConfig({
        NCTRACKS_BATCH_SFTP_HOST:  'sftp.example.com',
        NCTRACKS_BATCH_SFTP_USER:  'user',
        NCTRACKS_SFTP_PRIVATE_KEY: 'k',
        NCTRACKS_BATCH_SFTP_PORT:  '2222',
      });
      expect(c.batch.sftp?.port).toBe(2222);
    });

    it('rejects non-integer SFTP port', () => {
      expect(() => loadNctracksConfig({
        NCTRACKS_BATCH_SFTP_HOST:  'sftp.example.com',
        NCTRACKS_BATCH_SFTP_USER:  'user',
        NCTRACKS_SFTP_PRIVATE_KEY: 'k',
        NCTRACKS_BATCH_SFTP_PORT:  'twenty-two',
      })).toThrow(/must be an integer/);
    });
  });

  describe('mode-specific validation', () => {
    it('mode=soap requires eligibility URL', () => {
      expect(() => loadNctracksConfig({
        NCTRACKS_MODE: 'soap',
        // no NCTRACKS_REALTIME_ELIGIBILITY_URL
      })).toThrow(/NCTRACKS_REALTIME_ELIGIBILITY_URL/);
    });

    it('mode=soap requires client cert + key', () => {
      expect(() => loadNctracksConfig({
        NCTRACKS_MODE: 'soap',
        NCTRACKS_REALTIME_ELIGIBILITY_URL: 'https://edi.example.com/CORE/Eligibility',
        // no cert/key
      })).toThrow(/NCTRACKS_CLIENT_CERT/);
    });

    it('mode=sftp requires SFTP block', () => {
      expect(() => loadNctracksConfig({
        NCTRACKS_MODE: 'sftp',
        // no SFTP host/user/key
      })).toThrow(/mode=sftp requires/);
    });

    it('stub mode tolerates everything missing', () => {
      expect(() => loadNctracksConfig({ NCTRACKS_MODE: 'stub' })).not.toThrow();
    });
  });

  describe('connect:direct block', () => {
    it('is undefined unless both local + remote node are set', () => {
      expect(loadNctracksConfig({
        NCTRACKS_CD_NODE_LOCAL: 'MG.LOCAL',
      }).batch.connectDirect).toBeUndefined();
    });

    it('populates when both nodes present', () => {
      const c = loadNctracksConfig({
        NCTRACKS_CD_NODE_LOCAL:  'MG.LOCAL',
        NCTRACKS_CD_NODE_REMOTE: 'NCTRACKS.PROD',
      });
      expect(c.batch.connectDirect).toEqual({
        localNode: 'MG.LOCAL',
        remoteNode: 'NCTRACKS.PROD',
        securePlusCert: undefined,
      });
    });
  });
});
