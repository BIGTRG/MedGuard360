import { EventEmitter } from 'events';
import type { ClientRequest, IncomingMessage } from 'http';
import * as https from 'https';
import { postCoreSoap } from './httpsPost';
import type { NctracksConfig } from '../types';

jest.mock('https', () => ({
  request: jest.fn(),
}));

type HttpsRequest = (
  url: string | URL,
  options: https.RequestOptions,
  callback: (res: IncomingMessage) => void,
) => ClientRequest;

const mockHttpsRequest = https.request as unknown as jest.MockedFunction<HttpsRequest>;

class MockClientRequest extends EventEmitter {
  public readonly writtenChunks: string[] = [];

  write(chunk: string | Buffer): boolean {
    this.writtenChunks.push(chunk.toString());
    return true;
  }

  end(): void {
    // The mocked response is emitted from the test-specific request implementation.
  }

  destroy(error?: Error): this {
    if (error) {
      this.emit('error', error);
    }
    return this;
  }
}

interface CapturedRequest {
  request: MockClientRequest;
  options: https.RequestOptions;
  url: string | URL;
}

type MockIncomingMessage = IncomingMessage & EventEmitter & { statusCode?: number };

const config: NctracksConfig = {
  mode: 'soap',
  env: 'test',
  realtime: {
    eligibilityUrl: 'https://edi.example.test/core/eligibility',
    claimStatusUrl: 'https://edi.example.test/core/status',
    timeoutMs: 10_000,
  },
  batch: {},
  identifiers: {
    tpid: 'TPID-TEST',
    submitterId: 'SUBMITTER01',
    submitterQualifier: 'ZZ',
    receiverId: 'NCXIX',
    receiverQualifier: 'ZZ',
    billingNpi: '1111111111',
    billingTaxonomy: '207Q00000X',
    usageIndicator: 'T',
  },
  auth: {
    clientCertPem: 'test-cert',
    clientKeyPem: 'test-key',
    caBundlePem: 'test-ca',
    httpBasic: { user: 'api-user', pass: 'api-pass' },
  },
};

function requireCaptured(captured: CapturedRequest | undefined): CapturedRequest {
  if (!captured) {
    throw new Error('Expected https.request to be called');
  }
  return captured;
}

function mockResponse(statusCode: number, body: string): () => CapturedRequest {
  let captured: CapturedRequest | undefined;
  mockHttpsRequest.mockImplementation((url, options, callback) => {
    const request = new MockClientRequest();
    captured = { request, options, url };

    const response = new EventEmitter() as MockIncomingMessage;
    response.statusCode = statusCode;
    callback(response);

    process.nextTick(() => {
      response.emit('data', Buffer.from(body));
      response.emit('end');
    });

    return request as unknown as ClientRequest;
  });

  return () => requireCaptured(captured);
}

describe('postCoreSoap', () => {
  beforeEach(() => {
    mockHttpsRequest.mockReset();
  });

  it('posts the SOAP body with mTLS credentials and optional basic auth', async () => {
    const getCaptured = mockResponse(200, '<COREEnvelopePayload>ok</COREEnvelopePayload>');

    await expect(postCoreSoap(
      'https://edi.example.test/core/eligibility',
      '<soap>body</soap>',
      config,
    )).resolves.toBe('<COREEnvelopePayload>ok</COREEnvelopePayload>');

    const captured = getCaptured();
    const headers = captured.options.headers as Record<string, string>;
    expect(captured.url).toBe('https://edi.example.test/core/eligibility');
    expect(captured.options).toMatchObject({
      method: 'POST',
      cert: 'test-cert',
      key: 'test-key',
      ca: 'test-ca',
      rejectUnauthorized: true,
      timeout: 10_000,
    });
    expect(headers['Content-Type']).toBe('text/xml; charset=UTF-8');
    expect(headers['Content-Length']).toBe(String(Buffer.byteLength('<soap>body</soap>', 'utf8')));
    expect(headers.Authorization).toBe(`Basic ${Buffer.from('api-user:api-pass').toString('base64')}`);
    expect(captured.request.writtenChunks).toEqual(['<soap>body</soap>']);
  });

  it('rejects HTTP error responses with response context', async () => {
    mockResponse(503, 'sandbox unavailable');

    await expect(postCoreSoap(
      'https://edi.example.test/core/eligibility',
      '<soap>body</soap>',
      config,
    )).rejects.toThrow('NCTracks SOAP HTTP 503: sandbox unavailable');
  });

  it('requires mTLS certificate and key before opening a request', async () => {
    const noCertificateConfig: NctracksConfig = {
      ...config,
      auth: { clientKeyPem: 'test-key' },
    };

    await expect(postCoreSoap(
      'https://edi.example.test/core/eligibility',
      '<soap>body</soap>',
      noCertificateConfig,
    )).rejects.toThrow('NCTracks SOAP requires NCTRACKS_CLIENT_CERT and NCTRACKS_CLIENT_KEY');
    expect(mockHttpsRequest).not.toHaveBeenCalled();
  });

  it('rejects request errors from the HTTPS client', async () => {
    mockHttpsRequest.mockImplementation((url, options, callback) => {
      const request = new MockClientRequest();
      process.nextTick(() => {
        request.emit('error', new Error('ECONNRESET'));
      });
      return request as unknown as ClientRequest;
    });

    await expect(postCoreSoap(
      'https://edi.example.test/core/eligibility',
      '<soap>body</soap>',
      config,
    )).rejects.toThrow('ECONNRESET');
  });

  it('destroys the request on timeout with a clear error', async () => {
    mockHttpsRequest.mockImplementation((url, options, callback) => {
      const request = new MockClientRequest();
      process.nextTick(() => {
        request.emit('timeout');
      });
      return request as unknown as ClientRequest;
    });

    await expect(postCoreSoap(
      'https://edi.example.test/core/eligibility',
      '<soap>body</soap>',
      config,
    )).rejects.toThrow('NCTracks SOAP request timed out');
  });
});
