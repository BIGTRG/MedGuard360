'use client';

import { useEffect, useState } from 'react';
import { MagnifyingGlassIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DataTable, type Column } from '@/components/DataTable';
import { api } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';

interface AuditRow {
  id: string;
  occurred_at: string;
  actor_user_id: string | null;
  actor_role: string | null;
  resource: string;
  resource_id: string;
  action: string;
  outcome: string;
  context: Record<string, unknown>;
  producer: string;
  correlation_id: string | null;
}

function AuditInner(): React.ReactElement {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actorUserId, setActorUserId] = useState('');
  const [resource, setResource] = useState('');
  const [resourceId, setResourceId] = useState('');

  const search = async (e?: React.FormEvent): Promise<void> => {
    if (e) e.preventDefault();
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (actorUserId) params.set('actorUserId', actorUserId);
      if (resource)    params.set('resource', resource);
      if (resourceId)  params.set('resourceId', resourceId);
      const r = await api.get<{ rows: AuditRow[] }>(`/v1/audit/search?${params}`);
      setRows(r.rows);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void search();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const outcomeBadge = (o: string): string => {
    if (o === 'success') return 'badge-green';
    if (o === 'denied')  return 'badge-red';
    return 'badge-yellow';
  };

  const columns: Column<AuditRow>[] = [
    { header: 'When',     accessor: r => <span className="text-xs">{formatDateTime(r.occurred_at)}</span> },
    { header: 'Actor',    accessor: r => <span className="font-mono text-xs">{r.actor_user_id?.slice(0,8) ?? 'system'}…</span> },
    { header: 'Role',     accessor: r => <span className="badge-gray text-xs">{r.actor_role ?? '—'}</span> },
    { header: 'Resource', accessor: r => <span className="text-xs">{r.resource}</span> },
    { header: 'ID',       accessor: r => <span className="font-mono text-xs">{r.resource_id.slice(0,12)}…</span> },
    { header: 'Action',   accessor: r => <span className="capitalize text-xs">{r.action}</span> },
    { header: 'Outcome',  accessor: r => <span className={outcomeBadge(r.outcome)}>{r.outcome}</span> },
    { header: 'Service',  accessor: r => <span className="font-mono text-xs text-slate-500">{r.producer}</span> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <ShieldCheckIcon className="h-5 w-5" /> Audit Search
        </h2>
        <p className="text-sm text-slate-500">
          HIPAA append-only log. Every PHI access, login, decision, override is recorded.
        </p>
      </div>

      <form className="card card-body flex flex-wrap items-end gap-3" onSubmit={search}>
        <label className="flex flex-col">
          <span className="mb-1 text-xs font-medium text-slate-600">Actor user ID</span>
          <input className="input max-w-xs" placeholder="UUID" value={actorUserId} onChange={e => setActorUserId(e.target.value)} />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-xs font-medium text-slate-600">Resource type</span>
          <input className="input max-w-xs" placeholder="patient, claim, pa_request…" value={resource} onChange={e => setResource(e.target.value)} />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-xs font-medium text-slate-600">Resource ID</span>
          <input className="input max-w-xs" placeholder="UUID" value={resourceId} onChange={e => setResourceId(e.target.value)} />
        </label>
        <button className="btn-primary" type="submit" disabled={loading}>
          <MagnifyingGlassIcon className="h-4 w-4" /> {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      <DataTable rows={rows} columns={columns} loading={loading} errorMessage={error ?? undefined} rowKey={r => r.id} emptyMessage="No audit events match." />

      <p className="text-xs text-slate-500">
        Backed by `audit_log_events` (append-only, triggers block UPDATE/DELETE) + 7-year
        WORM-locked MinIO archive. Read access is RLS-scoped to your state.
      </p>
    </div>
  );
}

export default function AuditPortal(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['compliance_officer', 'qa_auditor', 'fraud_investigator', 'state_medicaid_agency', 'federal_cms', 'platform_administrator']}>
      <AppShell><AuditInner /></AppShell>
    </AuthGate>
  );
}
