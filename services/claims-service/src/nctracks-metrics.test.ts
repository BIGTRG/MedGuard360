import {
  nctracksBatchFilesIn,
  nctracksBatchFilesOut,
  nctracksAck999RejectTotal,
  observeNctracksRealtime,
} from '@medguard360/shared';

describe('nctracks metrics', () => {
  it('records realtime latency without throwing', async () => {
    const result = await observeNctracksRealtime('270', async () => 'ok');
    expect(result).toBe('ok');
  });

  it('increments batch and ack counters', () => {
    expect(() => {
      nctracksBatchFilesOut.inc({ type: '837P' });
      nctracksBatchFilesIn.inc({ type: '835' });
      nctracksAck999RejectTotal.inc();
    }).not.toThrow();
  });
});