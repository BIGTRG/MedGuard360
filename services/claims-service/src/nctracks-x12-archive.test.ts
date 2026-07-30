import {
  nctracksX12RetentionYears,
  nctracksX12ArchiveIntervalMs,
  x12ArchiveCutoffDate,
} from './nctracks-x12-archive';

describe('nctracks X12 archival config', () => {
  it('defaults retention to 10 years', () => {
    const prev = process.env.NCTRACKS_X12_RETENTION_YEARS;
    delete process.env.NCTRACKS_X12_RETENTION_YEARS;
    expect(nctracksX12RetentionYears()).toBe(10);
    if (prev === undefined) delete process.env.NCTRACKS_X12_RETENTION_YEARS;
    else process.env.NCTRACKS_X12_RETENTION_YEARS = prev;
  });

  it('defaults archive interval to zero when unset', () => {
    const prev = process.env.NCTRACKS_X12_ARCHIVE_INTERVAL_MS;
    delete process.env.NCTRACKS_X12_ARCHIVE_INTERVAL_MS;
    expect(nctracksX12ArchiveIntervalMs()).toBe(0);
    if (prev === undefined) delete process.env.NCTRACKS_X12_ARCHIVE_INTERVAL_MS;
    else process.env.NCTRACKS_X12_ARCHIVE_INTERVAL_MS = prev;
  });

  it('computes cutoff from retention window', () => {
    const now = new Date('2026-06-30T12:00:00Z');
    const prev = process.env.NCTRACKS_X12_RETENTION_YEARS;
    process.env.NCTRACKS_X12_RETENTION_YEARS = '10';
    const cutoff = x12ArchiveCutoffDate(now);
    expect(cutoff.getUTCFullYear()).toBe(2016);
    if (prev === undefined) delete process.env.NCTRACKS_X12_RETENTION_YEARS;
    else process.env.NCTRACKS_X12_RETENTION_YEARS = prev;
  });
});