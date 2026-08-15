import { EventEmitter } from 'events';
import type { NextFunction, Request, Response } from 'express';

import { metricsMiddleware, observeNctracksRealtime, register } from './metrics';

function promSampleValue(metrics: string, metricName: string, labels: Record<string, string>): number {
  const labelText = Object.entries(labels)
    .map(([key, value]) => `${key}="${value}"`)
    .join(',');
  const samplePattern = new RegExp(`^${metricName}\\{${labelText}\\} (\\d+(?:\\.\\d+)?)$`, 'm');
  const match = metrics.match(samplePattern);

  return match ? Number(match[1]) : 0;
}

describe('shared metrics registry', () => {
  it('records HTTP middleware metrics with stable method, route, and status labels', async () => {
    const responseEmitter = new EventEmitter() as EventEmitter & { statusCode: number };
    responseEmitter.statusCode = 201;

    const request = {
      method: 'POST',
      path: '/claims/123',
      route: { path: '/claims/:id' },
    } as unknown as Request;
    const response = responseEmitter as unknown as Response;
    let nextCalls = 0;
    const next: NextFunction = () => {
      nextCalls += 1;
    };

    metricsMiddleware(request, response, next);
    responseEmitter.emit('finish');

    const metrics = await register.metrics();
    const labels = { method: 'POST', route: '/claims/:id', status: '201' };

    expect(nextCalls).toBe(1);
    expect(promSampleValue(metrics, 'medguard_http_requests_total', labels)).toBe(1);
    expect(promSampleValue(metrics, 'medguard_http_request_duration_seconds_count', labels)).toBe(1);
  });

  it('observes NCTracks realtime latency when the wrapped operation rejects', async () => {
    const before = promSampleValue(await register.metrics(), 'nctracks_realtime_latency_ms_count', { txn: '277' });

    await expect(
      observeNctracksRealtime('277', async () => {
        throw new Error('NCTracks 277 endpoint unavailable');
      }),
    ).rejects.toThrow('NCTracks 277 endpoint unavailable');

    const after = promSampleValue(await register.metrics(), 'nctracks_realtime_latency_ms_count', { txn: '277' });
    expect(after).toBe(before + 1);
  });
});
