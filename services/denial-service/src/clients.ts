import axios, { AxiosInstance } from 'axios';
import { config, UpstreamError } from '@medguard360/shared';

function mk(name: string, baseURL: string, timeout = 5000): AxiosInstance {
  const c = axios.create({ baseURL, timeout, headers: { 'x-service-caller': config.serviceName } });
  c.interceptors.response.use(r => r, err => Promise.reject(new UpstreamError(name, err.message)));
  return c;
}

export const denialPredictor   = mk('denial-predictor',     'http://localhost:8007', 10000);
export const claimsService     = mk('claims-service',       'http://localhost:3008/api/v1');
export const clinicalDocClient = mk('clinical-doc-service', 'http://localhost:3007/api/v1');
