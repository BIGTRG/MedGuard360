import { parse277CA } from './parse277ca';
import { parse271 } from './parse271';
import { parse835 } from './parse835';
import { parse999 } from './parse999';

describe('parse271', () => {
  it('parses active coverage details and eligibility dates', () => {
    const raw = 'EB*1*IND*30*INS*NC MEDICAID**3.50~DTP*291*D8*20260601~DTP*292*D8*20261231~';
    const parsed = parse271(raw);
    expect(parsed.active).toBe(true);
    expect(parsed.planName).toBe('NC MEDICAID');
    expect(parsed.copay).toBe(3.5);
    expect(parsed.effectiveFrom).toBe('2026-06-01');
    expect(parsed.effectiveTo).toBe('2026-12-31');
  });

  it('keeps AAA rejection details inactive for follow-up handling', () => {
    const parsed = parse271('AAA*N**72*C~');
    expect(parsed.active).toBe(false);
    expect(parsed.aaaCode).toBe('72');
  });
});

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

  it('marks partial when a rejection is followed by an accepted claim', () => {
    const raw = 'STC*A7:21*20260601*WQ*PCN-1~STC*A0:20*20260601*WQ*PCN-2~';
    const parsed = parse277CA(raw);
    expect(parsed.status).toBe('partial');
    expect(parsed.perClaim[0]?.entityCode).toBe('WQ');
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

  it('parses repeated CAS reason and amount pairs under one group code', () => {
    const raw = [
      'ST*835*0001~',
      'BPR*I*170.25*C*CHK*****01*021000021*DA*123*..*20260615~',
      'TRN*1*CHK-456*1234567890~',
      'CLP*PCN-2*1*200.00*170.25**MC*TCN-2*11*1~',
      'CAS*CO*45*24.50*1*97*5.25*1~',
      'SE*5*0001~',
    ].join('');
    const parsed = parse835(raw, 'RA-2.835', '2026-06-15T12:00:00.000Z');
    expect(parsed.claims[0]?.adjustments).toEqual([
      { groupCode: 'CO', reasonCode: '45', amount: 24.5 },
      { groupCode: 'CO', reasonCode: '97', amount: 5.25 },
    ]);
  });
});
