/**
 * NCTracks adapter — public entrypoint.
 *
 * Factory `createNctracksAdapter()` returns an `NctracksAdapter` whose
 * concrete implementation is picked by `config.mode`:
 *   - 'stub' → NctracksStubAdapter (current default; deterministic in-memory)
 *   - 'soap' → NctracksSoapAdapter (not yet implemented — see TODO below)
 *   - 'sftp' → NctracksSftpAdapter (not yet implemented — see TODO below)
 *
 * Stub mode is wire-compatible with the real modes' interface so consumers
 * (eligibility-service, claims-service, prior-auth-service, credentialing-service)
 * can DI-inject the adapter today and pick up the real transport when the
 * GDIT trading-partner credentials are issued and the soap/sftp branches land.
 *
 * Onboarding to real mode (~4-8 weeks per the README):
 *   1. Email NCMMIS_EDI_Support@gdit.com, request Contact Information Form.
 *   2. Sign Trading Partner Agreement in NCTracks Provider Portal.
 *   3. Receive Trading Partner Logon Name + TSN.
 *   4. Cert in Edifecs Ramp Management for each transaction type.
 *   5. Connectivity round-trip via SOAP/SFTP.
 *   6. Populate NCTRACKS_* env vars (see config.ts) + drop client certs into
 *      /opt/credential-vault/nctracks/.
 *   7. Flip NCTRACKS_MODE=soap or sftp.
 *
 * Usage:
 *
 *   import { createNctracksAdapter } from '@medguard360/nctracks';
 *
 *   const adapter = createNctracksAdapter();         // reads process.env
 *   // or, in a service that loads its own env block:
 *   const adapter = createNctracksAdapter({ envSource });
 *
 *   const elig = await adapter.checkEligibility({
 *     subscriberId: 'NCMD00100007', dateOfService: '2026-05-22',
 *   });
 */

import { loadNctracksConfig, type EnvSource } from './config';
import { NctracksLiveAdapter } from './live-adapter';
import { NctracksSftpAdapter } from './sftp-adapter';
import { NctracksSoapAdapter } from './soap-adapter';
import { NctracksStubAdapter, type StubOptions } from './stub';
import type { NctracksAdapter, NctracksConfig } from './types';

export interface CreateOptions {
  /** Source for env-var lookup. Defaults to `process.env`. */
  envSource?: EnvSource;
  /** Pre-built config — skips env loading. */
  config?: NctracksConfig;
  /** Forwarded to the stub adapter (verbose logging, fake `now`, etc.). */
  stubOptions?: StubOptions;
}

/**
 * Create an NctracksAdapter. Pick the concrete implementation based on
 * `config.mode`. Errors loudly on misconfiguration so the failure surfaces at
 * boot, not at first call.
 */
export function createNctracksAdapter(opts: CreateOptions = {}): NctracksAdapter {
  const config = opts.config ?? loadNctracksConfig(opts.envSource);

  switch (config.mode) {
    case 'stub':
      return new NctracksStubAdapter(config, opts.stubOptions);

    case 'soap':
      return new NctracksSoapAdapter(config);

    case 'sftp':
      return new NctracksSftpAdapter(config);

    case 'live':
      return new NctracksLiveAdapter(config);

    default: {
      const _exhaustive: never = config.mode;
      throw new Error(`Unknown NCTRACKS_MODE: ${_exhaustive}`);
    }
  }
}

// Re-exports for consumers
export type {
  NctracksAdapter,
  NctracksConfig,
  NctracksMode,
  NctracksEnv,
  EligibilityRequest,
  EligibilityResponse,
  EligibilityStatus,
  ClaimType,
  ClaimSubmitRequest,
  ClaimSubmitResult,
  Ack999,
  Ack277CA,
  ClaimStatusRequest,
  ClaimStatusResponse,
  ClaimStatus,
  RemittanceQuery,
  RemittanceFile,
  RemittanceAdjustment,
} from './types';

export { NctracksStubAdapter } from './stub';
export { NctracksSoapAdapter, NctracksTransportError } from './soap-adapter';
export { NctracksSftpAdapter } from './sftp-adapter';
export { NctracksLiveAdapter } from './live-adapter';
export { loadNctracksConfig, NctracksConfigError } from './config';
export { buildCoreSoapEnvelope, extractCoreEnvelopePayload } from './transport/coreSoap';
