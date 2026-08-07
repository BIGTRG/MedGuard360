import { build270ForNctracks } from './build270';
import type { EligibilityRequest, NctracksConfig } from '../types';

const config: NctracksConfig = {
  mode: 'stub',
  env: 'test',
  realtime: {
    eligibilityUrl: 'https://example.invalid/eligibility',
    claimStatusUrl: 'https://example.invalid/status',
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

const request: EligibilityRequest = {
  subscriberId: 'NCMD00100001',
  dateOfService: '2026-07-06',
  providerNpi: '1234567890',
  firstName: 'Jane',
  lastName: 'Doe',
  dob: '1980-01-02',
  traceId: 'TRACE-1',
};

describe('build270ForNctracks', () => {
  it('sets SE01 to the ST-through-SE segment count', () => {
    const payload = build270ForNctracks(request, config, '42');
    const segments = payload.split(/[~\n\r]+/).filter(Boolean);
    const stIndex = segments.findIndex((segment) => segment.startsWith('ST*'));
    const seIndex = segments.findIndex((segment) => segment.startsWith('SE*'));
    const seCount = Number.parseInt(segments[seIndex].split('*')[1], 10);

    expect(stIndex).toBeGreaterThanOrEqual(0);
    expect(seIndex).toBeGreaterThan(stIndex);
    expect(seCount).toBe(seIndex - stIndex + 1);
  });
});
