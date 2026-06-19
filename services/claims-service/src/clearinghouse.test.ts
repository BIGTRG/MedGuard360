jest.mock('@medguard360/shared', () => ({
  logger: {
    info: jest.fn(),
  },
}));

import {
  activeClearinghouse,
  parse277CA,
  parse835,
  parse999,
  submit837P,
} from './clearinghouse';

describe('clearinghouse acknowledgment and remittance parsers', () => {
  it('marks accepted 999 acknowledgments without errors', () => {
    const parsed = parse999('ISA*00~GS*FA~ST*999*0001~AK9*A*1*1*1~SE*4*0001~');

    expect(parsed).toEqual({
      accepted: true,
      errors: [],
    });
  });

  it('surfaces rejected 999 IK3/IK4 segment errors', () => {
    const parsed = parse999(
      'ST*999*0001~AK2*HC*000000001~IK3*CLM*8*2300*8~IK4*2*782*1~AK9*R*1*1*0~SE*6*0001~',
    );

    expect(parsed.accepted).toBe(false);
    expect(parsed.errors).toEqual([
      { segment: 'CLM', message: 'rejected per IK3/IK4' },
    ]);
  });

  it('correlates 277CA status rows to their claim control numbers', () => {
    const parsed = parse277CA(
      [
        'ST*277*0001',
        'TRN*2*260517-000001',
        'STC*A2:20:PR*20260619*WQ*150',
        'TRN*2*260517-000002',
        'STC*A3:21:PR*20260619*U*75',
        'SE*6*0001',
      ].join('~'),
    );

    expect(parsed).toEqual([
      {
        claimControlNumber: '260517-000001',
        statusCategory: 'A2',
        statusCode: '20',
        statusDescription: '150',
      },
      {
        claimControlNumber: '260517-000002',
        statusCategory: 'A3',
        statusCode: '21',
        statusDescription: '75',
      },
    ]);
  });

  it('parses 835 paid amounts, patient responsibility, and adjustments in cents', () => {
    const parsed = parse835(
      'ST*835*0001~CLP*260517-000001*1*150*120*30~CAS*CO*45*30~SE*4*0001~',
    );

    expect(parsed).toEqual([
      {
        claimControlNumber: '260517-000001',
        paidAmountCents: 12000,
        patientResponsibilityCents: 3000,
        claimStatus: 'paid',
        adjustments: [{ groupCode: 'CO', reasonCode: '45', amountCents: 3000 }],
      },
    ]);
  });

  it('classifies denied and pending 835 claim statuses', () => {
    const parsed = parse835(
      [
        'ST*835*0001',
        'CLP*260517-000002*4*150*0*0',
        'CLP*260517-000003*19*150*0*0',
        'SE*4*0001',
      ].join('~'),
    );

    expect(parsed.map((claim) => ({
      claimControlNumber: claim.claimControlNumber,
      claimStatus: claim.claimStatus,
    }))).toEqual([
      { claimControlNumber: '260517-000002', claimStatus: 'denied' },
      { claimControlNumber: '260517-000003', claimStatus: 'pending' },
    ]);
  });
});

describe('clearinghouse selection and stub submission', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.useRealTimers();
    process.env = { ...originalEnv };
    delete process.env.CLEARINGHOUSE;
    delete process.env.CLEARINGHOUSE_NCMEDPAY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses payer-specific clearinghouse overrides before the default', () => {
    process.env.CLEARINGHOUSE = 'change_healthcare';
    process.env.CLEARINGHOUSE_NCMEDPAY = 'availity';

    expect(activeClearinghouse('NCMEDPAY')).toBe('availity');
    expect(activeClearinghouse('OTHER')).toBe('change_healthcare');
  });

  it('returns deterministic metadata for stub submissions', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_781_827_200_000);
    process.env.CLEARINGHOUSE = 'stub';

    const result = await submit837P(
      'ISA*00*          *00*          *ZZ*MEDGUARD       *ZZ*NCMEDPAY       *260619*1000*^*00501*000000123*0*T*:~',
      'NCMEDPAY',
    );

    expect(result).toMatchObject({
      ok: true,
      clearinghouse: 'stub',
      vendorSubmissionId: 'stub-1781827200000',
      ourControlNumber: '000000123',
    });
    expect(result.acknowledgmentReceivedAt).toEqual(expect.any(String));
  });
});
