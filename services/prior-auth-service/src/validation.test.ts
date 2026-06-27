import { CriterionOverrideSchema } from './validation';

describe('CriterionOverrideSchema', () => {
  it('normalizes legacy UI outcome unclear to canonical indeterminate', () => {
    const parsed = CriterionOverrideSchema.parse({ outcome: 'unclear' });

    expect(parsed).toEqual({ outcome: 'indeterminate' });
  });

  it.each(['met', 'not_met', 'indeterminate'] as const)(
    'accepts canonical outcome %s without changing it',
    (outcome) => {
      expect(CriterionOverrideSchema.parse({ outcome })).toEqual({ outcome });
    },
  );

  it('rejects values that are not valid criterion outcomes', () => {
    expect(() => CriterionOverrideSchema.parse({ outcome: 'approved' })).toThrow();
  });
});
