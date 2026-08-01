/**
 * NC Medicaid claim submission via @medguard360/nctracks (837P batch / stub).
 * Persists ICN + ack state to Postgres; polls SFTP for async acks in sftp/live mode.
 */

import {
  createNctracksAdapter,
  type Ack277CA,
  type Ack999,
  type ClaimStatusRequest,
  type ClaimStatusResponse,
  type ClaimSubmitResult,
} from '@medguard360/nctracks';
import { logger, ValidationError } from '@medguard360/shared';
import * as repo from './nctracks-repository';
import {
  nctracksX12ArchiveIntervalMs,
  nctracksX12RetentionYears,
} from './nctracks-x12-archive';
import {
  nctracksBatchFilesIn,
  nctracksBatchFilesOut,
  nctracksAck999RejectTotal,
  observeNctracksRealtime,
} from '@medguard360/shared';

const NC_MEDICAID_PAYER_IDS = new Set([
  'NCXIX',
  'NCTRACKS',
  'NCMEDICAID',
  'NCMEDICAIDDIRECT',
  'NCCHIP',
  'NCHEALTHCHOICE',
  'NCAMERIHEALTH',
  'NCHEALTHYBLUE',
  'NCUHC',
  'NCWELLCARE',
  'NCCAROLINACOMPLETE',
  'NCTRILLIUM',
  'NCVAYA',
  'NCALLIANCE',
  'NCPARTNERS',
  'NCEASTPOINTE',
  'NCSANDHILLS',
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLACEHOLDER_RECIPIENT_IDS = new Set(['UNKNOWN', 'N/A', 'NA', 'NONE', 'NULL', 'UNSET', 'PENDING']);

function normalizePayerId(payerId: string): string {
  return payerId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

export function isKnownNcMedicaidPayer(payerId: string): boolean {
  const normalized = normalizePayerId(payerId);
  return NC_MEDICAID_PAYER_IDS.has(normalized)
    || (normalized.startsWith('NC') && normalized.includes('MEDICAID'));
}

export function isNctracksEnabledForState(stateCode: string): boolean {
  const mode = (process.env.NCTRACKS_MODE ?? 'stub').toLowerCase();
  return stateCode.toUpperCase() === 'NC' && mode !== 'disabled';
}

export function shouldUseNctracks(stateCode: string, payerId?: string): boolean {
  return isNctracksEnabledForState(stateCode) && Boolean(payerId && isKnownNcMedicaidPayer(payerId));
}

export function validateNcMedicaidRecipientId(medicaidId: string): string {
  const trimmed = medicaidId.trim();
  if (!trimmed || PLACEHOLDER_RECIPIENT_IDS.has(trimmed.toUpperCase()) || UUID_RE.test(trimmed)) {
    throw new ValidationError('NCTracks claim submission requires a real NC Medicaid recipient ID');
  }
  return trimmed;
}

export function nctracksPollIntervalMs(): number {
  const raw = process.env.NCTRACKS_POLL_INTERVAL_MS ?? '0';
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export interface NcClaimSubmitInput {
  ccn: string;
  totalCharge: number;
  patientMedicaidId: string;
  serviceDate: string;
  billingNpi: string;
  diagnosisCodes: string[];
  lines: Array<{
    procedure_code: string;
    modifier_codes: string[];
    units: number;
    charge_amount: number;
    service_date: string;
    place_of_service: string;
    diagnosis_pointers: number[];
  }>;
}

function toIsoDate(raw: string): string {
  const d = raw.replace(/-/g, '');
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Date().toISOString().slice(0, 10);
}

/** Map 277CA ack rows by patient control number for SFTP poll reconciliation. */
export function indexAck277ByPcn(acks: Ack277CA[]): Map<string, Ack277CA> {
  const out = new Map<string, Ack277CA>();
  for (const ack of acks) {
    for (const row of ack.perClaim) {
      if (row.patientControlNumber) out.set(row.patientControlNumber, ack);
    }
  }
  return out;
}

export function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

/** CLP02 codes that represent a payable remittance row. */
export function isRemittancePayable(statusCode: string): boolean {
  return ['1', '2', '3', '19', '20', '21'].includes(statusCode);
}

export function assertNctracksSubmissionAccepted(result: ClaimSubmitResult): void {
  if (result.ack999 && !result.ack999.accepted) {
    throw new ValidationError('NCTracks rejected the 837 functional acknowledgment', {
      fileName: result.fileName,
      errors: result.ack999.errors,
    });
  }

  if (result.ack277CA?.status === 'rejected' || result.ack277CA?.perClaim.some((row) => row.status === 'rejected')) {
    throw new ValidationError('NCTracks rejected the claim acknowledgment', {
      fileName: result.fileName,
      status: result.ack277CA.status,
      perClaim: result.ack277CA.perClaim,
    });
  }
}

export async function submitNcClaim(input: NcClaimSubmitInput): Promise<ClaimSubmitResult & { adapterMode: string }> {
  const adapter = createNctracksAdapter();
  const serviceIso = toIsoDate(input.serviceDate);
  const subscriberId = validateNcMedicaidRecipientId(input.patientMedicaidId);

  const result = await adapter.submitClaim({
    claimType: 'professional',
    patientControlNumber: input.ccn,
    totalCharge: input.totalCharge,
    subscriberId,
    serviceDateFrom: serviceIso,
    serviceDateTo: serviceIso,
    billingProvider: {
      npi: input.billingNpi,
      taxonomy: process.env.NCTRACKS_BILLING_TAXONOMY ?? '261Q00000X',
      atypicalId: process.env.NCTRACKS_ATYPICAL_ID,
    },
    renderingProvider: {
      npi: input.billingNpi,
      taxonomy: process.env.NCTRACKS_BILLING_TAXONOMY ?? '261Q00000X',
    },
    diagnoses: input.diagnosisCodes.map((code) => ({ code, system: 'ICD10CM' as const })),
    lines: input.lines.map((line) => ({
      procedureCode: line.procedure_code,
      modifiers: line.modifier_codes.length ? line.modifier_codes : undefined,
      units: line.units,
      charge: line.charge_amount,
      serviceDate: toIsoDate(line.service_date),
      placeOfService: line.place_of_service,
      diagnosisPointers: line.diagnosis_pointers,
    })),
  });

  nctracksBatchFilesOut.inc({ type: '837P' });
  if (result.ack999 && !result.ack999.accepted) {
    nctracksAck999RejectTotal.inc();
  }
  assertNctracksSubmissionAccepted(result);

  logger.info('nctracks claim submit', {
    mode: adapter.mode,
    ccn: input.ccn,
    fileName: result.fileName,
    isa13: result.interchangeControlNumber,
    ack999Accepted: result.ack999?.accepted,
  });

  return { ...result, adapterMode: adapter.mode };
}

export async function recordNctracksSubmission(
  claimId: string,
  patientControlNumber: string,
  result: ClaimSubmitResult,
  adapterMode: string,
  ediPayload?: string,
): Promise<void> {
  try {
    await repo.insertNctracksSubmission(claimId, patientControlNumber, result, adapterMode);
    if (ediPayload) {
      await repo.insertX12Audit({
        claimId,
        direction: 'outbound',
        transactionType: '837P',
        patientControlNumber,
        interchangeControlNumber: result.interchangeControlNumber,
        fileName: result.fileName,
        payload: ediPayload,
        adapterMode,
      });
    }
    if (result.ack999?.raw) {
      await repo.insertX12Audit({
        claimId,
        direction: 'inbound',
        transactionType: '999',
        patientControlNumber,
        payload: result.ack999.raw,
        adapterMode,
      });
    }
    if (result.ack277CA?.raw) {
      await repo.insertX12Audit({
        claimId,
        direction: 'inbound',
        transactionType: '277CA',
        patientControlNumber,
        payload: result.ack277CA.raw,
        adapterMode,
      });
    }
  } catch (err) {
    logger.warn('nctracks submission persist failed (non-fatal)', {
      claimId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function pollNctracksAcks(): Promise<{ polled: number; updated: number }> {
  const adapter = createNctracksAdapter();
  if (adapter.mode !== 'sftp' && adapter.mode !== 'live') {
    return { polled: 0, updated: 0 };
  }

  const pending = await repo.listSubmissionsPendingAck();
  if (!pending.length) return { polled: 0, updated: 0 };

  const since = pending[0]?.submitted_at?.toISOString();
  const { ack999, ack277CA } = await adapter.pollAcks(since);
  if (ack999.length) nctracksBatchFilesIn.inc({ type: '999' }, ack999.length);
  if (ack277CA.length) nctracksBatchFilesIn.inc({ type: '277CA' }, ack277CA.length);
  for (const ack of ack999) {
    if (!ack.accepted) nctracksAck999RejectTotal.inc();
  }
  const byPcn = indexAck277ByPcn(ack277CA);

  let updated = 0;
  for (const sub of pending) {
    const ack277 = byPcn.get(sub.patient_control_number);
    if (!ack277) continue;

    await repo.updateSubmissionAcks(sub.id, ack999[0], ack277);
    if (ack277?.raw) {
      await repo.insertX12Audit({
        claimId: sub.claim_id,
        direction: 'inbound',
        transactionType: '277CA',
        patientControlNumber: sub.patient_control_number,
        payload: ack277.raw,
        adapterMode: adapter.mode,
      });
    }
    if (ack999[0]?.raw) {
      await repo.insertX12Audit({
        claimId: sub.claim_id,
        direction: 'inbound',
        transactionType: '999',
        patientControlNumber: sub.patient_control_number,
        payload: ack999[0].raw,
        adapterMode: adapter.mode,
      });
    }
    updated += 1;
  }

  logger.info('nctracks ack poll complete', { pending: pending.length, updated, ack999: ack999.length, ack277CA: ack277CA.length });
  return { polled: pending.length, updated };
}

export async function pollNctracksRemittances(): Promise<{ files: number; applied: number }> {
  const adapter = createNctracksAdapter();
  if (adapter.mode === 'soap') {
    return { files: 0, applied: 0 };
  }

  const since = await repo.getLastRemittanceWatermark().catch(() => undefined);
  const files = await adapter.retrieveRemittances(since ? { since } : undefined);
  if (files.length) nctracksBatchFilesIn.inc({ type: '835' }, files.length);
  let applied = 0;

  for (const file of files) {
    if (await repo.remittanceFileExists(file.fileName).catch(() => false)) continue;

    const fileId = await repo.insertRemittanceFile({
      fileName: file.fileName,
      checkOrEftNumber: file.checkOrEftNumber,
      paymentDate: file.paymentDate,
      payeeNpi: file.payeeNpi,
      totalPaid: file.totalPaid,
      raw835: file.raw835,
      adapterMode: adapter.mode,
      receivedAt: file.receivedAt,
    });

    await repo.insertX12Audit({
      direction: 'inbound',
      transactionType: '835',
      fileName: file.fileName,
      payload: file.raw835,
      adapterMode: adapter.mode,
    });

    for (const cl of file.claims) {
      const rowId = await repo.insertRemittanceClaim({
        remittanceFileId: fileId,
        patientControlNumber: cl.patientControlNumber,
        payerClaimControlNumber: cl.payerClaimControlNumber,
        chargedAmount: cl.chargedAmount,
        paidAmount: cl.paidAmount,
        claimStatusCode: cl.claimStatusCode,
      });

      if (!isRemittancePayable(cl.claimStatusCode)) continue;
      const claimId = await repo.findClaimIdByControlNumber(cl.patientControlNumber);
      if (!claimId) continue;

      await repo.applyRemittanceToClaim(
        rowId,
        claimId,
        dollarsToCents(cl.paidAmount),
        cl.payerClaimControlNumber,
      );
      applied += 1;
    }
  }

  logger.info('nctracks remittance poll complete', { files: files.length, applied });
  return { files: files.length, applied };
}

export async function lookupNcClaimStatus(req: ClaimStatusRequest): Promise<ClaimStatusResponse> {
  const adapter = createNctracksAdapter();
  return observeNctracksRealtime('276', () => adapter.getClaimStatus(req));
}

export async function getNctracksIntegrationStatus(): Promise<{
  mode: string;
  pollIntervalMs: number;
  archiveIntervalMs: number;
  retentionYears: number;
  health: { realtimeOk: boolean; sftpOk: boolean; cdOk?: boolean };
  stats?: {
    submissions: number;
    pendingAcks: number;
    remittanceFiles: number;
    x12AuditRows: number;
  };
}> {
  const adapter = createNctracksAdapter();
  const health = await adapter.healthCheck().catch(() => ({ realtimeOk: false, sftpOk: false }));
  const stats = await repo.getNctracksIntegrationStats().catch(() => undefined);
  return {
    mode: adapter.mode,
    pollIntervalMs: nctracksPollIntervalMs(),
    archiveIntervalMs: nctracksX12ArchiveIntervalMs(),
    retentionYears: nctracksX12RetentionYears(),
    health,
    stats,
  };
}

export function startNctracksAckPoller(): void {
  const ms = nctracksPollIntervalMs();
  if (!ms || !isNctracksEnabledForState('NC')) return;

  logger.info('nctracks poller started', { intervalMs: ms });
  setInterval(() => {
    pollNctracksAcks().catch((err) => {
      logger.warn('nctracks ack poll error', { error: err instanceof Error ? err.message : String(err) });
    });
    pollNctracksRemittances().catch((err) => {
      logger.warn('nctracks remittance poll error', { error: err instanceof Error ? err.message : String(err) });
    });
  }, ms);
}
