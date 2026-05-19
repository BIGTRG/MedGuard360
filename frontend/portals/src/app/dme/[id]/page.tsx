'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DetailLayout, DetailSection, FieldRow } from '@/components/DetailLayout';
import { api } from '@/lib/api-client';
import { formatCurrencyCents, formatDate } from '@/lib/format';

interface DmeOrder {
  id: string; hcpcs_code: string; description: string; quantity: number;
  rental_or_purchase: 'rental' | 'purchase'; rental_months: number | null;
  total_charge_cents: string; status: string; date_of_service: string;
  cmn_complete: boolean; prior_auth_id: string | null;
  delivery_address: string | null; state_code: string; payer_id: string;
}

function DmeDetailInner(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<DmeOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.get<DmeOrder>(`/v1/dme/orders/${id}`)
      .then(setD)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const setStatus = async (status: string): Promise<void> => {
    try {
      const updated = await api.post<DmeOrder>(`/v1/dme/orders/${id}/status`, { status });
      setD(updated);
    } catch (err) { setError((err as Error).message); }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>;
  if (!d) return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error ?? 'Not found'}</div>;

  const statusBadge = d.status === 'delivered' || d.status === 'approved' || d.status === 'billed'
    ? 'badge-green' : d.status === 'denied' || d.status === 'cancelled' ? 'badge-red' : 'badge-yellow';

  return (
    <DetailLayout
      title={`${d.hcpcs_code} — ${d.description}`}
      subtitle={<span className="font-mono text-xs">{d.id}</span>}
      backHref="/dme"
      badges={<>
        <span className={statusBadge}>{d.status}</span>
        <span className="badge-gray">{d.rental_or_purchase}</span>
        <span className="badge-gray">{d.state_code}</span>
        {d.prior_auth_id && <span className="badge-blue">PA linked</span>}
        {d.cmn_complete  && <span className="badge-green">CMN on file</span>}
      </>}
      actions={d.status === 'pending' && (
        <>
          <button className="btn-primary" onClick={() => setStatus('approved')}>Approve</button>
          <button className="btn-ghost" onClick={() => setStatus('cancelled')}>Cancel</button>
        </>
      )}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <DetailSection title="Order details">
          <dl>
            <FieldRow label="HCPCS">{d.hcpcs_code}</FieldRow>
            <FieldRow label="Quantity">{d.quantity}</FieldRow>
            <FieldRow label="Type">{d.rental_or_purchase}{d.rental_months ? ` (${d.rental_months} mo)` : ''}</FieldRow>
            <FieldRow label="Total charge">{formatCurrencyCents(d.total_charge_cents)}</FieldRow>
            <FieldRow label="Service date">{formatDate(d.date_of_service)}</FieldRow>
          </dl>
        </DetailSection>
        <DetailSection title="Authorization & delivery">
          <dl>
            <FieldRow label="Payer">{d.payer_id}</FieldRow>
            <FieldRow label="Prior auth">{d.prior_auth_id ?? '—'}</FieldRow>
            <FieldRow label="CMN">{d.cmn_complete ? 'Complete' : 'Missing'}</FieldRow>
            <FieldRow label="Delivery address">{d.delivery_address ?? '—'}</FieldRow>
          </dl>
        </DetailSection>
      </div>
    </DetailLayout>
  );
}

export default function DmeDetailPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['dmepos_supplier','individual_provider','facility_provider','billing_manager','platform_administrator']}>
      <AppShell><DmeDetailInner /></AppShell>
    </AuthGate>
  );
}
