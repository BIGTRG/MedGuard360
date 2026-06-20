import { generateNcpdpD0, validateClaim, NcpdpPharmacyClaimInput } from './ncpdp';

const validClaim: NcpdpPharmacyClaimInput = {
  bin: '610014',
  pcn: 'MG360',
  cardholderId: 'MID000001',
  patientFirstName: 'John',
  patientLastName: 'Doe',
  patientDateOfBirth: '19800101',
  prescriberNpi: '1234567890',
  pharmacyNpi: '9876543210',
  ndc: '00002143380',
  quantityDispensed: '30.000',
  daysSupply: 30,
  refillNumber: 0,
  dateOfService: '20260601',
  grossAmountDueCents: 1500,
};

describe('validateClaim', () => {
  it('accepts a well-formed claim', () => {
    expect(validateClaim(validClaim)).toBeNull();
  });

  it('rejects invalid NDC', () => {
    expect(validateClaim({ ...validClaim, ndc: '123' })?.code).toBe('21');
  });
});

describe('generateNcpdpD0', () => {
  it('includes NDC and pharmacy NPI', () => {
    const payload = generateNcpdpD0({
      ndc: '00002143380',
      quantity: 30,
      daysSupply: 30,
      fillDate: '2026-06-01',
      patientMedicaidId: 'MID000001',
      pharmacyNpi: '9876543210',
      payerId: 'NCMEDPAY',
      totalAmount: 15.0,
    });
    expect(payload).toContain('NDC=00002143380');
    expect(payload).toContain('NPI=9876543210');
  });
});