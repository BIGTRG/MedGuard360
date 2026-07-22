import { EventEmitter } from 'events';
import type { ClientRequest, IncomingMessage } from 'http';
import * as https from 'https';
import type { RequestOptions } from 'https';
import type { NctracksConfig } from '../types';
import { postCoreSoap } from './httpsPost';

jest.mock('https', () => ({
  request: jest.fn(),
}));

type ResponseCallback = (res: IncomingMessage) => void;

type FakeClientRequest = EventEmitter & {
  write: jest.Mock<void, [string]>;
  end: jest.Mock<void, []>;
  destroy: jest.Mock<FakeClientRequest, [Error?]>;
};

function config(): NctracksConfig {
  return {
    mode: 'soap',
    env: 'test',
    realtime: {
      eligibilityUrl: 'https://edi.example.com/CORE/Eligibility',
      claimStatusUrl: '',
      timeoutMs: 1_234,
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
      clientCertPem: 'cert',
      clientKeyPem: 'key',
      caBundlePem: 'ca',
      httpBasic: { user: 'trading', pass: 'secret' },
    },
  };
}

function mockHttpsRequest() {
  let capturedUrl: string | URL | undefined;
  let capturedOptions: RequestOptions | undefined;
  let capturedCallback: ResponseCallback | undefined;

  const fakeReq = new EventEmitter() as FakeClientRequest;
  fakeReq.write = jest.fn<void, [string]>();
  fakeReq.end = jest.fn<void, []>();
  fakeReq.destroy = jest.fn<FakeClientRequest, [Error?]>((error?: Error) => {
    if (error) fakeReq.emit('error', error);
    return fakeReq;
  });

  const implementation = ((
    url: string | URL,
    options: RequestOptions,
    callback?: ResponseCallback,
  ): ClientRequest => {
    capturedUrl = url;
    capturedOptions = options;
    capturedCallback = callback;
    return fakeReq as unknown as ClientRequest;
  }) as typeof https.request;

  const requestMock = https.request as jest.MockedFunction<typeof https.request>;
  requestMock.mockImplementation(implementation);

  return {
    req: fakeReq,
    get url(): string | URL {
      if (!capturedUrl) throw new Error('https.request was not called');
      return capturedUrl;
    },
    get options(): RequestOptions {
      if (!capturedOptions) throw new Error('https.request was not called');
      return capturedOptions;
    },
    respond(statusCode: number, chunks: string[]): void {
      if (!capturedCallback) throw new Error('https.request callback was not captured');
      const res = new EventEmitter() as IncomingMessage;
      res.statusCode = statusCode;
      capturedCallback(res);
      for (const chunk of chunks) {
        res.emit('data', Buffer.from(chunk));
      }
      res.emit('end');
    },
  };
}

describe('postCoreSoap', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('requires mTLS client certificate and key before opening a request', async () => {
    const requestMock = https.request as jest.MockedFunction<typeof https.request>;
    await expect(postCoreSoap('https://edi.example.com', '<xml/>', {
      ...config(),
      auth: { clientCertPem: 'cert' },
    })).rejects.toThrow(/NCTRACKS_CLIENT_CERT and NCTRACKS_CLIENT_KEY/);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it('posts the SOAP envelope with mTLS, CA, timeout, content headers, and basic auth', async () => {
    const request = mockHttpsRequest();
    const envelope = '<soap:Envelope>payload</soap:Envelope>';
    const promise = postCoreSoap('https://edi.example.com/CORE/Eligibility', envelope, config());

    expect(request.url).toBe('https://edi.example.com/CORE/Eligibility');
    expect(request.options).toMatchObject({
      method: 'POST',
      cert: 'cert',
      key: 'key',
      ca: 'ca',
      rejectUnauthorized: true,
      timeout: 1_234,
    });
    expect(request.options.headers).toMatchObject({
      'Content-Type': 'text/xml; charset=UTF-8',
      'Content-Length': String(Buffer.byteLength(envelope, 'utf8')),
      Authorization: 'Basic dHJhZGluZzpzZWNyZXQ=',
    });
    expect(request.req.write).toHaveBeenCalledWith(envelope);
    expect(request.req.end).toHaveBeenCalledTimes(1);

    request.respond(200, ['<COREEnvelopePayload>ISA*00*~</COREEnvelopePayload>']);
    await expect(promise).resolves.toBe('<COREEnvelopePayload>ISA*00*~</COREEnvelopePayload>');
  });

  it('rejects HTTP error responses with a bounded response preview', async () => {
    const request = mockHttpsRequest();
    const promise = postCoreSoap('https://edi.example.com/CORE/Eligibility', '<xml/>', config());

    request.respond(503, ['service unavailable']);

    await expect(promise).rejects.toThrow('NCTracks SOAP HTTP 503: service unavailable');
  });

  it('rejects when the request times out', async () => {
    const request = mockHttpsRequest();
    const promise = postCoreSoap('https://edi.example.com/CORE/Eligibility', '<xml/>', config());

    request.req.emit('timeout');

    await expect(promise).rejects.toThrow('NCTracks SOAP request timed out');
    expect(request.req.destroy).toHaveBeenCalledWith(expect.any(Error));
  });
});
