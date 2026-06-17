import type { UserRole } from './types';

export const DEMO_PASSWORD = 'demo-Password!1';

/** Seeded NC laptop demo accounts (see deploy/seed-demo.sql). */
export const DEMO_USERS = [
  { label: 'Admin', email: 'admin@demo.medguard360.com', role: 'platform_administrator' as UserRole, area: 'Platform admin' },
  { label: 'State', email: 'state@demo.medguard360.com', role: 'state_medicaid_agency' as UserRole, area: 'State dashboard' },
  { label: 'Fraud', email: 'fraud@demo.medguard360.com', role: 'fraud_investigator' as UserRole, area: 'Fraud queue + escalation' },
  { label: 'PA', email: 'pa@demo.medguard360.com', role: 'prior_auth_specialist' as UserRole, area: 'PA evidence matcher' },
  { label: 'Provider', email: 'provider@demo.medguard360.com', role: 'individual_provider' as UserRole, area: 'Clinical workflow' },
  { label: 'Patient', email: 'patient@demo.medguard360.com', role: 'patient' as UserRole, area: 'Member portal' },
  { label: 'Denials', email: 'denial@demo.medguard360.com', role: 'denial_appeals_specialist' as UserRole, area: 'Denials + appeals' },
  { label: 'Compliance', email: 'compliance@demo.medguard360.com', role: 'compliance_officer' as UserRole, area: 'Audit / compliance' },
  { label: 'Credentialing', email: 'credentialing@demo.medguard360.com', role: 'credentialing_specialist' as UserRole, area: 'Provider credentialing queue' },
  { label: 'DME', email: 'dme@demo.medguard360.com', role: 'dmepos_supplier' as UserRole, area: 'DMEPOS orders' },
  { label: 'NEMT', email: 'nemt@demo.medguard360.com', role: 'nemt_broker' as UserRole, area: 'Transport scheduling' },
  { label: 'Pharmacy', email: 'pharmacy@demo.medguard360.com', role: 'pharmacy' as UserRole, area: 'Formulary + drug PA' },
  { label: 'Responder', email: 'responder@demo.medguard360.com', role: 'emergency_responder' as UserRole, area: 'Crisis (biometric-gated)' },
] as const;

const EMAIL_BY_ROLE: Partial<Record<UserRole, string>> = Object.fromEntries(
  DEMO_USERS.map(u => [u.role, u.email]),
) as Partial<Record<UserRole, string>>;

/** Map any demo role picker value to a seeded login email. */
export function demoEmailForRole(role: UserRole): string {
  return EMAIL_BY_ROLE[role]
    ?? (role === 'facility_provider' ? EMAIL_BY_ROLE.individual_provider : undefined)
    ?? (role === 'mco_admin' || role === 'federal_cms' ? EMAIL_BY_ROLE.state_medicaid_agency : undefined)
    ?? (role === 'qa_auditor' ? EMAIL_BY_ROLE.compliance_officer : undefined)
    ?? 'admin@demo.medguard360.com';
}