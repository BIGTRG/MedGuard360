/**
 * NCTracks adapter — config loader.
 *
 * Reads `NCTRACKS_*` env vars (or a passed-in env object) and returns a
 * validated `NctracksConfig`. Stub mode tolerates missing secrets; soap/sftp
 * modes require the relevant fields.
 *
 * See `integrations/nctracks/spec.md §1` for the full env-var inventory.
 */

import type { NctracksConfig, NctracksMode, NctracksEnv } from './types';

export class NctracksConfigError extends Error {
  constructor(msg: string) {
    super(`NctracksConfigError: ${msg}`);
    this.name = 'NctracksConfigError';
  }
}

/** Source of values — defaults to `process.env`. Injectable for tests. */
export type EnvSource = Record<string, string | undefined>;

function requireEnv(env: EnvSource, key: string): string {
  const v = env[key];
  if (v === undefined || v === '') {
    throw new NctracksConfigError(`Missing required env var: ${key}`);
  }
  return v;
}

function optional(env: EnvSource, key: string, fallback?: string): string | undefined {
  const v = env[key];
  return v === undefined || v === '' ? fallback : v;
}

function intOpt(env: EnvSource, key: string, fallback: number): number {
  const v = env[key];
  if (v === undefined || v === '') return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) {
    throw new NctracksConfigError(`${key} must be an integer; got "${v}"`);
  }
  return n;
}

