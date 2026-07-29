import { parse277 } from './parse277';

describe('parse277', () => {
  it('maps paid STC to paid status', () => {
    const raw = 'ST*277*0001~STC*F1:65*20260615~REF*1K*TCN-PAID~AMT*AU*87.42~';
    const parsed = parse277(raw);
    expect(parsed.status).toBe('paid');
    expect(parsed.payerClaimControlNumber).toBe('TCN-PAID');
    expect(parsed.paidAmount).toBe(87.42);
  });

  it('maps denied STC to denied status', () => {
    const parsed = parse277('STC*F2:24*20260601~');
    expect(parsed.status).toBe('denied');
    expect(parsed.categoryCode).toBe('F2');
  });

  it('maps pending/in_process codes', () => {
    expect(parse277('STC*A1:20~').status).toBe('pending');
    expect(parse277('STC*A3:19~').status).toBe('in_process');
  });
});