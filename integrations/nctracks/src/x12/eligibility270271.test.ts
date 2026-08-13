import { build270ForNctracks } from './build270';
import { parse271 } from './parse271';
import type { NctracksConfig } from '../types';

const config: NctracksConfig = {
  mode: 'stub',
  env: 'test',
  realtime: {
    eligibilityUrl: 'https://example.test/eligibility',
    claimStatusUrl: 'https://example.test/status',
    timeoutMs: 5000,
  },
  batch: {},
  identifiers: {
    tpid: 'TPID',
    submitterId: 'SUBMITTER',
    submitterQualifier: 'ZZ',
    receiverId: 'NCXIX',
    receiverQualifier: 'ZZ',
    billingNpi: '1234567890',
    billingTaxonomy: '261Q00000X',
    usageIndicator: 'T',
  },
  auth: {},
};

function segmentCountFromStThroughSe(payload: string): number {
  const segments = payload.split(/[~\n\r]+/).filter(Boolean);
  const stIndex = segments.findIndex((segment) => segment.startsWith('ST*'));
  const seIndex = segments.findIndex((segment) => segment.startsWith('SE*'));
  return seIndex - stIndex + 1;
}

describe('build270ForNctracks', () => {
  it('sets SE01 to the ST-through-SE segment count', () => {
    const payload = build270ForNctracks({
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-08-13',
      providerNpi: '1234567890',
      firstName: 'Jane',
      lastName: 'Doe',
      dob: '1990-01-01',
    }, config, '123');

    const se = payload.split(/[~\n\r]+/).find((segment) => segment.startsWith('SE*'));
    expect(se?.split('*')[1]).toBe(String(segmentCountFromStThroughSe(payload)));
  });
});

describe('parse271', () => {
  it('does not mark coverage active after an AAA rejection', () => {
    const parsed = parse271('ST*271*0001~AAA*N**72*C~EB*1*IND*30**MEDICAID~SE*4*0001~');
    expect(parsed.active).toBe(false);
    expect(parsed.aaaCode).toBe('72');
  });

  it('ignores non-health-plan active EB segments for overall active status', () => {
    const parsed = parse271('ST*271*0001~EB*6*IND*30~EB*1*IND*88**PHARMACY~SE*4*0001~');
    expect(parsed.active).toBe(false);
  });
});
