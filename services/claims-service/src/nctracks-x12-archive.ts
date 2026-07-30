/**
 * Export nctracks_x12_audit rows older than the retention window to cold storage,
 * record a manifest, then delete from the hot table.
 */

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { logger } from '@medguard360/shared';
import * as repo from './nctracks-repository';

const ARCHIVE_BATCH_LIMIT = 500;

export function nctracksX12RetentionYears(): number {
  const raw = process.env.NCTRACKS_X12_RETENTION_YEARS ?? '10';
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : 10;
}

export function nctracksX12ArchivePath(): string {
  return process.env.NCTRACKS_X12_ARCHIVE_PATH ?? '/opt/storage/cold/nctracks-x12';
}

export function nctracksX12ArchiveIntervalMs(): number {
  const raw = process.env.NCTRACKS_X12_ARCHIVE_INTERVAL_MS ?? '0';
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function x12ArchiveCutoffDate(now = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setFullYear(cutoff.getFullYear() - nctracksX12RetentionYears());
  return cutoff;
}

export async function archiveNctracksX12Audit(): Promise<{ archived: number; batchId?: string }> {
  const cutoff = x12ArchiveCutoffDate();
  const rows = await repo.listX12AuditOlderThan(cutoff, ARCHIVE_BATCH_LIMIT);
  if (!rows.length) return { archived: 0 };

  const batchId = `x12-${cutoff.toISOString().slice(0, 10)}-${Date.now()}`;
  const dir = nctracksX12ArchivePath();
  await mkdir(dir, { recursive: true });

  const fileName = `${batchId}.jsonl.gz`;
  const filePath = path.join(dir, fileName);
  const jsonl = rows.map((row) => JSON.stringify(row)).join('\n') + '\n';
  const compressed = gzipSync(jsonl);
  const sha256 = createHash('sha256').update(compressed).digest('hex');
  await writeFile(filePath, compressed);
  const oldest = rows.reduce((min, r) => (r.recorded_at < min ? r.recorded_at : min), rows[0].recorded_at);
  const newest = rows.reduce((max, r) => (r.recorded_at > max ? r.recorded_at : max), rows[0].recorded_at);

  await repo.insertX12ArchiveManifest({
    batchId,
    recordCount: rows.length,
    oldestRecordedAt: oldest,
    newestRecordedAt: newest,
    archivePath: filePath,
    sha256,
  });
  await repo.deleteX12AuditByIds(rows.map((r) => r.id));

  logger.info('nctracks x12 archive complete', { batchId, archived: rows.length, filePath, sha256 });
  return { archived: rows.length, batchId };
}

export function startNctracksX12Archiver(): void {
  const ms = nctracksX12ArchiveIntervalMs();
  if (!ms) return;

  logger.info('nctracks x12 archiver started', { intervalMs: ms, retentionYears: nctracksX12RetentionYears() });
  setInterval(() => {
    archiveNctracksX12Audit().catch((err) => {
      logger.warn('nctracks x12 archive error', { error: err instanceof Error ? err.message : String(err) });
    });
  }, ms);
}
