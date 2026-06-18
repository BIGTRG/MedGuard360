'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MapIcon, PlusIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DataTable, type Column } from '@/components/DataTable';
import { Kpi } from '@/components/Kpi';
import { api } from '@/lib/api-client';
import { formatCurrencyCents, formatDateTime } from '@/lib/format';

interface NemtTrip {
  id: string; patient_id: string; trip_type: string;
  pickup_address: string; destination_address: string;
  scheduled_pickup_at: string; status: string;
  miles_billed: string | null; total_charge_cents: string | null;
}

function NemtInner(): React.ReactElement {
  const [trips, setTrips] = useState<NemtTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ trips?: NemtTrip[] }>('/v1/nemt/trips')
      .then(r => setTrips(r.trips ?? []))
      .catch(err => setError(err.message ?? 'Unable to load NEMT trips.'))
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (s: string): string => {
    if (s === 'completed')      return 'badge-green';
    if (s === 'en_route')        return 'badge-yellow';
    if (s === 'no_show' || s === 'cancelled') return 'badge-red';
    return 'badge-blue';
  };

  const columns: Column<NemtTrip>[] = [
    { header: 'Trip',         accessor: t => <Link href={`/nemt/${t.id}`} className="font-mono text-xs text-brand-700 hover:underline">{t.id.slice(0,8)}…</Link> },
    { header: 'Type',         accessor: t => <span className="badge-gray">{t.trip_type}</span> },
    { header: 'Pickup',       accessor: t => <span className="text-xs">{t.pickup_address}</span>, className: 'max-w-xs truncate' },
    { header: 'Destination',  accessor: t => <span className="text-xs">{t.destination_address}</span>, className: 'max-w-xs truncate' },
    { header: 'Scheduled',    accessor: t => formatDateTime(t.scheduled_pickup_at) },
    { header: 'Status',       accessor: t => <span className={statusBadge(t.status)}>{t.status.replace('_',' ')}</span> },
    { header: 'Miles',        accessor: t => t.miles_billed ? Number(t.miles_billed).toFixed(1) : <span className="text-xs text-slate-400">—</span> },
    { header: 'Charge',       accessor: t => formatCurrencyCents(t.total_charge_cents) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <MapIcon className="h-5 w-5" /> NEMT Transport Trips
        </h2>
        <Link href="/nemt/schedule" className="btn-primary">
          <PlusIcon className="h-4 w-4" /> Schedule trip
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Scheduled (today)" value={String(trips.filter(t => t.status === 'scheduled').length)} />
        <Kpi label="In progress"        value={String(trips.filter(t => t.status === 'en_route').length)} tone="warning" />
        <Kpi label="Completed"          value={String(trips.filter(t => t.status === 'completed').length)} tone="success" />
      </div>

      <DataTable rows={trips} columns={columns} loading={loading} errorMessage={error ?? undefined} rowKey={t => t.id} emptyMessage="No trips scheduled." />

      <div className="card card-body bg-brand-50 text-sm text-brand-900">
        Every completed trip submits a GPS track. We compare GPS miles to point-to-point
        distance and surface inflation ratios &gt; 1.5× to fraud-engine as anti-billing-fraud signal.
      </div>
    </div>
  );
}

export default function NemtPortal(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['nemt_broker', 'individual_provider', 'facility_provider', 'platform_administrator']}>
      <AppShell><NemtInner /></AppShell>
    </AuthGate>
  );
}
