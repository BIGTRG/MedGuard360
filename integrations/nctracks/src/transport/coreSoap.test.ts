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
});

describe('extractCoreEnvelopePayload', () => {
  it('pulls X12 from CORE response', () => {
    const xml = '<cor:COREEnvelopePayload>ISA*00*~</cor:COREEnvelopePayload>';
    expect(extractCoreEnvelopePayload(xml)).toBe('ISA*00*~');
  });
});