import { buildFhirPatient, buildFhirServiceRequest, parseFhirBundle } from './fhir';

describe('buildFhirPatient', () => {
  it('maps NC Medicaid patient to US Core FHIR Patient', () => {
    const patient = buildFhirPatient({
      id: '10000000-0000-0000-0000-000000000001',
      firstName: 'Jane',
      lastName: 'Doe',
      dob: '1980-01-01',
      medicaidId: 'MID000001',
      stateCode: 'NC',
      gender: 'female',
      phone: '9195550100',
    });
    expect(patient.resourceType).toBe('Patient');
    expect(patient.id).toBe('10000000-0000-0000-0000-000000000001');
    const identifier = (patient.identifier as Array<Record<string, unknown>>)[0];
    expect(String(identifier.system)).toContain('.NC');
    expect(identifier.value).toBe('MID000001');
    expect(patient.birthDate).toBe('1980-01-01');
  });
});

describe('buildFhirServiceRequest', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-01T12:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('maps elective priority to routine and attaches NPI', () => {
    const req = buildFhirServiceRequest({
      referralId: 'ref-1',
      patientId: 'pat-1',
      reason: 'Cardiology consult',
      priority: 'elective',
      requesterId: 'prac-1',
      requesterNpi: '1234567890',
      toProviderId: 'prac-2',
    });
    expect(req.priority).toBe('routine');
    const requester = req.requester as Record<string, unknown>;
    expect((requester.identifier as Record<string, unknown>).value).toBe('1234567890');
    expect(req.performer).toHaveLength(1);
  });
});

describe('parseFhirBundle', () => {
  it('returns stub Patient and Condition when bundle is empty', () => {
    const entries = parseFhirBundle({});
    expect(entries).toHaveLength(2);
    expect(entries[0].resourceType).toBe('Patient');
    expect(entries[0].data._stub).toBe(true);
  });

  it('parses real Bundle entries', () => {
    const entries = parseFhirBundle({
      resourceType: 'Bundle',
      entry: [{ resource: { resourceType: 'Observation', id: 'obs-1', status: 'final' } }],
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('obs-1');
  });
});