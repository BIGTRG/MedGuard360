import { CreatePatientSchema, serializePatient } from './patientCore';

describe('CreatePatientSchema', () => {
  it('accepts valid NC member registration', () => {
    const parsed = CreatePatientSchema.parse({
      medicaid_id: 'MID000001',
      first_name: 'Jane',
      last_name: 'Doe',
      dob: '1980-01-01',
      state_code: 'NC',
    });
    expect(parsed.state_code).toBe('NC');
  });

  it('rejects invalid DOB format', () => {
    expect(() => CreatePatientSchema.parse({
      medicaid_id: 'MID000001',
      first_name: 'Jane',
      last_name: 'Doe',
      dob: '01/01/1980',
      state_code: 'NC',
    })).toThrow();
  });
});

describe('serializePatient', () => {
  it('formats Date DOB for member portal responses', () => {
    const out = serializePatient({
      id: '10000000-0000-0000-0000-000000000001',
      first_name: 'Jane',
      last_name: 'Doe',
      date_of_birth: new Date('1980-01-01T00:00:00.000Z'),
      medicaid_id: 'MID000001',
      state_code: 'NC',
    });
    expect(out.patient_id).toBe('10000000-0000-0000-0000-000000000001');
    expect(out.date_of_birth).toBe('1980-01-01');
  });
});