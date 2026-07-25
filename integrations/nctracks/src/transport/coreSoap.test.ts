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

  it('escapes XML-sensitive identifiers and payload content', () => {
    const xml = buildCoreSoapEnvelope({
      payloadType: '276',
      payloadId: 'PAYLOAD<&"1">',
      senderId: 'SENDER&1',
      receiverId: 'RECEIVER<1>',
      x12Payload: 'ISA*<tag>&"value"~',
      timestamp: '2026-07-11T12:00:00.000Z',
    });

    expect(xml).toContain('PAYLOAD&lt;&amp;&quot;1&quot;&gt;');
    expect(xml).toContain('<cor:SenderID>SENDER&amp;1</cor:SenderID>');
    expect(xml).toContain('<cor:ReceiverID>RECEIVER&lt;1&gt;</cor:ReceiverID>');
    expect(xml).toContain('ISA*&lt;tag&gt;&amp;&quot;value&quot;~');
  });
});

describe('extractCoreEnvelopePayload', () => {
  it('pulls X12 from CORE response', () => {
    const xml = '<cor:COREEnvelopePayload>ISA*00*~</cor:COREEnvelopePayload>';
    expect(extractCoreEnvelopePayload(xml)).toBe('ISA*00*~');
  });

  it('decodes unprefixed payload elements and rejects missing payloads', () => {
    expect(extractCoreEnvelopePayload(
      '<COREEnvelopePayload>ISA*&lt;tag&gt;&amp;&quot;value&quot;~</COREEnvelopePayload>',
    )).toBe('ISA*<tag>&"value"~');

    expect(() => extractCoreEnvelopePayload('<soap:Envelope />'))
      .toThrow(/missing COREEnvelopePayload/);
  });
});