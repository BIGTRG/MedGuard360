import { EventEmitter } from 'events';
import type { ClientRequest, IncomingMessage } from 'http';
import * as https from 'https';
import { loadNctracksConfig } from '../config';
import { postCoreSoap } from './httpsPost';
import type { NctracksConfig } from '../types';

jest.mock('https', () => ({
  request: jest.fn(),
}));

const mockedHttpsRequest = jest.mocked(https.request);

interface MockHttpsCall {
  url?: string | URL | https.RequestOptions;
  options?: https.RequestOptions;
  body: string;
}

function makeMtlsConfig(): NctracksConfig {
  return loadNctracksConfig({
    NCTRACKS_MODE: 'soap',
    NCTRACKS_REALTIME_ELIGIBILITY_URL: 'https://edi.example.com/CORE/Eligibility',
    NCTRACKS_CLIENT_CERT: 'cert-pem',
    NCTRACKS_CLIENT_KEY: 'key-pem',
    NCTRACKS_CA_BUNDLE: 'ca-pem',
    NCTRACKS_HTTP_BASIC_USER: 'soap-user',
    NCTRACKS_HTTP_BASIC_PASS: 'soap-pass',
  });
}

function mockHttpsResponse(statusCode: number, body: string): MockHttpsCall {
  const call: MockHttpsCall = { body: '' };
  const implementation = (
    urlOrOptions: string | URL | https.RequestOptions,
    optionsOrCallback?: https.RequestOptions | ((res: IncomingMessage) => void),
    callback?: (res: IncomingMessage) => void,
  ): ClientRequest => {
    const options = typeof optionsOrCallback === 'function' ? {} : optionsOrCallback ?? {};
    const responseCallback = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
    call.url = urlOrOptions;
    call.options = options;

    const requestEmitter = new EventEmitter();
    const request = requestEmitter as ClientRequest;
    request.write = ((chunk: string | Buffer | Uint8Array) => {
      call.body += Buffer.from(chunk).toString('utf8');
      return true;
    }) as ClientRequest['write'];
    request.end = (() => {
      const response = new EventEmitter() as IncomingMessage;
      response.statusCode = statusCode;
      responseCallback?.(response);
      response.emit('data', Buffer.from(body, 'utf8'));
      response.emit('end');
      return request;
    }) as ClientRequest['end'];
    request.destroy = ((error?: Error) => {
      if (error) {
        request.emit('error', error);
      }
      return request;
    }) as ClientRequest['destroy'];
    return request;
  };

  mockedHttpsRequest.mockImplementation(implementation as typeof https.request);
  return call;
}

describe('postCoreSoap', () => {
  afterEach(() => {
    mockedHttpsRequest.mockReset();
  });

  it('rejects before network I/O when mTLS client credentials are missing', async () => {
    const config = loadNctracksConfig({});

    await expect(postCoreSoap(
      'https://edi.example.com/CORE/Eligibility',
      '<soap:Envelope />',
      config,
    )).rejects.toThrow(/requires NCTRACKS_CLIENT_CERT and NCTRACKS_CLIENT_KEY/);
  });

  it('posts the SOAP envelope with mTLS, CA, timeout, and HTTP Basic headers', async () => {
    const envelope = '<soap:Envelope>eligibility</soap:Envelope>';
    const call = mockHttpsResponse(200, '<soap:Envelope>ok</soap:Envelope>');

    await expect(postCoreSoap(
      'https://edi.example.com/CORE/Eligibility',
      envelope,
      makeMtlsConfig(),
    )).resolves.toBe('<soap:Envelope>ok</soap:Envelope>');

    expect(call.url).toBe('https://edi.example.com/CORE/Eligibility');
    expect(call.body).toBe(envelope);
    expect(call.options).toMatchObject({
      method: 'POST',
      cert: 'cert-pem',
      key: 'key-pem',
      ca: 'ca-pem',
      rejectUnauthorized: true,
      timeout: 30000,
    });
    expect(call.options?.headers).toMatchObject({
      'Content-Type': 'text/xml; charset=UTF-8',
      'Content-Length': String(Buffer.byteLength(envelope, 'utf8')),
      Authorization: `Basic ${Buffer.from('soap-user:soap-pass').toString('base64')}`,
    });
  });

  it('rejects non-2xx SOAP HTTP responses with the response body', async () => {
    mockHttpsResponse(503, 'payer gateway unavailable');

    await expect(postCoreSoap(
      'https://edi.example.com/CORE/Eligibility',
      '<soap:Envelope />',
      makeMtlsConfig(),
    )).rejects.toThrow(/NCTracks SOAP HTTP 503: payer gateway unavailable/);
  });
});
