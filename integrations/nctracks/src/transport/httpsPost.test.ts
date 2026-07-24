import { EventEmitter } from 'events';
import type { ClientRequest, IncomingMessage } from 'http';
import * as https from 'https';
import { loadNctracksConfig } from '../config';
import { postCoreSoap } from './httpsPost';

class FakeClientRequest extends EventEmitter {
  public body = '';

  constructor(private readonly onEnd: () => void) {
    super();
  }

  write(chunk: string | Buffer): boolean {
    this.body += chunk.toString();
    return true;
  }

  end(): this {
    this.onEnd();
    return this;
  }

  destroy(error?: Error): this {
    if (error) {
      this.emit('error', error);
    }
    return this;
  }
}

interface CapturedRequest {
  url: string | URL;
  options: https.RequestOptions;
  request: FakeClientRequest;
}

function makeSoapConfig() {
  return loadNctracksConfig({
    NCTRACKS_MODE: 'soap',
    NCTRACKS_REALTIME_ELIGIBILITY_URL: 'https://edi.example.com/CORE/Eligibility',
    NCTRACKS_REALTIME_TIMEOUT_MS: '1234',
    NCTRACKS_CLIENT_CERT: 'cert-pem',
    NCTRACKS_CLIENT_KEY: 'key-pem',
    NCTRACKS_CA_BUNDLE: 'ca-pem',
    NCTRACKS_HTTP_BASIC_USER: 'core-user',
    NCTRACKS_HTTP_BASIC_PASS: 'core-pass',
  });
}

function mockHttpsResponse(statusCode: number, body: string): {
  captured: () => CapturedRequest;
  spy: jest.SpiedFunction<typeof https.request>;
} {
  let capturedRequest: CapturedRequest | undefined;
  const spy = jest.spyOn(https, 'request').mockImplementation(((url: string | URL, options: https.RequestOptions, callback?: (res: IncomingMessage) => void) => {
    const request = new FakeClientRequest(() => {
      const response = new EventEmitter() as IncomingMessage;
      response.statusCode = statusCode;
      callback?.(response);
      response.emit('data', Buffer.from(body));
      response.emit('end');
    });
    capturedRequest = { url, options, request };
    return request as unknown as ClientRequest;
  }) as typeof https.request);

  return {
    captured: () => {
      if (!capturedRequest) {
        throw new Error('https.request was not captured');
      }
      return capturedRequest;
    },
    spy,
  };
}

describe('postCoreSoap', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requires mTLS client certificate and key before attempting a SOAP request', async () => {
    const config = loadNctracksConfig({});

    await expect(postCoreSoap('https://edi.example.com/CORE/Eligibility', '<Envelope />', config))
      .rejects.toThrow(/NCTRACKS_CLIENT_CERT and NCTRACKS_CLIENT_KEY/);
    expect(jest.isMockFunction(https.request)).toBe(false);
  });

  it('posts the SOAP envelope with mTLS material, timeout, and HTTP Basic authorization', async () => {
    const { captured } = mockHttpsResponse(200, '<ok />');
    const response = await postCoreSoap(
      'https://edi.example.com/CORE/Eligibility',
      '<Envelope>270</Envelope>',
      makeSoapConfig(),
    );

    expect(response).toBe('<ok />');

    const request = captured();
    const headers = request.options.headers as Record<string, string>;
    expect(request.url).toBe('https://edi.example.com/CORE/Eligibility');
    expect(request.options.method).toBe('POST');
    expect(request.options.cert).toBe('cert-pem');
    expect(request.options.key).toBe('key-pem');
    expect(request.options.ca).toBe('ca-pem');
    expect(request.options.rejectUnauthorized).toBe(true);
    expect(request.options.timeout).toBe(1234);
    expect(headers['Content-Type']).toBe('text/xml; charset=UTF-8');
    expect(headers['Content-Length']).toBe(String(Buffer.byteLength('<Envelope>270</Envelope>', 'utf8')));
    expect(headers.Authorization).toBe(`Basic ${Buffer.from('core-user:core-pass').toString('base64')}`);
    expect(request.request.body).toBe('<Envelope>270</Envelope>');
  });

  it('rejects HTTP error responses with the NCTracks status code and body prefix', async () => {
    mockHttpsResponse(503, 'service unavailable');

    await expect(postCoreSoap(
      'https://edi.example.com/CORE/Eligibility',
      '<Envelope />',
      makeSoapConfig(),
    )).rejects.toThrow('NCTracks SOAP HTTP 503: service unavailable');
  });
});
