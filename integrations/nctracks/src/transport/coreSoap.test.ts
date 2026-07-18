import { buildCoreSoapEnvelope, extractCoreEnvelopePayload } from './coreSoap';

describe('buildCoreSoapEnvelope', () => {
  it('wraps X12 in CORE real-time request', () => {
    const xml = buildCoreSoapEnvelope({
      payloadType: '270',
      payloadId: 'TEST-1',
      senderId: 'STUB-TSN',
      receiverId: 'NCXIX',
      x12Payload: 'ISA*00*~',
      timestamp: '2026-07-11T12:00:00.000Z',
    });
    expect(xml).toContain('COREEnvelopeRealTimeRequest');
    expect(xml).toContain('<cor:PayloadType>270</cor:PayloadType>');
    expect(xml).toContain('ISA*00*~');
  });

  it('escapes XML-sensitive values before embedding payer payloads', () => {
    const xml = buildCoreSoapEnvelope({
      payloadType: '276',
      payloadId: 'PAYLOAD-&-"',
      senderId: 'SENDER<1>',
      receiverId: 'RECEIVER&2',
      x12Payload: 'ISA*00*&<>"~',
      timestamp: '2026-07-11T12:00:00.000Z',
    });

    expect(xml).toContain('<cor:PayloadID>PAYLOAD-&amp;-&quot;</cor:PayloadID>');
    expect(xml).toContain('<cor:SenderID>SENDER&lt;1&gt;</cor:SenderID>');
    expect(xml).toContain('<cor:ReceiverID>RECEIVER&amp;2</cor:ReceiverID>');
    expect(xml).toContain('<cor:COREEnvelopePayload>ISA*00*&amp;&lt;&gt;&quot;~</cor:COREEnvelopePayload>');
  });
});

describe('extractCoreEnvelopePayload', () => {
  it('pulls X12 from CORE response', () => {
    const xml = '<cor:COREEnvelopePayload>ISA*00*~</cor:COREEnvelopePayload>';
    expect(extractCoreEnvelopePayload(xml)).toBe('ISA*00*~');
  });

  it('unescapes payload contents and supports unprefixed CORE payload elements', () => {
    const xml = '<COREEnvelopePayload>ISA*00*&amp;&lt;&gt;&quot;~</COREEnvelopePayload>';

    expect(extractCoreEnvelopePayload(xml)).toBe('ISA*00*&<>"~');
  });

  it('throws a clear error when the SOAP response has no CORE payload', () => {
    expect(() => extractCoreEnvelopePayload('<soap:Envelope />'))
      .toThrow('CORE SOAP response missing COREEnvelopePayload element');
  });
});
