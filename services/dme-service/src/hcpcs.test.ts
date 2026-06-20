import { validate, validateHcpcs } from './hcpcs';

describe('validateHcpcs', () => {
  it('recognizes seeded CPAP code', () => {
    const result = validateHcpcs('E0601');
    expect(result.valid).toBe(true);
    expect(result.requiresPA).toBe(true);
    expect(result.category).toBe('respiratory');
  });

  it('rejects unknown codes', () => {
    expect(validateHcpcs('ZZ9999').valid).toBe(false);
  });
});

describe('validate', () => {
  it('requires PA for CPAP without prior auth', () => {
    const result = validate({
      hcpcsCode: 'E0601',
      quantity: 1,
      rentalOrPurchase: 'rental',
      cmnComplete: true,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('prior authorization'))).toBe(true);
  });

  it('enforces diabetic supply monthly cap', () => {
    const result = validate({
      hcpcsCode: 'A4253',
      quantity: 99,
      rentalOrPurchase: 'purchase',
      cmnComplete: true,
    });
    expect(result.valid).toBe(false);
  });
});