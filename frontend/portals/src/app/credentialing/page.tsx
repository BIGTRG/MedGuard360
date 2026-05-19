'use client';

import { useEffect, useState } from 'react';
import { ClipboardDocumentCheckIcon, ClockIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DataTable, type Column } from '@/components/DataTable';
import { Kpi } from '@/components/Kpi';
import { api } from '@/lib/api-client';
import { cn, formatDateTime, timeSince } from '@/lib/format';

interface AppRow {
  id: string;
  provider_id: string;
  state_code: string;
  application_type: 'initial' | 'recredential' | 'add_state' | 'add_mco';
  status: 'received' | 'docs_pending' | 'psv_pending' | 'review_pending' | 'approved' | 'denied' | 'withdrawn' | 'expired';
  submitted_at: string;
  target_decision_by: string;
}

function CredentialingInner(): React.ReactElement {
  const [rows, setRows] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ applications?: AppRow[] }>('/v1/credentialing/applications')
      .then(r => setRows(r.applications ?? []))
      .catch(err => {
        setError(err.status === 404
          ? 'GET /credentialing/applications list endpoint not yet exposed. Add a `status` filter route to surface the queue.'
          : err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    open:      rows.filter(r => !['approved','denied','withdrawn','expired'].includes(r.status)).length,
    overdue:   rows.filter(r => new Date(r.target_decision_by).getTime() < Date.now() && !['approved','denied'].includes(r.status)).length,
    approved:  rows.filter(r => r.status === 'approved').length,
  };

  const columns: Column<AppRow>[] = [
    { header: 'Application', accessor: r => <span className="font-mono text-xs">{r.id.slice(0,8)}…</span> },
    { header: 'Provider',    accessor: r => <span className="font-mono text-xs">{r.provider_id.slice(0,8)}…</span> },
    { header: 'Type',        accessor: r => <span className="badge-gray">{r.application_type}</span> },
    { header: 'Status',      accessor: r => <span className={statusBadge(r.status)}>{r.status.replace('_',' ')}</span> },
    { header: 'State',       accessor: r => r.state_code },
    { header: 'Submitted',   accessor: r => timeSince(r.submitted_at) },
    { header: 'Due',         accessor: r => {
        const overdue = new Date(r.target_decision_by).getTime() < Date.now();
        return <span className={cn(overdue && 'font-semibold text-red-700')}>{formatDateTime(r.target_decision_by)}</span>;
    } },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <ClipboardDocumentCheckIcon className="h-5 w-5" /> Credentialing Queue
        </h2>
        <p className="text-sm text-slate-500">5-day SLA on every application. 6 PSV checks run automatically.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Open applications" value={String(stats.open)} />
        <Kpi label="Overdue" value={String(stats.overdue)} tone="danger" />
        <Kpi label="Approved" value={String(stats.approved)} tone="success" />
      </div>

      <DataTable rows={rows} columns={columns} loading={loading} errorMessage={error ?? undefined} rowKey={r => r.id} emptyMessage="No applications." />
      <div className="hidden">{ClockIcon.toString()}</div>
    </div>
  );
}

function statusBadge(s: AppRow['status']): string {
  if (s === 'approved')  return 'badge-green';
  if (s === 'denied')    return 'badge-red';
  if (s === 'expired')   return 'badge-red';
  if (s === 'review_pending' || s === 'psv_pending' || s === 'docs_pending') return 'badge-yellow';
  return 'badge-blue';
}

export default function CredentialingPortal(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['credentialing_specialist', 'state_medicaid_agency', 'mco_admin', 'platform_administrator']}>
      <AppShell><CredentialingInner /></AppShell>
    </AuthGate>
  );
}
