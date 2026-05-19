import { verifyBiometric } from './biometric';

describe('verifyBiometric', () => {
  it('passes when vendor returns a high-confidence match', async () => {
    const result = await verifyBiometric({
      userId: 'u1', modality: 'face',
      samplePayloadBase64: Buffer.from('PASS').toString('base64'),
    });
    expect(result.verified).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0.92);
  });

  it('rejects when vendor returns a low score', async () => {
    const result = await verifyBiometric({
      userId: 'u1', modality: 'thumbprint',
      samplePayloadBase64: Buffer.from('FAIL').toString('base64'),
    });
    expect(result.verified).toBe(false);
  });
});
