'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DocumentMinusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DataTable, type Column } from '@/components/DataTable';
import { Kpi } from '@/components/Kpi';
import { api } from '@/lib/api-client';
import { cn, formatCurrencyCents, formatDateTime, timeSince } from '@/lib/format';

interface DenialRow {
  id: string; claim_id: string; state_code: string;
  carc_code: string; carc_description: string;
  denied_amount_cents: string; status: string;
  appeal_deadline: string | null; remit_received_at: string;
}

function DenialsInner(): React.ReactElement {
  const [rows, setRows] = useState<DenialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ denials: DenialRow[] }>('/v1/denials')
      .then(r => setRows(r.denials))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    open:      rows.length,
    deadline7: rows.filter(r => r.appeal_deadline && (new Date(r.appeal_deadline).getTime() - Date.now()) < 7 * 86400e3).length,
    appealing: rows.filter(r => r.status === 'appealing').length,
  };

  const columns: Column<DenialRow>[] = [
    { header: 'Claim',   accessor: r => <span className="font-mono text-xs">{r.claim_id.slice(0,8)}…</span> },
    { header: 'CARC',    accessor: r => <span className="font-mono text-xs">{r.carc_code}</span> },
    { header: 'Reason',  accessor: r => <span className="text-xs">{r.carc_description}</span>, className: 'max-w-xs truncate' },
    { header: 'Amount',  accessor: r => formatCurrencyCents(r.denied_amount_cents) },
    { header: 'Status',  accessor: r => <span className={statusBadge(r.status)}>{r.status.replace('_',' ')}</span> },
    { header: 'State',   accessor: r => r.state_code },
    { header: 'Deadline',accessor: r => {
        if (!r.appeal_deadline) return '—';
        const ms = new Date(r.appeal_deadline).getTime() - Date.now();
        const days = Math.floor(ms / 86400e3);
        return <span className={cn(days < 7 && 'font-semibold text-red-700')}>
          {days < 0 ? 'past due' : `${days}d`} • {formatDateTime(r.appeal_deadline)}
        </span>;
    } },
    { header: 'Received',accessor: r => timeSince(r.remit_received_at) },
    { header: '',        accessor: r => <Link href={`/denials/${r.id}`} className="btn-ghost">Review</Link> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <DocumentMinusIcon className="h-5 w-5" /> Denials & Appeals
        </h2>
        <p className="text-sm text-slate-500">
          AI-drafted appeals via denial-predictor. Specialist reviews and submits.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Open denials" value={String(stats.open)} />
        <Kpi label="Deadline < 7 days" value={String(stats.deadline7)} tone="danger" />
        <Kpi label="Currently appealing" value={String(stats.appealing)} tone="warning" />
      </div>

      <DataTable rows={rows} columns={columns} loading={loading} errorMessage={error ?? undefined} rowKey={r => r.id} emptyMessage="No active denials." />

      <div className="card card-body bg-brand-50 text-sm text-brand-900">
        <div className="flex items-start gap-2">
          <SparklesIcon className="h-5 w-5 flex-shrink-0 text-brand-600" />
          <p>AI auto-drafts appeal letters with CARC-aware reasoning. You review and edit before submission — every word that goes to the payer is human-approved.</p>
        </div>
      </div>
    </div>
  );
}

function statusBadge(s: string): string {
  if (s === 'appeal_won')  return 'badge-green';
  if (s === 'appeal_lost') return 'badge-red';
  if (s === 'appealing')   return 'badge-yellow';
  if (s === 'write_off')   return 'badge-gray';
  return 'badge-blue';
}

export default function DenialsPortal(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['denial_appeals_specialist', 'billing_manager', 'compliance_officer', 'platform_administrator']}>
      <AppShell><DenialsInner /></AppShell>
    </AuthGate>
  );
}
