import { canReadClaim, canSubmitClaim, ClaimAccessRecord } from './authorization';
import type { AuthClaims, UserRole } from '@medguard360/shared';

const providerUserId = '00000000-0000-0000-0000-000000000003';
const providerProfileId = '20000000-0000-0000-0000-000000000001';
const otherProviderProfileId = '20000000-0000-0000-0000-000000000002';
const patientUserId = '10000000-0000-0000-0000-000000000001';

function auth(role: UserRole, sub: string, stateCode = 'NC'): AuthClaims {
  return {
    sub,
    email: `${role}@example.test`,
    role,
    stateCode,
    biometricVerified: true,
    sessionId: 'session-1',
  };
}

const claim: ClaimAccessRecord = {
  patient_id: patientUserId,
  state_code: 'NC',
  billing_provider_id: providerProfileId,
  rendering_provider_id: null,
};

describe('claim access authorization', () => {
  it('allows linked providers to read and submit their own claims', () => {
    const providerAuth = auth('individual_provider', providerUserId);

    expect(canReadClaim(providerAuth, claim, providerProfileId)).toBe(true);
    expect(canSubmitClaim(providerAuth, claim, providerProfileId)).toBe(true);
  });

  it('denies providers access to claims owned by another provider profile', () => {
    const providerAuth = auth('individual_provider', providerUserId);

    expect(canReadClaim(providerAuth, claim, otherProviderProfileId)).toBe(false);
    expect(canSubmitClaim(providerAuth, claim, otherProviderProfileId)).toBe(false);
  });

  it('allows patients to read their own claims but not submit them', () => {
    const patientAuth = auth('patient', patientUserId);

    expect(canReadClaim(patientAuth, claim)).toBe(true);
    expect(canSubmitClaim(patientAuth, claim)).toBe(false);
  });

  it('denies patients access to another patient claim', () => {
    const patientAuth = auth('patient', '10000000-0000-0000-0000-000000000099');

    expect(canReadClaim(patientAuth, claim)).toBe(false);
    expect(canSubmitClaim(patientAuth, claim)).toBe(false);
  });

  it('allows same-state billing managers to read and submit claims', () => {
    const billingAuth = auth('billing_manager', '00000000-0000-0000-0000-000000000050');

    expect(canReadClaim(billingAuth, claim)).toBe(true);
    expect(canSubmitClaim(billingAuth, claim)).toBe(true);
  });

  it('denies cross-state billing managers', () => {
    const billingAuth = auth('billing_manager', '00000000-0000-0000-0000-000000000050', 'SC');

    expect(canReadClaim(billingAuth, claim)).toBe(false);
    expect(canSubmitClaim(billingAuth, claim)).toBe(false);
  });

  it('allows platform administrators across states', () => {
    const adminAuth = auth('platform_administrator', '00000000-0000-0000-0000-000000000001', 'SC');

    expect(canReadClaim(adminAuth, claim)).toBe(true);
    expect(canSubmitClaim(adminAuth, claim)).toBe(true);
  });
});
