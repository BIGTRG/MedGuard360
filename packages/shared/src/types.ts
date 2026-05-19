/**
 * Cross-service shared types. Keep this file small — anything service-specific
 * lives in that service's own types.ts.
 */

/** Every one of the 20 user roles defined in CLAUDE.md. */
export type UserRole =
  | 'patient'
  | 'individual_provider'
  | 'facility_provider'
  | 'pharmacy'
  | 'dmepos_supplier'
  | 'nemt_broker'
  | 'mco_admin'
  | 'state_medicaid_agency'
  | 'federal_cms'
  | 'credentialing_specialist'
  | 'prior_auth_specialist'
  | 'billing_manager'
  | 'compliance_officer'
  | 'fraud_investigator'
  | 'denial_appeals_specialist'
  | 'school_administrator'
  | 'hie_administrator'
  | 'emergency_responder'
  | 'qa_auditor'
  | 'platform_administrator';

export const ALL_USER_ROLES: readonly UserRole[] = [
  'patient', 'individual_provider', 'facility_provider', 'pharmacy', 'dmepos_supplier',
  'nemt_broker', 'mco_admin', 'state_medicaid_agency', 'federal_cms', 'credentialing_specialist',
  'prior_auth_specialist', 'billing_manager', 'compliance_officer', 'fraud_investigator',
  'denial_appeals_specialist', 'school_administrator', 'hie_administrator',
  'emergency_responder', 'qa_auditor', 'platform_administrator',
] as const;

/** US state postal codes — covers all 50 states + DC + territories MedGuard supports. */
export type StateCode = string; // 2-letter; validated at schema boundary

/** Identity claims encoded inside our JWTs. */
export interface AuthClaims {
  sub: string;            // user uuid
  email: string;
  role: UserRole;
  stateCode?: StateCode;  // for state-scoped users (state_medicaid_agency, etc.)
  orgId?: string;         // facility, pharmacy, MCO, etc.
  biometricVerified: boolean;
  sessionId: string;
}

/** Standard envelope for every Kafka event we emit. */
export interface DomainEvent<T = unknown> {
  eventId: string;        // uuid
  eventType: string;      // e.g. 'claim.submitted'
  eventVersion: number;   // schema version
  occurredAt: string;     // ISO-8601
  producer: string;       // service name
  actorUserId?: string;
  correlationId?: string; // ties events caused by the same request together
  payload: T;
}

/** Express request augmentation — attached by auth middleware. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthClaims;
      requestId?: string;
      correlationId?: string;
    }
  }
}
