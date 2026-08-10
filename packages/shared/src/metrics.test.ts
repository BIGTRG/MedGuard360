import { EventEmitter } from 'events';
import type { NextFunction, Request, Response } from 'express';
import { metricsMiddleware, observeNctracksRealtime, register } from './metrics';

describe('observeNctracksRealtime', () => {
  beforeEach(() => {
    register.resetMetrics();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records latency even when the wrapped realtime call rejects', async () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(1_000).mockReturnValueOnce(1_250);

    await expect(
      observeNctracksRealtime('276', async () => {
        throw new Error('NCTracks timeout');
      }),
    ).rejects.toThrow('NCTracks timeout');

    const metrics = await register.metrics();
    expect(metrics).toContain('nctracks_realtime_latency_ms_count{txn="276"} 1');
    expect(metrics).toContain('nctracks_realtime_latency_ms_sum{txn="276"} 250');
  });
});

describe('metricsMiddleware', () => {
  beforeEach(() => {
    register.resetMetrics();
  });

  function responseWithStatus(statusCode: number): Response {
    return Object.assign(new EventEmitter(), { statusCode }) as unknown as Response;
  }

  it('records request count and duration labels when the response finishes', async () => {
    const req = {
      method: 'POST',
      path: '/fallback-route',
      route: { path: '/claims/:claimId' },
    } as unknown as Request;
    const res = responseWithStatus(202);
    const next: NextFunction = jest.fn();

    metricsMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    res.emit('finish');

    const metrics = await register.metrics();
    const labels = 'method="POST",route="/claims/:claimId",status="202"';
    expect(metrics).toContain(`medguard_http_requests_total{${labels}} 1`);
    expect(metrics).toContain(`medguard_http_request_duration_seconds_count{${labels}} 1`);
  });
});
