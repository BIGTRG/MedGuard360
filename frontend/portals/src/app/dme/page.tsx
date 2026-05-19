'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TruckIcon, PlusIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DataTable, type Column } from '@/components/DataTable';
import { Kpi } from '@/components/Kpi';
import { api } from '@/lib/api-client';
import { formatCurrencyCents, formatDate } from '@/lib/format';

interface DmeOrder {
  id: string; hcpcs_code: string; description: string;
  rental_or_purchase: 'rental' | 'purchase'; quantity: number;
  total_charge_cents: string; status: string; date_of_service: string;
  cmn_complete: boolean; prior_auth_id: string | null;
}

function DmeInner(): React.ReactElement {
  const [rows, setRows] = useState<DmeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ orders?: DmeOrder[] }>('/v1/dme/orders')
      .then(r => setRows(r.orders ?? []))
      .catch(err => {
        setError(err.status === 404
          ? 'GET /dme/orders list endpoint not yet exposed by dme-service.'
          : err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (s: string): string => {
    if (s === 'approved' || s === 'delivered' || s === 'billed') return 'badge-green';
    if (s === 'denied' || s === 'cancelled')                      return 'badge-red';
    return 'badge-yellow';
  };

  const columns: Column<DmeOrder>[] = [
    { header: 'HCPCS',     accessor: o => <span className="font-mono text-xs">{o.hcpcs_code}</span> },
    { header: 'Item',      accessor: o => <Link href={`/dme/${o.id}`} className="text-brand-700 hover:underline">{o.description}</Link> },
    { header: 'Type',      accessor: o => <span className="badge-gray">{o.rental_or_purchase}</span> },
    { header: 'Qty',       accessor: o => o.quantity },
    { header: 'Charge',    accessor: o => formatCurrencyCents(o.total_charge_cents) },
    { header: 'CMN',       accessor: o => o.cmn_complete ? <span className="badge-green">on file</span> : <span className="badge-yellow">missing</span> },
    { header: 'PA',        accessor: o => o.prior_auth_id ? <span className="badge-green">linked</span> : <span className="text-xs text-slate-400">—</span> },
    { header: 'Status',    accessor: o => <span className={statusBadge(o.status)}>{o.status}</span> },
    { header: 'Service',   accessor: o => formatDate(o.date_of_service) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <TruckIcon className="h-5 w-5" /> DME / DMEPOS Orders
        </h2>
        <Link href="/dme/new" className="btn-primary">
          <PlusIcon className="h-4 w-4" /> New order
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Open orders"   value={String(rows.filter(r => r.status === 'pending' || r.status === 'approved').length)} />
        <Kpi label="Delivered"     value={String(rows.filter(r => r.status === 'delivered').length)} tone="success" />
        <Kpi label="Awaiting PA"   value={String(rows.filter(r => !r.prior_auth_id && r.status === 'pending').length)} tone="warning" />
      </div>

      <DataTable rows={rows} columns={columns} loading={loading} errorMessage={error ?? undefined} rowKey={o => o.id} emptyMessage="No DME orders yet." />

      <div className="card card-body bg-brand-50 text-sm text-brand-900">
        DMEPOS validation runs per-HCPCS: PA requirement, Certificate of Medical Necessity,
        rental eligibility, and monthly quantity caps. Failures block submission server-side.
      </div>
    </div>
  );
}

export default function DmePortal(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['dmepos_supplier', 'individual_provider', 'facility_provider', 'platform_administrator']}>
      <AppShell><DmeInner /></AppShell>
    </AuthGate>
  );
}