function parseMode(env: EnvSource): NctracksMode {
  const raw = (env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  if (raw !== 'stub' && raw !== 'soap' && raw !== 'sftp') {
    throw new NctracksConfigError(
      `NCTRACKS_MODE must be one of: stub | soap | sftp (got "${raw}")`,
    );
  }
  return raw;
}

function parseEnv(env: EnvSource): NctracksEnv {
  const raw = (env.NCTRACKS_ENV ?? 'test').toLowerCase();
  if (raw !== 'prod' && raw !== 'test') {
    throw new NctracksConfigError(`NCTRACKS_ENV must be "prod" or "test" (got "${raw}")`);
  }
  return raw;
}

function parseUsageIndicator(env: EnvSource): 'P' | 'T' {
  const raw = (env.NCTRACKS_USAGE_INDICATOR ?? 'T').toUpperCase();
  if (raw !== 'P' && raw !== 'T') {
    throw new NctracksConfigError(
      `NCTRACKS_USAGE_INDICATOR must be "P" or "T" (got "${raw}")`,
    );
  }
  return raw;
}

/**
 * Load and validate NCTracks config from environment.
 *
 * Stub mode tolerates everything missing — useful for dev / unit tests.
 * Real modes (`soap`, `sftp`) require their respective field groups.
 */
export function loadNctracksConfig(envSource: EnvSource = process.env): NctracksConfig {
  const mode = parseMode(envSource);
  const env = parseEnv(envSource);

  const cfg: NctracksConfig = {
    mode,
    env,
    realtime: {
      eligibilityUrl: optional(envSource, 'NCTRACKS_REALTIME_ELIGIBILITY_URL', '') ?? '',
      claimStatusUrl: optional(envSource, 'NCTRACKS_REALTIME_CLAIMSTATUS_URL', '') ?? '',
      timeoutMs: intOpt(envSource, 'NCTRACKS_REALTIME_TIMEOUT_MS', 30_000),
    },
    batch: {},
    identifiers: {
      tpid:                  optional(envSource, 'NCTRACKS_TPID',                  'STUB-TPID')  ?? 'STUB-TPID',
      submitterId:           optional(envSource, 'NCTRACKS_SUBMITTER_ID',          'STUB-TSN')   ?? 'STUB-TSN',
      submitterQualifier:    optional(envSource, 'NCTRACKS_SUBMITTER_QUALIFIER',   'ZZ')         ?? 'ZZ',
      receiverId:            optional(envSource, 'NCTRACKS_RECEIVER_ID',           'NCXIX')      ?? 'NCXIX',
      receiverQualifier:     optional(envSource, 'NCTRACKS_RECEIVER_QUALIFIER',    'ZZ')         ?? 'ZZ',
      billingNpi:            optional(envSource, 'NCTRACKS_BILLING_NPI',           '0000000000') ?? '0000000000',
      billingTaxonomy:       optional(envSource, 'NCTRACKS_BILLING_TAXONOMY',      '207Q00000X') ?? '207Q00000X',
      atypicalId:            optional(envSource, 'NCTRACKS_ATYPICAL_ID'),
      usageIndicator:        parseUsageIndicator(envSource),
    },
    auth: {
      clientCertPem: optional(envSource, 'NCTRACKS_CLIENT_CERT'),
      clientKeyPem:  optional(envSource, 'NCTRACKS_CLIENT_KEY'),
      caBundlePem:   optional(envSource, 'NCTRACKS_CA_BUNDLE'),
    },
  };

  // SFTP block — only populated when host is set, and required for sftp mode
  const sftpHost = optional(envSource, 'NCTRACKS_BATCH_SFTP_HOST');
  if (sftpHost) {
    cfg.batch.sftp = {
      host: sftpHost,
      port: intOpt(envSource, 'NCTRACKS_BATCH_SFTP_PORT', 22),
      user: requireEnv(envSource, 'NCTRACKS_BATCH_SFTP_USER'),
      keyPem: requireEnv(envSource, 'NCTRACKS_SFTP_PRIVATE_KEY'),
      passphrase: optional(envSource, 'NCTRACKS_SFTP_KEY_PASSPHRASE'),
      dirs: {
        in837:    optional(envSource, 'NCTRACKS_BATCH_SFTP_INBOUND_DIR',         '/inbound/837')    ?? '/inbound/837',
        out835:   optional(envSource, 'NCTRACKS_BATCH_SFTP_OUTBOUND_835_DIR',    '/outbound/835')   ?? '/outbound/835',
        out999:   optional(envSource, 'NCTRACKS_BATCH_SFTP_OUTBOUND_999_DIR',    '/outbound/999')   ?? '/outbound/999',
        out277ca: optional(envSource, 'NCTRACKS_BATCH_SFTP_OUTBOUND_277CA_DIR',  '/outbound/277CA') ?? '/outbound/277CA',
      },
    };
  }

  // Connect:Direct block
  const cdLocal = optional(envSource, 'NCTRACKS_CD_NODE_LOCAL');
  const cdRemote = optional(envSource, 'NCTRACKS_CD_NODE_REMOTE');
  if (cdLocal && cdRemote) {
    cfg.batch.connectDirect = {
      localNode: cdLocal,
      remoteNode: cdRemote,
      securePlusCert: optional(envSource, 'NCTRACKS_CD_SECUREPLUS_CERT'),
    };
  }

  // HTTP Basic for CORE envelope (real-time only)
  const basicUser = optional(envSource, 'NCTRACKS_HTTP_BASIC_USER');
  const basicPass = optional(envSource, 'NCTRACKS_HTTP_BASIC_PASS');
  if (basicUser && basicPass) {
    cfg.auth.httpBasic = { user: basicUser, pass: basicPass };
  }

  // Mode-specific validation
  if (mode === 'soap') {
    if (!cfg.realtime.eligibilityUrl) {
      throw new NctracksConfigError(`mode=soap requires NCTRACKS_REALTIME_ELIGIBILITY_URL`);
    }
    if (!cfg.auth.clientCertPem || !cfg.auth.clientKeyPem) {
      throw new NctracksConfigError(
        `mode=soap requires NCTRACKS_CLIENT_CERT and NCTRACKS_CLIENT_KEY (mTLS)`,
      );
    }
  }
  if (mode === 'sftp') {
    if (!cfg.batch.sftp) {
      throw new NctracksConfigError(
        `mode=sftp requires NCTRACKS_BATCH_SFTP_HOST, NCTRACKS_BATCH_SFTP_USER, NCTRACKS_SFTP_PRIVATE_KEY`,
      );
    }
  }

  return cfg;
}
