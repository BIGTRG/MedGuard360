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

  it('escapes XML metacharacters in payload and identifiers', () => {
    const xml = buildCoreSoapEnvelope({
      payloadType: '270',
      payloadId: 'PAYLOAD<&"1',
      senderId: 'SENDER<&',
      receiverId: 'RECEIVER>',
      x12Payload: 'ISA*00*&<>"~',
      timestamp: '2026-07-11T12:00:00.000Z',
    });

    expect(xml).toContain('<cor:PayloadID>PAYLOAD&lt;&amp;&quot;1</cor:PayloadID>');
    expect(xml).toContain('<cor:SenderID>SENDER&lt;&amp;</cor:SenderID>');
    expect(xml).toContain('<cor:ReceiverID>RECEIVER&gt;</cor:ReceiverID>');
    expect(xml).toContain('<cor:COREEnvelopePayload>ISA*00*&amp;&lt;&gt;&quot;~</cor:COREEnvelopePayload>');
  });
});

describe('extractCoreEnvelopePayload', () => {
  it('pulls X12 from CORE response', () => {
    const xml = '<cor:COREEnvelopePayload>ISA*00*~</cor:COREEnvelopePayload>';
    expect(extractCoreEnvelopePayload(xml)).toBe('ISA*00*~');
  });

  it('pulls X12 from an unprefixed CORE payload element', () => {
    const xml = '<COREEnvelopePayload>ISA*00*&lt;EB&gt;~</COREEnvelopePayload>';
    expect(extractCoreEnvelopePayload(xml)).toBe('ISA*00*<EB>~');
  });

  it('unescapes ampersands after entity-specific replacements', () => {
    const xml = '<cor:COREEnvelopePayload>ISA*00*&amp;lt;literal&amp;gt;~</cor:COREEnvelopePayload>';
    expect(extractCoreEnvelopePayload(xml)).toBe('ISA*00*&lt;literal&gt;~');
  });

  it('throws when the response has no CORE payload element', () => {
    expect(() => extractCoreEnvelopePayload('<soap:Envelope />'))
      .toThrow('CORE SOAP response missing COREEnvelopePayload element');
  });
});