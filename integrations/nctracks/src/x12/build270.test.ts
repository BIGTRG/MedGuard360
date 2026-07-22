import { build270ForNctracks } from './build270';
import type { NctracksConfig } from '../types';

const config: NctracksConfig = {
  mode: 'soap',
  env: 'test',
  realtime: {
    eligibilityUrl: 'https://edi.example.com/CORE/Eligibility',
    claimStatusUrl: 'https://edi.example.com/CORE/ClaimStatus',
    timeoutMs: 30_000,
  },
  batch: {},
  identifiers: {
    tpid: 'TEST-TPID',
    submitterId: 'TESTSUBMITTER',
    submitterQualifier: 'ZZ',
    receiverId: 'NCXIX',
    receiverQualifier: 'ZZ',
    billingNpi: '1234567890',
    billingTaxonomy: '207Q00000X',
    usageIndicator: 'T',
  },
  auth: {
    clientCertPem: 'cert',
    clientKeyPem: 'key',
  },
};

describe('build270ForNctracks', () => {
  it('sets SE01 to the number of transaction segments from ST through SE', () => {
    const x12 = build270ForNctracks({
      subscriberId: 'NCMD00100001',
      dateOfService: '2026-07-22',
      firstName: 'Jane',
      lastName: 'Doe',
      dob: '1980-01-02',
      traceId: 'TRACE-1',
    }, config, '123');

    const segments = x12.split(/[~\n\r]+/).map((segment) => segment.trim()).filter(Boolean);
    const stIndex = segments.findIndex((segment) => segment.startsWith('ST*'));
    const seIndex = segments.findIndex((segment) => segment.startsWith('SE*'));
    expect(stIndex).toBeGreaterThanOrEqual(0);
    expect(seIndex).toBeGreaterThan(stIndex);

    const seSegment = segments[seIndex];
    if (!seSegment) {
      throw new Error('Missing SE segment');
    }
    const seCount = Number.parseInt(seSegment.split('*')[1] ?? '', 10);
    expect(seCount).toBe(seIndex - stIndex + 1);
  });
});
