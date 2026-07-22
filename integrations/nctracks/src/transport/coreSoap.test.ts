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

  it('escapes XML-sensitive metadata and payload values', () => {
    const xml = buildCoreSoapEnvelope({
      payloadType: '276',
      payloadId: 'PAYLOAD<&"1',
      senderId: 'SENDER<&"1',
      receiverId: 'RECEIVER<&"1',
      x12Payload: 'ISA*<*&*"~',
      timestamp: '2026-07-11T12:00:00.000Z',
    });

    expect(xml).toContain('<cor:PayloadID>PAYLOAD&lt;&amp;&quot;1</cor:PayloadID>');
    expect(xml).toContain('<cor:SenderID>SENDER&lt;&amp;&quot;1</cor:SenderID>');
    expect(xml).toContain('<cor:ReceiverID>RECEIVER&lt;&amp;&quot;1</cor:ReceiverID>');
    expect(xml).toContain('<cor:COREEnvelopePayload>ISA*&lt;*&amp;*&quot;~</cor:COREEnvelopePayload>');
  });
});

describe('extractCoreEnvelopePayload', () => {
  it('pulls X12 from CORE response', () => {
    const xml = '<cor:COREEnvelopePayload>ISA*00*~</cor:COREEnvelopePayload>';
    expect(extractCoreEnvelopePayload(xml)).toBe('ISA*00*~');
  });

  it('pulls unprefixed payloads and decodes XML entities', () => {
    const xml = '<COREEnvelopePayload>ISA*&lt;*&amp;*&quot;~</COREEnvelopePayload>';
    expect(extractCoreEnvelopePayload(xml)).toBe('ISA*<*&*"~');
  });

  it('throws when the CORE response has no payload element', () => {
    expect(() => extractCoreEnvelopePayload('<soap:Envelope />'))
      .toThrow(/missing COREEnvelopePayload/);
  });
});