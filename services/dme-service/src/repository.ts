import { withRlsContext, AuthClaims, NotFoundError } from '@medguard360/shared';

export interface DmeOrderRow {
  id: string;
  patient_id: string;
  prescribing_provider_id: string;
  supplier_provider_id: string;
  payer_id: string;
  state_code: string;
  hcpcs_code: string;
  description: string;
  modifier_1: string | null;
  modifier_2: string | null;
  quantity: number;
  rental_or_purchase: 'rental' | 'purchase';
  rental_months: number | null;
  total_charge_cents: string;
  prior_auth_id: string | null;
  cmn_complete: boolean;
  date_of_service: string;
  status: 'pending' | 'approved' | 'delivered' | 'billed' | 'denied' | 'cancelled';
  delivery_address: string | null;
}

export async function createOrder(auth: AuthClaims, input: Omit<DmeOrderRow, 'id' | 'status'> & { status?: DmeOrderRow['status'] }): Promise<DmeOrderRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<DmeOrderRow>(
      `INSERT INTO dme_orders (
         patient_id, prescribing_provider_id, supplier_provider_id, payer_id, state_code,
         hcpcs_code, description, modifier_1, modifier_2, quantity, rental_or_purchase,
         rental_months, total_charge_cents, prior_auth_id, cmn_complete, date_of_service,
         delivery_address, status, created_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [input.patient_id, input.prescribing_provider_id, input.supplier_provider_id, input.payer_id,
       input.state_code, input.hcpcs_code, input.description,
       input.modifier_1, input.modifier_2, input.quantity, input.rental_or_purchase,
       input.rental_months, input.total_charge_cents, input.prior_auth_id, input.cmn_complete,
       input.date_of_service, input.delivery_address, input.status ?? 'pending', auth.sub],
    );
    return r.rows[0];
  });
}

export async function listOrders(auth: AuthClaims, limit = 100): Promise<DmeOrderRow[]> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<DmeOrderRow>(
      `SELECT * FROM dme_orders ORDER BY date_of_service DESC, created_at DESC LIMIT $1`,
      [limit],
    );
    return r.rows;
  });
}

export async function getOrder(auth: AuthClaims, id: string): Promise<DmeOrderRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<DmeOrderRow>('SELECT * FROM dme_orders WHERE id = $1', [id]);
    if (!r.rows[0]) throw new NotFoundError('DME order');
    return r.rows[0];
  });
}

export async function setStatus(auth: AuthClaims, id: string, status: DmeOrderRow['status']): Promise<DmeOrderRow> {
  return withRlsContext(auth, async (client) => {
    const r = await client.query<DmeOrderRow>(
      `UPDATE dme_orders SET status = $2 WHERE id = $1 RETURNING *`, [id, status],
    );
    if (!r.rows[0]) throw new NotFoundError('DME order');
    return r.rows[0];
  });
}
