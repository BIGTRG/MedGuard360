import { generateEdi837P, Edi837PInput } from './edi837p';

const baseInput: Edi837PInput = {
  ccn: '260517-000001',
  submitterId: 'MEDGUARD360',
  billingNpi: '1234567890',
  billingName: 'Provider Inc.',
  billingAddress: { street: '1 Main', city: 'Raleigh', state: 'NC', zip: '27601' },
  payerId: 'NCMEDPAY',
  payerName: 'NC Medicaid',
  providerNpi: '1234567890',
  providerName: 'Provider Inc.',
  patientMedicaidId: 'MID000001',
  patientName: { first: 'John', last: 'Doe' },
  patientDob: '19800101',
  patientGender: 'M',
  serviceDate: '20260510',
  diagnosisCodes: ['F32.9'],
  claimLines: [{
    line_number: 1,
    procedure_code: '99213',
    modifier_codes: [],
    diagnosis_pointers: [1],
    service_date: '20260510',
    units: 1,
    charge_amount: 150.00,
    place_of_service: '11',
  }],
  totalCharge: 150.00,
};

describe('generateEdi837P', () => {
  const payload = generateEdi837P(baseInput);

  it('emits a well-formed ISA envelope', () => {
    expect(payload.startsWith('ISA*')).toBe(true);
    expect(payload).toContain('GS*HC*');
    expect(payload).toContain('ST*837*');
  });

  it('includes the claim control number in BHT and CLM', () => {
    expect(payload).toContain('260517-000001');
    expect(payload).toContain('CLM*260517-000001');
  });

  it('emits one LX/SV1/DTP triplet per line', () => {
    expect(payload).toContain('LX*1');
    expect(payload).toContain('SV1*');
    expect(payload).toContain('DTP*472*D8*20260510');
  });

  it('closes with SE/GE/IEA', () => {
    expect(payload).toContain('SE*');
    expect(payload).toContain('GE*1*');
    expect(payload.trim().endsWith('~')).toBe(true);
  });
});
