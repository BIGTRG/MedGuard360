import { loadNctracksConfig } from '../config';
import type { EligibilityRequest } from '../types';
import { build270ForNctracks } from './build270';

const req: EligibilityRequest = {
  subscriberId: 'NCMD00100007',
  dateOfService: '2026-06-01',
  providerNpi: '1234567890',
  firstName: 'Jane',
  lastName: 'Doe',
  dob: '1980-01-01',
  traceId: 'TRACE-270-1',
};

describe('build270ForNctracks', () => {
  const config = loadNctracksConfig({ NCTRACKS_MODE: 'stub' });

  it('uses an SE01 count from ST through SE only', () => {
    const x12 = build270ForNctracks(req, config, '77');
    expect(x12).toContain('ST*270*0001*005010X279A1');
    expect(x12).toContain('SE*12*0001');
  });
});
