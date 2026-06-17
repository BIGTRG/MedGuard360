import axios, { AxiosInstance } from 'axios';
import { config, UpstreamError } from '@medguard360/shared';

function client(name: string, baseURL: string, timeout = 5000): AxiosInstance {
  const c = axios.create({ baseURL, timeout, headers: { 'x-service-caller': config.serviceName } });
  c.interceptors.response.use(r => r, err => Promise.reject(new UpstreamError(name, err.message)));
  return c;
}

export const fraudDetection   = client('fraud-detection', process.env.FRAUD_DETECTION_URL ?? 'http://localhost:8004', 8000);
export const stateConfig      = client('state-config-service', 'http://localhost:3018/api/v1');
