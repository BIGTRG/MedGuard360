import { EventEmitter } from 'events';
import type { Request, Response } from 'express';
import {
  metricsMiddleware,
  observeNctracksRealtime,
  register,
} from './metrics';

class TestResponse extends EventEmitter {
  public statusCode: number;

  public constructor(statusCode: number) {
    super();
    this.statusCode = statusCode;
  }
}

function makeRequest(method: string, path: string, routePath?: string): Request {
  const route = routePath ? { path: routePath } : undefined;
  return { method, path, route } as unknown as Request;
}

function makeResponse(statusCode: number): Response & TestResponse {
  return new TestResponse(statusCode) as Response & TestResponse;
}

describe('metricsMiddleware', () => {
  beforeEach(() => {
    register.resetMetrics();
  });

  it('records method, route template, and status when the response finishes', async () => {
    const req = makeRequest('POST', '/claims/claim-123', '/claims/:id');
    const res = makeResponse(202);
    const next = jest.fn();

    metricsMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);

    res.emit('finish');

    await expect(register.metrics()).resolves.toContain(
      'medguard_http_requests_total{method="POST",route="/claims/:id",status="202"} 1',
    );
  });

  it('falls back to request path when Express route metadata is unavailable', async () => {
    const req = makeRequest('GET', '/health');
    const res = makeResponse(200);

    metricsMiddleware(req, res, jest.fn());
    res.emit('finish');

    await expect(register.metrics()).resolves.toContain(
      'medguard_http_requests_total{method="GET",route="/health",status="200"} 1',
    );
  });
});

describe('observeNctracksRealtime', () => {
  beforeEach(() => {
    register.resetMetrics();
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records latency for failed realtime transactions before rethrowing', async () => {
    jest.spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_250);

    await expect(
      observeNctracksRealtime('276', async () => {
        throw new Error('transport unavailable');
      }),
    ).rejects.toThrow('transport unavailable');

    const metrics = await register.metrics();
    expect(metrics).toContain('nctracks_realtime_latency_ms_count{txn="276"} 1');
    expect(metrics).toContain('nctracks_realtime_latency_ms_sum{txn="276"} 250');
  });
});
