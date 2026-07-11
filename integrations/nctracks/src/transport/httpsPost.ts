import * as https from 'https';
import type { NctracksConfig } from '../types';

export async function postCoreSoap(url: string, envelopeXml: string, config: NctracksConfig): Promise<string> {
  const cert = config.auth.clientCertPem;
  const key = config.auth.clientKeyPem;
  if (!cert || !key) {
    throw new Error('NCTracks SOAP requires NCTRACKS_CLIENT_CERT and NCTRACKS_CLIENT_KEY');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'text/xml; charset=UTF-8',
    'Content-Length': String(Buffer.byteLength(envelopeXml, 'utf8')),
  };
  if (config.auth.httpBasic) {
    const token = Buffer.from(`${config.auth.httpBasic.user}:${config.auth.httpBasic.pass}`).toString('base64');
    headers.Authorization = `Basic ${token}`;
  }

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'POST',
      headers,
      cert,
      key,
      ca: config.auth.caBundlePem,
      rejectUnauthorized: true,
      timeout: config.realtime.timeoutMs,
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c as Buffer));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if ((res.statusCode ?? 500) >= 400) {
          reject(new Error(`NCTracks SOAP HTTP ${res.statusCode}: ${body.slice(0, 500)}`));
          return;
        }
        resolve(body);
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('NCTracks SOAP request timed out')));
    req.write(envelopeXml);
    req.end();
  });
}