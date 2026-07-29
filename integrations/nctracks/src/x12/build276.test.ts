import { build276ForNctracks } from './build276';
import { loadNctracksConfig } from '../config';
import type { ClaimStatusRequest } from '../types';

const req: ClaimStatusRequest = {
  patientControlNumber: 'PCN-276-1',
  subscriberId: 'NCMD00100007',
  payerClaimControlNumber: 'TCN-999',
  serviceDateFrom: '2026-06-01',
  serviceDateTo: '2026-06-01',
  providerNpi: '1234567890',
};

describe('build276ForNctracks', () => {
  const config = loadNctracksConfig({ NCTRACKS_MODE: 'stub' });

  it('builds ST 276 with TRN and REF claim identifiers', () => {
    const x12 = build276ForNctracks(req, config, '77');
    expect(x12).toContain('ST*276*0001*005010X212');
    expect(x12).toContain('TRN*1*PCN-276-1');
    expect(x12).toContain('REF*1K*TCN-999');
    expect(x12).toContain('DTP*472*RD8*20260601-20260601');
  });
});