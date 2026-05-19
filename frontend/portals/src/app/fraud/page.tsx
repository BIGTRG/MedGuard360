'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ShieldCheckIcon, FireIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { Kpi } from '@/components/Kpi';
import { api, ApiError } from '@/lib/api-client';
import { cn, formatNumber, timeSince } from '@/lib/format';
import type { FraudCaseSummary } from '@/lib/types';

function FraudQueueInner(): React.ReactElement {
  const [cases, setCases] = useState<FraudCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ count: number; cases: FraudCaseSummary[] }>('/v1/fraud/cases')
      .then(r => setCases(r.cases))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total:    cases.length,
    critical: cases.filter(c => c.score >= 80).length,
    review:   cases.filter(c => c.score >= 30 && c.score < 80).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Fraud Investigation Queue</h2>
          <p className="text-sm text-slate-500">
            Cases sorted by AI score. Per AI governance, every case requires investigator review before final action.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Open cases" value={formatNumber(stats.total)} />
        <Kpi label="Auto-block (score ≥ 80)" value={formatNumber(stats.critical)} tone="danger" />
        <Kpi label="Route to review (30–79)" value={formatNumber(stats.review)} tone="warning" />
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Score</th>
              <th>Recommendation</th>
              <th>State</th>
              <th>Claim</th>
              <th>AI explanation</th>
              <th>Opened</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="py-6 text-center text-sm text-slate-500">Loading…</td></tr>
            )}
            {!loading && cases.length === 0 && !error && (
              <tr><td colSpan={7} className="py-6 text-center text-sm text-slate-500">No open cases.</td></tr>
            )}
            {error && (
              <tr><td colSpan={7} className="py-6 text-center text-sm text-red-700">{error}</td></tr>
            )}
            {cases.map(c => (
              <tr key={c.id}>
                <td>
                  <span className={cn(
                    'inline-flex h-9 w-12 items-center justify-center rounded-md font-mono text-sm font-semibold',
                    c.score >= 80 ? 'bg-red-100 text-red-700' :
                    c.score >= 30 ? 'bg-amber-100 text-amber-700' :
                                    'bg-slate-100 text-slate-700',
                  )}>{c.score}</span>
                </td>
                <td>
                  <span className={cn(
                    c.recommendation === 'auto_block'      ? 'badge-red'    :
                    c.recommendation === 'route_to_review' ? 'badge-yellow' : 'badge-green',
                  )}>
                    {c.recommendation.replace('_', ' ')}
                  </span>
                </td>
                <td><span className="badge-gray">{c.state_code}</span></td>
                <td className="font-mono text-xs text-slate-600">{c.claim_id.slice(0, 8)}…</td>
                <td className="max-w-xs truncate text-xs text-slate-600" title={c.explanation}>{c.explanation}</td>
                <td className="text-xs text-slate-500">{timeSince(c.opened_at)}</td>
                <td>
                  <Link href={`/fraud/${c.id}`} className="btn-ghost">Review</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card card-body bg-brand-50 text-sm text-brand-900">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="h-5 w-5 flex-shrink-0 text-brand-600" />
          <p>
            <strong className="font-semibold">AI governance:</strong> the AI engine never autonomously denies payment.
            Every case in this queue must be reviewed and resolved by an investigator. Overrides are logged and
            feed quarterly model retraining.
          </p>
        </div>
      </div>

      <div className="hidden">{FireIcon.toString()}</div>
    </div>
  );
}

export default function FraudQueue(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['fraud_investigator', 'compliance_officer', 'state_medicaid_agency', 'platform_administrator']}>
      <AppShell>
        <FraudQueueInner />
      </AppShell>
    </AuthGate>
  );
}
