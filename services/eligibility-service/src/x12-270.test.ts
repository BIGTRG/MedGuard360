import { build270, Build270Input, parse271 } from './x12-270';

const baseBuildInput = (): Build270Input => ({
  sender: { qualifier: 'ZZ', id: 'MEDGUARD360', name: 'MedGuard360' },
  receiver: { qualifier: 'ZZ', id: 'CMSHETS', name: 'CMS HETS' },
  interchangeControlNumber: '123',
  groupControlNumber: '456',
  productionMode: 'T',
  payerId: 'CMSMED',
  payerName: 'CMS Medicare',
  providerNpi: '1234567890',
  providerName: 'TRG Clinic',
  subscriberLastName: 'Doe',
  subscriberFirstName: 'Jane',
  subscriberMemberId: 'MID12345',
  subscriberDateOfBirth: '19750115',
});

describe('build270', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-12T14:30:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses the HETS submitter UID in ISA06 when provided', () => {
    const payload = build270({
      ...baseBuildInput(),
      hetsSubmitterUid: 'HETSUID123',
    });

    const isa = payload.split('~')[0];
    const isaElements = isa.split('*');

    expect(isaElements[6]).toBe('HETSUID123     ');
    expect(isaElements[8]).toBe('CMSHETS        ');
    expect(payload).toContain('GS*HS*MEDGUARD360*CMSHETS*20260512*1430*456*X*005010X279A1~');
  });

  it('emits a health benefit plan coverage inquiry by default', () => {
    const payload = build270(baseBuildInput());

    expect(payload).toContain('ST*270*0001*005010X279A1~');
    expect(payload).toContain('BHT*0022*13*MG-1778596200000*20260512*1430~');
    expect(payload).toContain('DTP*291*D8*20260512~');
    expect(payload).toContain('EQ*30~');
  });
});

describe('parse271', () => {
  it('flags HETS attestation failures from AAA reject code 41', () => {
    const parsed = parse271('ISA*00~AAA*N**41*C~SE*3~');

    expect(parsed.active).toBe(false);
    expect(parsed.aaaCodes).toEqual(['41']);
    expect(parsed.requiresHetsAttestation).toBe(true);
    expect(parsed.rejectReason).toContain('HETS submitter not authorized');
  });

  it('marks active coverage and extracts benefit amount details', () => {
    const parsed = parse271([
      'ST*271*0001',
      'EB*1*IND*30**NC Medicaid*23*15.25*****Y',
      'AMT*R*250.50',
      'SE*4*0001',
    ].join('~'));

    expect(parsed.active).toBe(true);
    expect(parsed.planName).toBe('NC Medicaid');
    expect(parsed.copayCents).toBe(1525);
    expect(parsed.deductibleRemainingCents).toBe(25050);
    expect(parsed.benefits).toEqual([
      {
        serviceType: '30',
        coverageLevel: 'IND',
        inPlanNetwork: true,
        amountCents: 1525,
      },
    ]);
  });

  it('parses coverage begin and end DTP segments into ISO dates', () => {
    const parsed = parse271('DTP*291*D8*20260501~DTP*292*D8*20261231~');

    expect(parsed.effectiveFrom).toBe('2026-05-01');
    expect(parsed.effectiveTo).toBe('2026-12-31');
  });

  it('keeps coverage inactive when only inactive EB segments are returned', () => {
    const parsed = parse271('EB*6*IND*30**Terminated Plan~');

    expect(parsed.active).toBe(false);
    expect(parsed.requiresHetsAttestation).toBe(false);
    expect(parsed.aaaCodes).toEqual([]);
    expect(parsed.benefits).toEqual([
      {
        serviceType: '30',
        coverageLevel: 'IND',
        inPlanNetwork: false,
        amountCents: undefined,
      },
    ]);
  });
});
