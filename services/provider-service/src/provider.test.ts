import { CreateSchema } from './routes';

describe('CreateSchema', () => {
  it('requires 10-digit NPI', () => {
    const parsed = CreateSchema.parse({
      npi: '1234567890',
      type: 'individual',
      legalName: 'Demo Clinic PLLC',
      stateCode: 'NC',
    });
    expect(parsed.npi).toBe('1234567890');
  });

  it('rejects non-numeric NPI', () => {
    expect(() => CreateSchema.parse({
      npi: '123456789',
      type: 'individual',
      legalName: 'Demo Clinic PLLC',
    })).toThrow();
  });
});