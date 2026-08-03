import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import { metricsMiddleware, observeNctracksRealtime, register } from './metrics';

describe('shared metrics', () => {
  beforeEach(() => {
    register.resetMetrics();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records HTTP request totals with method, route, and status labels', async () => {
    const req = {
      method: 'POST',
      path: '/claims/abc-123',
      route: { path: '/claims/:id' },
    } as unknown as Request;
    const res = Object.assign(new EventEmitter(), { statusCode: 202 }) as Response & EventEmitter;
    const next: NextFunction = jest.fn();

    metricsMiddleware(req, res, next);
    res.emit('finish');

    expect(next).toHaveBeenCalledTimes(1);
    await expect(register.metrics()).resolves.toContain(
      'medguard_http_requests_total{method="POST",route="/claims/:id",status="202"} 1',
    );
  });

  it('falls back to request path when Express has not matched a route', async () => {
    const req = {
      method: 'GET',
      path: '/unmatched/path',
    } as unknown as Request;
    const res = Object.assign(new EventEmitter(), { statusCode: 404 }) as Response & EventEmitter;

    metricsMiddleware(req, res, jest.fn());
    res.emit('finish');

    await expect(register.metrics()).resolves.toContain(
      'medguard_http_requests_total{method="GET",route="/unmatched/path",status="404"} 1',
    );
  });

  it('observes NCTracks realtime latency even when the wrapped call rejects', async () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(1_000).mockReturnValueOnce(1_042);

    await expect(
      observeNctracksRealtime('277', async () => {
        throw new Error('sandbox timeout');
      }),
    ).rejects.toThrow('sandbox timeout');

    await expect(register.metrics()).resolves.toMatch(
      /nctracks_realtime_latency_ms_sum\{txn="277"\} 42\b/,
    );
  });
});
