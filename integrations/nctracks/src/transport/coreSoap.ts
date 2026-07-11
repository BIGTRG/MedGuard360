/**
 * CAQH CORE 2.2.0 SOAP envelope helpers for NCTracks real-time EDI (270/271, 276/277).
 */

export interface CoreEnvelopeInput {
  payloadType: '270' | '276';
  payloadId: string;
  senderId: string;
  receiverId: string;
  x12Payload: string;
  timestamp?: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildCoreSoapEnvelope(input: CoreEnvelopeInput): string {
  const ts = input.timestamp ?? new Date().toISOString();
  const payload = escapeXml(input.x12Payload);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:cor="http://www.caqh.org/SOAP/WSDL/CORERule2.2.0.xsd">',
    '  <soap:Header>',
    `    <cor:PayloadID>${escapeXml(input.payloadId)}</cor:PayloadID>`,
    '  </soap:Header>',
    '  <soap:Body>',
    '    <cor:COREEnvelopeRealTimeRequest>',
    `      <cor:PayloadType>${input.payloadType}</cor:PayloadType>`,
    '      <cor:ProcessingMode>RealTime</cor:ProcessingMode>',
    `      <cor:PayloadID>${escapeXml(input.payloadId)}</cor:PayloadID>`,
    `      <cor:TimeStamp>${escapeXml(ts)}</cor:TimeStamp>`,
    `      <cor:SenderID>${escapeXml(input.senderId)}</cor:SenderID>`,
    `      <cor:ReceiverID>${escapeXml(input.receiverId)}</cor:ReceiverID>`,
    `      <cor:COREEnvelopePayload>${payload}</cor:COREEnvelopePayload>`,
    '    </cor:COREEnvelopeRealTimeRequest>',
    '  </soap:Body>',
    '</soap:Envelope>',
  ].join('\n');
}

/** Extract X12 payload from a CORE real-time SOAP response body. */
export function extractCoreEnvelopePayload(responseXml: string): string {
  const match = responseXml.match(/<cor:COREEnvelopePayload>([\s\S]*?)<\/cor:COREEnvelopePayload>/i)
    ?? responseXml.match(/<COREEnvelopePayload>([\s\S]*?)<\/COREEnvelopePayload>/i);
  if (!match?.[1]) {
    throw new Error('CORE SOAP response missing COREEnvelopePayload element');
  }
  return match[1]
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .trim();
}