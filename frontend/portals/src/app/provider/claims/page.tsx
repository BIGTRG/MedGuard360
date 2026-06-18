'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CurrencyDollarIcon, PlusIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DataTable, type Column } from '@/components/DataTable';
import { api, ApiError } from '@/lib/api-client';
import { cn, formatCurrencyCents, formatDateTime } from '@/lib/format';

interface ClaimRow {
  id: string; claim_control_number: string;
  status: 'draft'|'validated'|'submitted'|'fraud_review'|'paid'|'denied'|'appealed'|'withdrawn'|'expired';
  total_charge_cents: string;
  fraud_score: number | null;
  fraud_recommendation: string | null;
  submitted_at: string | null; adjudicated_at: string | null;
}

function ClaimsInner(): React.ReactElement {
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ claims?: ClaimRow[] }>('/v1/claims')
      .then(r => setRows(r.claims ?? []))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load claims'))
      .finally(() => setLoading(false));
  }, []);

  const statusBadge = (s: ClaimRow['status']): string => {
    if (s === 'paid')         return 'badge-green';
    if (s === 'denied')       return 'badge-red';
    if (s === 'fraud_review') return 'badge-yellow';
    if (s === 'submitted')    return 'badge-blue';
    return 'badge-gray';
  };

  const columns: Column<ClaimRow>[] = [
    { header: 'CCN',        accessor: c => <Link href={`/provider/claims/${c.id}`} className="font-mono text-xs text-brand-700 hover:underline">{c.claim_control_number}</Link> },
    { header: 'Status',     accessor: c => <span className={statusBadge(c.status)}>{c.status}</span> },
    { header: 'Charge',     accessor: c => formatCurrencyCents(c.total_charge_cents) },
    { header: 'Fraud',      accessor: c => c.fraud_score != null
        ? <span className={cn(
            'inline-flex h-6 w-9 items-center justify-center rounded-md text-xs font-mono',
            c.fraud_score >= 80 ? 'bg-red-100 text-red-700' :
            c.fraud_score >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700',
          )}>{c.fraud_score}</span>
        : <span className="text-xs text-slate-400">—</span> },
    { header: 'Submitted',  accessor: c => formatDateTime(c.submitted_at) },
    { header: 'Adjudicated',accessor: c => formatDateTime(c.adjudicated_at) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Claims</h2>
        <Link href="/provider/claims/new" className="btn-primary">
          <PlusIcon className="h-4 w-4" /> New claim
        </Link>
      </div>
      <DataTable
        rows={rows} columns={columns} loading={loading}
        errorMessage={error ?? undefined}
        emptyMessage="No claims yet."
        rowKey={c => c.id}
      />
      <div className="hidden">{CurrencyDollarIcon.toString()}</div>
    </div>
  );
}

export default function ProviderClaimsPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['individual_provider', 'facility_provider', 'billing_manager', 'platform_administrator']}>
      <AppShell><ClaimsInner /></AppShell>
    </AuthGate>
  );
}
