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
      // TODO: implement NctracksSoapAdapter — CAQH CORE 2.2.0 over mTLS HTTPS.
      // Required reading: integrations/nctracks/spec.md §2.5 + README.md §2-4.
      // Module layout target: src/transport/coreSoap.ts + src/x12/{builder,parser}.ts.
      throw new Error(
        `NCTRACKS_MODE='soap' is not yet implemented. ` +
          `Stub mode satisfies the same NctracksAdapter interface; flip env back to 'stub' ` +
          `or implement NctracksSoapAdapter in integrations/nctracks/src/soap.ts. ` +
          `See integrations/nctracks/README.md §2-4 for the GDIT onboarding checklist.`,
      );

    case 'sftp':
      // TODO: implement NctracksSftpAdapter — ssh2-sftp-client batch transport.
      // Required reading: integrations/nctracks/spec.md §3.batch + README.md §2.
      // Real-mode needs: control-number persistence (Postgres seq),
      //                  filename watermarking for 835 polling,
      //                  cert/key rotation hot-reload.
      throw new Error(
        `NCTRACKS_MODE='sftp' is not yet implemented. ` +
          `Stub mode satisfies the same NctracksAdapter interface; flip env back to 'stub' ` +
          `or implement NctracksSftpAdapter in integrations/nctracks/src/sftp.ts. ` +
          `See integrations/nctracks/README.md §2-4 for the GDIT onboarding checklist.`,
      );

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
export { loadNctracksConfig, NctracksConfigError } from './config';
