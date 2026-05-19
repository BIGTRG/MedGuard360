'use client';

import { useEffect, useState } from 'react';
import { DocumentChartBarIcon, PlayIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { Kpi } from '@/components/Kpi';
import { api } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';
import { formatCurrencyCents, formatNumber } from '@/lib/format';

interface PermResult {
  jobId: string;
  data: {
    state_code: string;
    period: { from: string; to: string };
    summary: {
      total_claims: string; total_paid: string; total_denied: string;
      total_fraud_held: string; total_paid_cents: string;
    };
    top_denial_reasons: Array<{ code: string; cnt: string }>;
  };
}

function PermInner(): React.ReactElement {
  const [data, setData] = useState<PermResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    const t = new Date();
    const f = new Date(); f.setDate(f.getDate() - 90);
    setFrom(f.toISOString().slice(0, 10));
    setTo(t.toISOString().slice(0, 10));
  }, []);

  const run = async (): Promise<void> => {
    const claims = getCurrentClaims();
    if (!claims?.stateCode) { setError('No state assigned to your account'); return; }
    setRunning(true); setError(null);
    try {
      const r = await api.post<PermResult>('/v1/reporting/reports/run', {
        stateCode: claims.stateCode, kind: 'perm',
        from: new Date(from).toISOString(), to: new Date(to).toISOString(),
      });
      setData(r);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <DocumentChartBarIcon className="h-5 w-5" /> PERM Report
          </h2>
          <p className="text-sm text-slate-500">
            Payment Error Rate Measurement — CMS submission format.
          </p>
        </div>
      </div>

      <div className="card card-body flex flex-wrap items-end gap-3">
        <label className="flex flex-col">
          <span className="mb-1 text-xs font-medium text-slate-600">Period from</span>
          <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </label>
        <label className="flex flex-col">
          <span className="mb-1 text-xs font-medium text-slate-600">Period to</span>
          <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </label>
        <button className="btn-primary" onClick={run} disabled={running || !from || !to}>
          <PlayIcon className="h-4 w-4" /> {running ? 'Running…' : 'Run PERM report'}
        </button>
      </div>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Claims in period" value={formatNumber(data.data.summary.total_claims)} />
            <Kpi label="Paid" value={formatCurrencyCents(data.data.summary.total_paid_cents)} tone="success" />
            <Kpi label="Denied" value={formatNumber(data.data.summary.total_denied)} tone="warning" />
            <Kpi label="Fraud-held"  value={formatNumber(data.data.summary.total_fraud_held)} tone="danger" />
          </div>

          <div className="card">
            <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
              Top denial reasons
            </div>
            <table className="table">
              <thead><tr><th>CARC code</th><th>Count</th></tr></thead>
              <tbody>
                {data.data.top_denial_reasons.length === 0 && (
                  <tr><td colSpan={2} className="py-4 text-center text-sm text-slate-500">No denials in period.</td></tr>
                )}
                {data.data.top_denial_reasons.map(r => (
                  <tr key={r.code}>
                    <td className="font-mono">{r.code}</td>
                    <td>{formatNumber(r.cnt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-500">
            Report job <code className="font-mono">{data.jobId}</code> persisted to
            <code className="font-mono"> report_jobs</code>; full JSON available via
            <code className="font-mono"> GET /reports/{data.jobId}</code>.
          </p>
        </>
      )}
    </div>
  );
}

export default function PermPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['state_medicaid_agency', 'mco_admin', 'federal_cms', 'compliance_officer', 'platform_administrator']}>
      <AppShell><PermInner /></AppShell>
    </AuthGate>
  );
}
