'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ClipboardDocumentCheckIcon, PlusIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DataTable, type Column } from '@/components/DataTable';
import { api } from '@/lib/api-client';
import { cn, formatDateTime } from '@/lib/format';
import type { PaRequestRow } from '@/lib/types';

function ProviderPaInner(): React.ReactElement {
  const [rows, setRows] = useState<PaRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ requests?: PaRequestRow[] }>('/v1/prior-auth/pa-requests/mine')
      .then(r => setRows(r.requests ?? []))
      .catch(err => setError(err.message ?? 'Unable to load prior authorization requests.'))
      .finally(() => setLoading(false));
  }, []);

  const columns: Column<PaRequestRow>[] = [
    { header: 'Service',     accessor: p => <Link href={`/provider/pa/${p.id}`} className="font-mono text-xs text-brand-700 hover:underline">{p.service_code}</Link> },
    { header: 'Urgency',     accessor: p => <span className={
      p.urgency === 'drug' ? 'badge-red' :
      p.urgency === 'expedited' ? 'badge-yellow' : 'badge-gray'
    }>{p.urgency}</span> },
    { header: 'Status',      accessor: p => <span className={
      p.status === 'approved' ? 'badge-green' :
      p.status === 'denied'   ? 'badge-red'   :
      p.status === 'needs_more_info' ? 'badge-yellow' : 'badge-blue'
    }>{p.status.replace('_', ' ')}</span> },
    { header: 'AI score',    accessor: p => p.ai_match_score
        ? <span className={cn(
            'inline-flex h-6 w-9 items-center justify-center rounded-md text-xs font-mono',
            Number(p.ai_match_score) >= 0.85 ? 'bg-green-100 text-green-700' :
            Number(p.ai_match_score) >= 0.30 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700',
          )}>{Math.round(Number(p.ai_match_score) * 100)}</span>
        : <span className="text-xs text-slate-400">—</span> },
    { header: 'Due',         accessor: p => formatDateTime(p.due_at) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Prior Authorization requests</h2>
        <Link href="/provider/pa/new" className="btn-primary">
          <PlusIcon className="h-4 w-4" /> New PA request
        </Link>
      </div>
      <DataTable
        rows={rows} columns={columns} loading={loading}
        errorMessage={error ?? undefined}
        emptyMessage="No PA requests yet."
        rowKey={p => p.id}
      />
      <div className="hidden">{ClipboardDocumentCheckIcon.toString()}</div>
    </div>
  );
}

export default function ProviderPaPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['individual_provider', 'facility_provider', 'platform_administrator']}>
      <AppShell><ProviderPaInner /></AppShell>
    </AuthGate>
  );
}
