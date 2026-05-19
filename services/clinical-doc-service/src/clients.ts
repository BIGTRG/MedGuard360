import axios, { AxiosInstance } from 'axios';
import { config, UpstreamError } from '@medguard360/shared';

function mk(name: string, baseURL: string, timeout = 30000): AxiosInstance {
  const c = axios.create({ baseURL, timeout, headers: { 'x-service-caller': config.serviceName } });
  c.interceptors.response.use(r => r, err => Promise.reject(new UpstreamError(name, err.message)));
  return c;
}

// AI engines
export const speechToText  = mk('speech-to-text', 'http://localhost:8001', 120_000);  // long for big audio
export const clinicalNlp   = mk('clinical-nlp',   'http://localhost:8002', 15_000);
