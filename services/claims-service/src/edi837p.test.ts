import { Edi837PInput, generateEdi837P } from './edi837p';

describe('generateEdi837P', () => {
  let payload = '';

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-19T10:00:00.000Z'));
    payload = generateEdi837P(input);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const input: Edi837PInput = {
    ccn: '260517-000042',
    submitterId: 'MEDGUARD',
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
    totalCharge: 150,
    placeOfService: '11',
    claimLines: [{
      line_number: 1,
      procedure_code: '99213',
      modifier_codes: ['25'],
      diagnosis_pointers: [1],
      service_date: '2026-05-10',
      units: 1,
      charge_amount: 150,
      place_of_service: '11',
    }],
  };

  it('emits a well-formed ISA envelope', () => {
    expect(payload.startsWith('ISA*')).toBe(true);
    expect(payload).toContain('GS*HC*MEDGUARD*NCMEDPAY*20260619*1000*260517000*X*005010X222A1');
    expect(payload).toContain('ST*837*0001*005010X222A1');
  });

  it('includes the claim control number in BHT and CLM', () => {
    expect(payload).toContain('BHT*0019*00*260517-000042');
    expect(payload).toContain('CLM*260517-000042*150.00');
  });

  it('emits one LX/SV1/DTP triplet per line', () => {
    expect(payload).toContain('LX*1');
    expect(payload).toContain('SV1*HC:99213:25*150.00*UN*1*11**1');
    expect(payload).toContain('DTP*472*D8*20260510');
  });

  it('closes with SE/GE/IEA', () => {
    expect(payload).toContain('SE*');
    expect(payload).toContain('GE*1*260517000');
    expect(payload).toContain('IEA*1*260517000');
    expect(payload.trim().endsWith('~')).toBe(true);
  });
});
