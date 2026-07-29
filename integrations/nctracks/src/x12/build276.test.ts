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

  it('counts only ST-through-SE segments in SE01', () => {
    const x12 = build276ForNctracks(req, config, '77');
    const segments = x12.split(/[~\n\r]+/).filter(Boolean);
    const stIndex = segments.findIndex((segment) => segment.startsWith('ST*'));
    const seIndex = segments.findIndex((segment) => segment.startsWith('SE*'));
    const se01 = Number.parseInt(segments[seIndex]?.split('*')[1] ?? '', 10);

    expect(stIndex).toBeGreaterThanOrEqual(0);
    expect(seIndex).toBeGreaterThan(stIndex);
    expect(se01).toBe(seIndex - stIndex + 1);
  });
});
