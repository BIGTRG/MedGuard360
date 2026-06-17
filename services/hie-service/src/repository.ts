/**
 * hie-service repository layer.
 *
 * All queries execute inside an RLS context so PostgreSQL row-level security
 * policies enforce state-scoped access automatically.
 */

import { pool, withRlsContext, query, AuthClaims, NotFoundError } from '@medguard360/shared';
import type {
  FhirResourceRow,
  FhirResourceFilters,
  SaveFhirResourceInput,
  ReferralRow,
  ReferralFilters,
  CreateReferralInput,
  UpdateReferralInput,
  ConsentRow,
  CreateConsentInput,
  ListResult,
} from './types';

// ---------------------------------------------------------------------------
// FHIR Resources
// ---------------------------------------------------------------------------

/**
 * Upsert a FHIR resource by fhir_id.
 * If a resource with the same fhir_id already exists, updates resource_data and updated_at.
 */
export async function saveFhirResource(
  auth: AuthClaims,
  data: SaveFhirResourceInput,
): Promise<FhirResourceRow> {
  return withRlsContext(auth, async (client) => {
    const result = await client.query<FhirResourceRow>(
      `INSERT INTO fhir_resources
         (resource_type, fhir_id, patient_id, state_code, resource_data, source_system)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)
       ON CONFLICT (fhir_id) DO UPDATE
         SET resource_data = EXCLUDED.resource_data,
             source_system = EXCLUDED.source_system,
             updated_at    = NOW()
       RETURNING *`,
      [
        data.resource_type,
        data.fhir_id,
        data.patient_id ?? null,
        data.state_code,
        JSON.stringify(data.resource_data),
        data.source_system ?? null,
      ],
    );
    return result.rows[0];
  });
}

/**
 * Retrieve a single FHIR resource by its FHIR ID.
 * Throws NotFoundError if not found.
 */
export async function findFhirResource(
  auth: AuthClaims,
  fhirId: string,
): Promise<FhirResourceRow> {
  return withRlsContext(auth, async (client) => {
    const result = await client.query<FhirResourceRow>(
      'SELECT * FROM fhir_resources WHERE fhir_id = $1',
      [fhirId],
    );
    if (!result.rows[0]) throw new NotFoundError('FhirResource');
    return result.rows[0];
  });
}

/**
 * List FHIR resources with optional filters on patient and resource type.
 */
export async function listFhirResources(
  auth: AuthClaims,
  filters: FhirResourceFilters = {},
): Promise<ListResult<FhirResourceRow>> {
  return withRlsContext(auth, async (client) => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.patientId) {
      conditions.push(`patient_id = $${idx++}`);
      params.push(filters.patientId);
    }
    if (filters.resourceType) {
      conditions.push(`resource_type = $${idx++}`);
      params.push(filters.resourceType);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await client.query<FhirResourceRow>(
      `SELECT * FROM fhir_resources ${where} ORDER BY created_at DESC`,
      params,
    );
    return { count: result.rowCount ?? result.rows.length, items: result.rows };
  });
}

// ---------------------------------------------------------------------------
// Referrals
// ---------------------------------------------------------------------------

/**
 * Create a new referral record. Status defaults to 'pending'.
 */
export async function createReferral(
  auth: AuthClaims,
  data: CreateReferralInput,
): Promise<ReferralRow> {
  return withRlsContext(auth, async (client) => {
    const result = await client.query<ReferralRow>(
      `INSERT INTO referrals
         (id, from_provider_id, to_provider_id, patient_id, state_code,
          reason, priority, status, fhir_service_request_id, notes, created_by)
       VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)
       RETURNING *`,
      [
        data.id ?? null,
        data.from_provider_id,
        data.to_provider_id ?? null,
        data.patient_id,
        data.state_code,
        data.reason,
        data.priority,
        data.fhir_service_request_id ?? null,
        data.notes ?? null,
        data.created_by,
      ],
    );
    return result.rows[0];
  });
}

/**
 * Retrieve a single referral by UUID.
 * Throws NotFoundError if not found.
 */
export async function findReferral(auth: AuthClaims, id: string): Promise<ReferralRow> {
  return withRlsContext(auth, async (client) => {
    const result = await client.query<ReferralRow>(
      'SELECT * FROM referrals WHERE id = $1',
      [id],
    );
    if (!result.rows[0]) throw new NotFoundError('Referral');
    return result.rows[0];
  });
}

/**
 * List referrals with optional filters.
 */
export async function listReferrals(
  auth: AuthClaims,
  filters: ReferralFilters = {},
): Promise<ListResult<ReferralRow>> {
  return withRlsContext(auth, async (client) => {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.fromProviderId) {
      conditions.push(`from_provider_id = $${idx++}`);
      params.push(filters.fromProviderId);
    }
    if (filters.toProviderId) {
      conditions.push(`to_provider_id = $${idx++}`);
      params.push(filters.toProviderId);
    }
    if (filters.patientId) {
      conditions.push(`patient_id = $${idx++}`);
      params.push(filters.patientId);
    }
    if (filters.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filters.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await client.query<ReferralRow>(
      `SELECT * FROM referrals ${where} ORDER BY created_at DESC`,
      params,
    );
    return { count: result.rowCount ?? result.rows.length, items: result.rows };
  });
}

/**
 * Update referral status (and optionally notes).
 * Throws NotFoundError if referral does not exist.
 */
export async function updateReferral(
  auth: AuthClaims,
  id: string,
  data: UpdateReferralInput,
): Promise<ReferralRow> {
  return withRlsContext(auth, async (client) => {
    const setClauses: string[] = ['status = $2', 'updated_at = NOW()'];
    const params: unknown[] = [id, data.status];
    let idx = 3;

    if (data.notes !== undefined) {
      setClauses.push(`notes = $${idx++}`);
      params.push(data.notes);
    }

    const result = await client.query<ReferralRow>(
      `UPDATE referrals SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params,
    );
    if (!result.rows[0]) throw new NotFoundError('Referral');
    return result.rows[0];
  });
}

// ---------------------------------------------------------------------------
// Consents
// ---------------------------------------------------------------------------

/** List consents for a patient; activeOnly defaults to true. */
export async function listConsents(
  auth: AuthClaims,
  patientId: string,
  activeOnly = true,
): Promise<ConsentRow[]> {
  return withRlsContext(auth, async (client) => {
    const result = await client.query<ConsentRow>(
      `SELECT * FROM hie_consents
       WHERE patient_id = $1
         AND ($2::boolean = false OR status = 'active')
       ORDER BY effective_from DESC`,
      [patientId, activeOnly],
    );
    return result.rows;
  });
}

/** Record a new consent grant. */
export async function createConsent(
  auth: AuthClaims,
  data: CreateConsentInput,
): Promise<ConsentRow> {
  return withRlsContext(auth, async (client) => {
    const result = await client.query<ConsentRow>(
      `INSERT INTO hie_consents
         (patient_id, scope, granted_to_org, effective_from, effective_to, fhir_resource_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.patient_id,
        data.scope,
        data.granted_to_org,
        data.effective_from,
        data.effective_to ?? null,
        data.fhir_resource_id ?? null,
      ],
    );
    return result.rows[0];
  });
}

/** Revoke an active consent. */
export async function revokeConsent(auth: AuthClaims, id: string): Promise<ConsentRow> {
  return withRlsContext(auth, async (client) => {
    const result = await client.query<ConsentRow>(
      `UPDATE hie_consents
       SET status = 'revoked', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id],
    );
    if (!result.rows[0]) throw new NotFoundError('Consent');
    return result.rows[0];
  });
}
