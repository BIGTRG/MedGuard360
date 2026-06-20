import { build270, parse271, Build270Input } from './x12-270';

const baseInput: Build270Input = {
  sender: { qualifier: 'ZZ', id: 'MEDGUARD360', name: 'MedGuard360' },
  receiver: { qualifier: 'ZZ', id: 'NCMEDPAY', name: 'NC Medicaid' },
  interchangeControlNumber: '000000001',
  groupControlNumber: '000000001',
  productionMode: 'T',
  payerId: 'NCMEDPAY',
  payerName: 'NC Medicaid',
  providerNpi: '1234567890',
  providerName: 'Demo Provider',
  subscriberLastName: 'Doe',
  subscriberFirstName: 'John',
  subscriberMemberId: 'MID000001',
  subscriberDateOfBirth: '19800101',
  subscriberGender: 'M',
  serviceDate: '20260510',
  serviceTypeCode: '30',
};

describe('build270', () => {
  it('emits a well-formed ISA envelope', () => {
    const payload = build270(baseInput);
    expect(payload.startsWith('ISA*')).toBe(true);
    expect(payload).toContain('ST*270*');
    expect(payload).toContain('EQ*30~');
  });

  it('uses HETS submitter UID in ISA06 when provided', () => {
    const payload = build270({ ...baseInput, hetsSubmitterUid: 'HETSUID123456' });
    expect(payload.split('~')[0]).toContain('HETSUID123456');
  });
});

describe('parse271', () => {
  it('detects active coverage from EB segments', () => {
    const parsed = parse271('EB*1*IND*30*INS*Plan Name~');
    expect(parsed.active).toBe(true);
    expect(parsed.planName).toBe('Plan Name');
  });

  it('flags HETS AAA 41 attestation requirement', () => {
    const parsed = parse271('AAA*N**41*C~');
    expect(parsed.requiresHetsAttestation).toBe(true);
    expect(parsed.aaaCodes).toContain('41');
    expect(parsed.active).toBe(false);
  });
});