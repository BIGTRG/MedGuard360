import axios, { AxiosInstance } from 'axios';
import { config, UpstreamError } from '@medguard360/shared';

function mk(name: string, baseURL: string, timeout = 5000): AxiosInstance {
  const c = axios.create({ baseURL, timeout, headers: { 'x-service-caller': config.serviceName } });
  c.interceptors.response.use(r => r, err => Promise.reject(new UpstreamError(name, err.message)));
  return c;
}

export const denialPredictor   = mk('denial-predictor',     process.env.DENIAL_PREDICTOR_URL ?? 'http://denial-predictor:8007', 10000);
export const claimsService     = mk('claims-service',       process.env.CLAIMS_SERVICE_URL ?? 'http://claims-service:3008/api/v1');
export const clinicalDocClient = mk('clinical-doc-service', process.env.CLINICAL_DOC_SERVICE_URL ?? 'http://clinical-doc-service:3007/api/v1');
