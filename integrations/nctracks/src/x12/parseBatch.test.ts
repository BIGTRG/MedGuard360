import { parse277CA } from './parse277ca';
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

  it('extracts remittance header, payee, and service line details used for posting', () => {
    const raw = [
      'ST*835*0002~',
      'BPR*I*250.00*C*ACH*CCP*01*021000021*DA*123456789*1512345678**01*999999999*DA*987654321*20260615~',
      'TRN*1*EFT-20260615*1234567890~',
      'N1*PE*TRG CLINIC*XX*1234567893~',
      'CLP*PCN-1*1*200.00*150.00**MC*TCN-1*11*1~',
      'CAS*CO*45*50.00~',
      'SVC*HC:99213:25:GT*200.00*150.00~',
      'CLP*PCN-2*2*120.00*100.00**MC*TCN-2*11*1~',
      'CAS*PR*1*20.00~',
      'SE*9*0002~',
    ].join('');

    const parsed = parse835(raw, 'RA_20260615.835', '2026-06-15T14:30:00.000Z');

    expect(parsed.fileName).toBe('RA_20260615.835');
    expect(parsed.receivedAt).toBe('2026-06-15T14:30:00.000Z');
    expect(parsed.checkOrEftNumber).toBe('EFT-20260615');
    expect(parsed.paymentDate).toBe('2026-06-15');
    expect(parsed.payeeNpi).toBe('1234567893');
    expect(parsed.totalPaid).toBe(250);
    expect(parsed.claims).toHaveLength(2);
    expect(parsed.claims[0]).toMatchObject({
      patientControlNumber: 'PCN-1',
      payerClaimControlNumber: 'TCN-1',
      chargedAmount: 200,
      paidAmount: 150,
      claimStatusCode: '1',
    });
    expect(parsed.claims[0]?.adjustments).toEqual([{ groupCode: 'CO', reasonCode: '45', amount: 50 }]);
    expect(parsed.claims[0]?.serviceLines[0]).toMatchObject({
      procedureCode: '99213',
      modifiers: ['25', 'GT'],
      chargedAmount: 200,
      paidAmount: 150,
    });
    expect(parsed.claims[1]?.adjustments).toEqual([{ groupCode: 'PR', reasonCode: '1', amount: 20 }]);
  });

  it('falls back to summed claim payments when BPR total is absent', () => {
    const raw = [
      'ST*835*0003',
      'TRN*1*CHK-456',
      'CLP*PCN-10*1*100.00*80.00**MC*TCN-10*11*1',
      'CLP*PCN-11*1*40.00*30.00**MC*TCN-11*11*1',
      'SE*5*0003',
    ].join('\n');

    const parsed = parse835(raw, 'RA_20260616.835', '2026-06-16T09:00:00.000Z');

    expect(parsed.checkOrEftNumber).toBe('CHK-456');
    expect(parsed.claims.map((claim) => claim.patientControlNumber)).toEqual(['PCN-10', 'PCN-11']);
    expect(parsed.totalPaid).toBe(110);
  });
});
