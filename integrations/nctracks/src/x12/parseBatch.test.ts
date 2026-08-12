import { parse277CA } from './parse277ca';
import { parse271 } from './parse271';
import { parse835 } from './parse835';
import { parse999 } from './parse999';

describe('parse999', () => {
  it('parses accepted functional ack', () => {
    const raw = 'ISA*00* *00* *ZZ*NCXIX*ZZ*STUB*..*999*ACK~AK1*HC*1~AK9*A*1*1*1~IEA*1*~';
    const parsed = parse999(raw);
    expect(parsed.accepted).toBe(true);
    expect(parsed.errors).toHaveLength(0);
  });

  it('parses rejected ack with IK errors', () => {
    const raw = 'AK9*R*1*0*1~IK3*CLM*1*8~';
    const parsed = parse999(raw);
    expect(parsed.accepted).toBe(false);
    expect(parsed.errors[0]?.segment).toBe('CLM');
  });
});

describe('parse277CA', () => {
  it('parses per-claim STC rows', () => {
    const raw = 'ST*277*0001~STC*A0:20*20260601*WQ*PCN-001~';
    const parsed = parse277CA(raw);
    expect(parsed.status).toBe('accepted');
    expect(parsed.perClaim[0]?.patientControlNumber).toBe('PCN-001');
  });

  it('marks partial when mixed accept/reject', () => {
    const raw = 'STC*A0:20*20260601*WQ*PCN-1~STC*A7:21*20260601*WQ*PCN-2~';
    const parsed = parse277CA(raw);
    expect(parsed.status).toBe('partial');
  });

  it('marks partial when the rejected claim arrives before accepted claims', () => {
    const raw = 'STC*A7:21*20260601*WQ*PCN-REJECTED~STC*A0:20*20260601*WQ*PCN-ACCEPTED~';
    const parsed = parse277CA(raw);
    expect(parsed.status).toBe('partial');
    expect(parsed.perClaim).toEqual([
      expect.objectContaining({ patientControlNumber: 'PCN-REJECTED', status: 'rejected' }),
      expect.objectContaining({ patientControlNumber: 'PCN-ACCEPTED', status: 'accepted' }),
    ]);
  });

  it('marks the batch rejected only when every claim is rejected', () => {
    const raw = 'STC*A7:21*20260601*WQ*PCN-1~STC*A7:562*20260601*WQ*PCN-2~';
    expect(parse277CA(raw).status).toBe('rejected');
  });
});

describe('parse835', () => {
  it('parses CLP claim payments', () => {
    const raw = [
      'ST*835*0001~',
      'BPR*I*175.50*C*CHK*****01*021000021*DA*123*..*20260615~',
      'TRN*1*CHK-123*1234567890~',
      'CLP*PCN-1*1*200.00*175.50**MC*TCN-1*11*1~',
      'CAS*CO*45*24.50~',
      'SE*5*0001~',
    ].join('');
    const parsed = parse835(raw, 'RA.835', '2026-06-15T12:00:00.000Z');
    expect(parsed.checkOrEftNumber).toBe('CHK-123');
    expect(parsed.claims).toHaveLength(1);
    expect(parsed.claims[0]?.paidAmount).toBe(175.5);
    expect(parsed.claims[0]?.adjustments[0]?.reasonCode).toBe('45');
  });
});

describe('parse271', () => {
  it('parses active eligibility benefits, date range, and copay', () => {
    const raw = [
      'ST*271*0001~',
      'EB*1*IND*30**CAROLINA ACCESS**3.50~',
      'DTP*291*D8*20260601~',
      'DTP*292*D8*20260630~',
    ].join('');
    const parsed = parse271(raw);

    expect(parsed).toEqual({
      active: true,
      planName: 'CAROLINA ACCESS',
      effectiveFrom: '2026-06-01',
      effectiveTo: '2026-06-30',
      copay: 3.5,
    });
  });

  it('keeps AAA rejection details inactive even when separated by newlines', () => {
    const parsed = parse271('ST*271*0001\nAAA*N**42*C\r');

    expect(parsed.active).toBe(false);
    expect(parsed.aaaCode).toBe('42');
  });
});
