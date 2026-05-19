import { withRlsContext, AuthClaims, NotFoundError, ConflictError } from '@medguard360/shared';
import { ProviderRow, ProviderType, SpecialtyRow, LocationRow } from './types';

export interface CreateProviderInput {
  userId?: string;
  npi: string;
  ein?: string;
  type: ProviderType;
  legalName: string;
  doingBusinessAs?: string;
  email?: string;
  phone?: string;
  primaryTaxonomyCode?: string;
  stateCode?: string;
  orgId?: string;
}

export async function createProvider(auth: AuthClaims, input: CreateProviderInput): Promise<ProviderRow> {
  return withRlsContext(auth, async (client) => {
    try {
      const r = await client.query<ProviderRow>(
        `INSERT INTO providers (
           user_id, npi, ein, type, legal_name, doing_business_as,
           email, phone, primary_taxonomy_code, state_code, org_id, created_by
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [
          input.userId ?? null, input.npi, input.ein ?? null, input.type,
          input.legalName, input.doingBusinessAs ?? null,
          input.email ?? null, input.phone ?? null,
          input.primaryTaxonomyCode ?? null, input.stateCode ?? null,
          input.orgId ?? null, auth.sub,
        ],
      );
      return r.rows[0];
    } catch (err) {
      const e = err as { code?: string };
      if (e.code === '23505') throw new ConflictError(`NPI ${input.npi} already registered`);
      throw err;
    }
  });
}

export async function getProvider(auth: AuthClaims, id: string): Promise<ProviderRow & { specialties: SpecialtyRow[]; locations: LocationRow[] }> {
  return withRlsContext(auth, async (client) => {
    const p = await client.query<ProviderRow>('SELECT * FROM providers WHERE id = $1', [id]);
    if (!p.rows[0]) throw new NotFoundError('Provider');
    const [s, l] = await Promise.all([
      client.query<SpecialtyRow>('SELECT * FROM provider_specialties WHERE provider_id = $1 ORDER BY is_primary DESC', [id]),
      client.query<LocationRow>('SELECT * FROM provider_locations WHERE provider_id = $1 AND active = TRUE ORDER BY is_primary DESC', [id]),
    ]);
    return { ...p.rows[0], specialties: s.rows, locations: l.rows };
  });
}

export async function getProviderByNpi(auth: AuthClaims, npi: string): Promise<ProviderRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<ProviderRow>('SELECT * FROM providers WHERE npi = $1', [npi]);
    if (!r.rows[0]) throw new NotFoundError('Provider');
    return r.rows[0];
  });
}

export interface SearchProviderInput {
  type?: ProviderType;
  stateCode?: string;
  enrolledIn?: string;   // state code
  taxonomy?: string;
  legalName?: string;
  limit?: number;
}

export async function searchProviders(auth: AuthClaims, input: SearchProviderInput): Promise<ProviderRow[]> {
  return withRlsContext(auth, async (client) => {
    const where: string[] = [];
    const params: unknown[] = [];
    const push = (clause: string, val: unknown): void => { params.push(val); where.push(clause.replace('$$', `$${params.length}`)); };

    if (input.type)        push('type = $$', input.type);
    if (input.stateCode)   push('state_code = $$', input.stateCode);
    if (input.enrolledIn)  push('$$ = ANY(enrolled_medicaid_states)', input.enrolledIn);
    if (input.taxonomy)    push('primary_taxonomy_code = $$', input.taxonomy);
    if (input.legalName)   push('legal_name ILIKE $$', `${input.legalName}%`);

    const limit = Math.min(input.limit ?? 50, 200);
    const r = await client.query<ProviderRow>(
      `SELECT * FROM providers
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY legal_name LIMIT ${limit}`, params,
    );
    return r.rows;
  });
}

export async function addSpecialty(
  auth: AuthClaims, providerId: string, taxonomyCode: string, description: string, isPrimary: boolean,
): Promise<SpecialtyRow> {
  return withRlsContext(auth, async (client) => {
    if (isPrimary) {
      await client.query('UPDATE provider_specialties SET is_primary = FALSE WHERE provider_id = $1', [providerId]);
    }
    const r = await client.query<SpecialtyRow>(
      `INSERT INTO provider_specialties (provider_id, taxonomy_code, taxonomy_description, is_primary)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (provider_id, taxonomy_code) DO UPDATE
         SET taxonomy_description = EXCLUDED.taxonomy_description, is_primary = EXCLUDED.is_primary
       RETURNING *`,
      [providerId, taxonomyCode, description, isPrimary],
    );
    return r.rows[0];
  });
}

export async function addLocation(
  auth: AuthClaims, providerId: string, input: Omit<LocationRow, 'id' | 'provider_id' | 'latitude' | 'longitude'> & { latitude?: number; longitude?: number },
): Promise<LocationRow> {
  return withRlsContext(auth, async (client) => {
    if (input.is_primary) {
      await client.query('UPDATE provider_locations SET is_primary = FALSE WHERE provider_id = $1', [providerId]);
    }
    const r = await client.query<LocationRow>(
      `INSERT INTO provider_locations
         (provider_id, label, address_line1, city, state_code, postal_code, latitude, longitude, is_primary, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [providerId, input.label, input.address_line1, input.city, input.state_code,
       input.postal_code, input.latitude ?? null, input.longitude ?? null, input.is_primary, input.active],
    );
    return r.rows[0];
  });
}

export async function setStatus(auth: AuthClaims, id: string, status: 'active' | 'suspended' | 'terminated'): Promise<ProviderRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<ProviderRow>(
      'UPDATE providers SET status = $2 WHERE id = $1 RETURNING *',
      [id, status],
    );
    if (!r.rows[0]) throw new NotFoundError('Provider');
    return r.rows[0];
  });
}
