import { UserRole } from '@medguard360/shared';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'deactivated' | 'pending_verification';
  state_code: string | null;
  org_id: string | null;
  clerk_user_id: string | null;
  biometric_enrolled_at: Date | null;
  last_login_at: Date | null;
  failed_login_count: number;
  locked_until: Date | null;
}

export interface SessionRow {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  ip: string | null;
  user_agent: string | null;
  biometric_verified_at: Date | null;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
}

export interface BiometricVerifyVendorResponse {
  matched: boolean;
  score: number;
  vendorTxnId: string;
}
