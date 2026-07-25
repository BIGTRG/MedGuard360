import { EventEmitter } from 'events';
import {
  postCoreSoap,
  type CoreSoapRequest,
  type CoreSoapRequestOptions,
  type CoreSoapResponse,
  type CoreSoapTransport,
} from './httpsPost';
import type { NctracksConfig } from '../types';

class FakeResponse extends EventEmitter implements CoreSoapResponse {
  constructor(
    public readonly statusCode: number,
    private readonly body: string,
  ) {
    super();
  }

  on(event: 'data', listener: (chunk: Buffer) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'data' | 'end', listener: ((chunk: Buffer) => void) | (() => void)): this {
    return super.on(event, listener);
  }

  flush(): void {
    this.emit('data', Buffer.from(this.body, 'utf8'));
    this.emit('end');
  }
}

class FakeRequest extends EventEmitter implements CoreSoapRequest {
  public readonly chunks: string[] = [];
  public destroyedWith?: Error;

  constructor(private readonly onEnd: () => void) {
    super();
  }

  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'timeout', listener: () => void): this;
  on(event: 'error' | 'timeout', listener: ((err: Error) => void) | (() => void)): this {
    return super.on(event, listener);
  }

  write(chunk: string): void {
    this.chunks.push(chunk);
  }

  end(): void {
    this.onEnd();
  }

  destroy(error: Error): void {
    this.destroyedWith = error;
    this.emit('error', error);
  }
}

interface CapturedRequest {
  url: string;
  options: CoreSoapRequestOptions;
  request: FakeRequest;
}

function config(overrides: Partial<NctracksConfig> = {}): NctracksConfig {
  return {
    mode: 'soap',
    env: 'test',
    realtime: {
      eligibilityUrl: 'https://edi.example.com/CORE/Eligibility',
      claimStatusUrl: '',
      timeoutMs: 12_345,
    },
    batch: {},
    identifiers: {
      tpid: 'TPID',
      submitterId: 'SUBMITTER',
      submitterQualifier: 'ZZ',
      receiverId: 'NCXIX',
      receiverQualifier: 'ZZ',
      billingNpi: '1234567890',
      billingTaxonomy: '207Q00000X',
      usageIndicator: 'T',
    },
    auth: {
      clientCertPem: 'CERT',
      clientKeyPem: 'KEY',
      caBundlePem: 'CA',
      httpBasic: { user: 'trading-partner', pass: 'secret' },
    },
    ...overrides,
  };
}

function createTransport(response?: FakeResponse): {
  transport: CoreSoapTransport;
  captured: () => CapturedRequest;
} {
  let captured: CapturedRequest | undefined;
  const transport: CoreSoapTransport = {
    request: (url, options, callback) => {
      const request = new FakeRequest(() => {
        if (response) {
          callback(response);
          response.flush();
        }
      });
      captured = { url, options, request };
      return request;
    },
  };

  return {
    transport,
    captured: () => {
      if (!captured) {
        throw new Error('transport was not called');
      }
      return captured;
    },
  };
}

describe('postCoreSoap', () => {
  it('requires client certificate and key before opening a transport', async () => {
    const { transport } = createTransport(new FakeResponse(200, '<ok />'));

    await expect(postCoreSoap('https://edi.example.com', '<soap />', config({ auth: {} }), transport))
      .rejects.toThrow(/NCTRACKS_CLIENT_CERT/);
  });

  it('posts the SOAP envelope with mTLS, timeout, and HTTP Basic headers', async () => {
    const { transport, captured } = createTransport(new FakeResponse(200, '<response />'));

    await expect(postCoreSoap('https://edi.example.com', '<soap />', config(), transport))
      .resolves.toBe('<response />');

    const request = captured();
    expect(request.url).toBe('https://edi.example.com');
    expect(request.options).toMatchObject({
      method: 'POST',
      cert: 'CERT',
      key: 'KEY',
      ca: 'CA',
      rejectUnauthorized: true,
      timeout: 12_345,
    });
    expect(request.options.headers).toMatchObject({
      'Content-Type': 'text/xml; charset=UTF-8',
      'Content-Length': String(Buffer.byteLength('<soap />', 'utf8')),
      Authorization: `Basic ${Buffer.from('trading-partner:secret').toString('base64')}`,
    });
    expect(request.request.chunks).toEqual(['<soap />']);
  });

  it('rejects unsuccessful HTTP responses with a bounded response body', async () => {
    const longBody = 'x'.repeat(600);
    const { transport } = createTransport(new FakeResponse(503, longBody));

    await expect(postCoreSoap('https://edi.example.com', '<soap />', config(), transport))
      .rejects.toThrow(`NCTracks SOAP HTTP 503: ${'x'.repeat(500)}`);
  });

  it('destroys and rejects requests that time out', async () => {
    const { transport, captured } = createTransport();
    const result = postCoreSoap('https://edi.example.com', '<soap />', config(), transport);

    const request = captured();
    request.request.emit('timeout');

    await expect(result).rejects.toThrow('NCTracks SOAP request timed out');
    expect(request.request.destroyedWith?.message).toBe('NCTracks SOAP request timed out');
  });
});
