import { FraudThresholds, PaRuleQuery, StateConfigBody } from './routes';

describe('PaRuleQuery', () => {
  it('accepts valid NC PA lookup params', () => {
    const parsed = PaRuleQuery.parse({ state: 'NC', payer: 'NCMEDPAY', code: '99213' });
    expect(parsed.code).toBe('99213');
  });

  it('rejects invalid state length', () => {
    expect(() => PaRuleQuery.parse({ state: 'N', payer: 'NCMEDPAY', code: '99213' })).toThrow();
  });
});

describe('FraudThresholds', () => {
  it('rejects negative thresholds', () => {
    expect(() => FraudThresholds.parse({ auto_pay_below: -1, auto_block_above: 80 })).toThrow();
  });
});

describe('StateConfigBody', () => {
  it('accepts MMIS endpoint updates', () => {
    const parsed = StateConfigBody.parse({
      mmis_endpoint: 'https://mmis.nc.gov/api',
      timely_filing_days: 365,
    });
    expect(parsed.timely_filing_days).toBe(365);
  });
});