'use client';
import { useState } from 'react';
import { DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';

interface AuditEvent {
  id: string; occurred_at: string;
  actor_user_id: string | null; actor_role: string | null;
  resource: string; resource_id: string; action: string; outcome: string;
  context: Record<string, unknown>; producer: string;
}

function AuditSearchInner(): React.ReactElement {
  const [actor, setActor]   = useState('');
  const [resource, setResource] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [rows, setRows] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(): Promise<void> {
    setLoading(true);
    const params = new URLSearchParams();
    if (actor)    params.set('actorUserId', actor);
    if (resource) params.set('resource', resource);
    if (action)   params.set('action', action);
    if (from)     params.set('from', from);
    if (to)       params.set('to', to);
    params.set('limit', '200');
    try {
      const res = await api.get<{ rows: AuditEvent[] }>(`/v1/audit/search?${params.toString()}`);
      setRows(res.rows);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function exportCsv(): void {
    if (rows.length === 0) return;
    const header = 'occurred_at,actor_user_id,actor_role,resource,resource_id,action,outcome,producer';
    const csv = [header, ...rows.map(r =>
      [r.occurred_at, r.actor_user_id ?? '', r.actor_role ?? '', r.resource, r.resource_id, r.action, r.outcome, r.producer].join(','),
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit-search-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><DocumentMagnifyingGlassIcon className="h-5 w-5"/> Audit Log Search</h2>
        <p className="text-sm text-slate-600 mt-1">HIPAA append-only event log. Subpoena-grade. Filter by actor, resource, action, time.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Actor user ID"     value={actor}    onChange={e => setActor(e.target.value)} />
        <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Resource (e.g. patient)" value={resource} onChange={e => setResource(e.target.value)} />
        <input className="rounded border border-slate-300 px-3 py-2 text-sm" placeholder="Action (read/write/decide)" value={action} onChange={e => setAction(e.target.value)} />
        <input className="rounded border border-slate-300 px-3 py-2 text-sm" type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} />
        <input className="rounded border border-slate-300 px-3 py-2 text-sm" type="datetime-local" value={to}   onChange={e => setTo(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button onClick={search} disabled={loading} className="rounded bg-brand-600 text-white px-4 py-2 text-sm disabled:opacity-50">{loading ? 'Searching…' : 'Search'}</button>
        <button onClick={exportCsv} disabled={rows.length === 0} className="rounded border border-slate-300 px-4 py-2 text-sm disabled:opacity-50">Export CSV ({rows.length})</button>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-500"><tr>
            <th className="py-2 px-2">Time</th><th>Actor</th><th>Role</th><th>Resource</th><th>ID</th><th>Action</th><th>Outcome</th><th>Producer</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? <tr><td className="p-4 text-slate-500" colSpan={8}>{loading ? 'Loading…' : 'No matches — refine filters or click Search.'}</td></tr> :
              rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-1.5 px-2 font-mono">{new Date(r.occurred_at).toLocaleString()}</td>
                  <td className="font-mono">{r.actor_user_id?.slice(0,8) ?? '—'}</td>
                  <td>{r.actor_role ?? '—'}</td>
                  <td className="font-medium">{r.resource}</td>
                  <td className="font-mono">{r.resource_id?.slice(0,8)}</td>
                  <td>{r.action}</td>
                  <td><span className={r.outcome === 'success' ? 'badge-green' : 'badge-red'}>{r.outcome}</span></td>
                  <td className="text-slate-500">{r.producer}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AuditSearchPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['compliance_officer', 'qa_auditor', 'fraud_investigator', 'state_medicaid_agency', 'federal_cms', 'platform_administrator']}>
      <AppShell><AuditSearchInner /></AppShell>
    </AuthGate>
  );
}
