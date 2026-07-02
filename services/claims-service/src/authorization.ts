import type { AuthClaims, UserRole } from '@medguard360/shared';

export interface ClaimAccessRecord {
  patient_id: string;
  state_code: string;
  provider_user_id?: string | null;
  billing_provider_id?: string | null;
  rendering_provider_id?: string | null;
}

const CROSS_STATE_ROLES = new Set<UserRole>([
  'federal_cms',
  'platform_administrator',
]);

const STATE_READ_ROLES = new Set<UserRole>([
  'state_medicaid_agency',
  'mco_admin',
  'billing_manager',
  'compliance_officer',
  'fraud_investigator',
  'denial_appeals_specialist',
]);

const CLAIM_PROVIDER_ROLES = new Set<UserRole>([
  'individual_provider',
  'facility_provider',
]);

const SUBMIT_ROLES = new Set<UserRole>([
  'individual_provider',
  'facility_provider',
  'billing_manager',
  'platform_administrator',
]);

function isCrossState(auth: AuthClaims): boolean {
  return CROSS_STATE_ROLES.has(auth.role);
}

function isSameStateReader(auth: AuthClaims, claim: ClaimAccessRecord): boolean {
  return STATE_READ_ROLES.has(auth.role) && auth.stateCode === claim.state_code;
}

function ownsProviderClaim(
  auth: AuthClaims,
  claim: ClaimAccessRecord,
  linkedProviderId?: string,
): boolean {
  if (!CLAIM_PROVIDER_ROLES.has(auth.role)) return false;

  const allowedProviderIds = new Set<string>([auth.sub]);
  if (linkedProviderId) allowedProviderIds.add(linkedProviderId);

  return [
    claim.provider_user_id,
    claim.billing_provider_id,
    claim.rendering_provider_id,
  ].some((providerId) => providerId !== undefined && providerId !== null && allowedProviderIds.has(providerId));
}

export function canReadClaim(
  auth: AuthClaims,
  claim: ClaimAccessRecord,
  linkedProviderId?: string,
): boolean {
  if (isCrossState(auth) || isSameStateReader(auth, claim)) return true;
  if (auth.role === 'patient' && claim.patient_id === auth.sub) return true;
  return ownsProviderClaim(auth, claim, linkedProviderId);
}

export function canSubmitClaim(
  auth: AuthClaims,
  claim: ClaimAccessRecord,
  linkedProviderId?: string,
): boolean {
  return SUBMIT_ROLES.has(auth.role) && canReadClaim(auth, claim, linkedProviderId);
}
