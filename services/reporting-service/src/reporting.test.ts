import { toPipeDelimited } from './perm';
import { buildFilename } from './tmsis';

describe('toPipeDelimited', () => {
  it('emits CMS PERM pipe header and row', () => {
    const out = toPipeDelimited([{
      claim_id: 'c1',
      state_code: 'NC',
      service_from: '2026-05-01',
      service_to: '2026-05-01',
      paid_amount_cents: 12500,
      member_id: 'MID000001',
      provider_npi: '1234567890',
      payer_id: 'NCMEDPAY',
      claim_type: 'professional',
      diagnosis_primary: 'I10',
    }]);
    expect(out.split('\n')[0]).toBe('CLAIM_ID|STATE|DOS_FROM|DOS_TO|PAID_CENTS|MEMBER_ID|PROV_NPI|PAYER|TYPE|DX_PRIMARY');
    expect(out).toContain('c1|NC|2026-05-01|2026-05-01|12500|MID000001|1234567890|NCMEDPAY|professional|I10');
  });

  it('renders empty diagnosis as blank field', () => {
    const out = toPipeDelimited([{
      claim_id: 'c2', state_code: 'NC', service_from: '2026-05-02', service_to: '2026-05-02',
      paid_amount_cents: 0, member_id: 'MID000002', provider_npi: '1234567890',
      payer_id: 'NCMEDPAY', claim_type: 'professional', diagnosis_primary: '',
    }]);
    expect(out.endsWith('|')).toBe(true);
  });
});

describe('buildFilename', () => {
  it('follows CMS T-MSIS naming convention', () => {
    const name = buildFilename({ state_code: 'NC', reporting_period: '202606', file_type: 'ELIGIBLE' });
    expect(name).toBe('T-MSIS_ELIGIBLE_NC_202606_001.txt');
  });
});