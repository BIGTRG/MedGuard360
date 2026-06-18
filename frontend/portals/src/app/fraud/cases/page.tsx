'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api, ApiError } from '@/lib/api-client';
import { cn, timeSince } from '@/lib/format';
import type { FraudCaseSummary } from '@/lib/types';

export default function FraudCasesIndexPage(): React.ReactElement {
  const [cases, setCases] = useState<FraudCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ cases: FraudCaseSummary[] }>('/v1/fraud/cases')
      .then(r => setCases(r.cases))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthGate allowedRoles={['fraud_investigator', 'compliance_officer', 'state_medicaid_agency', 'platform_administrator']}>
      <AppShell>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">All fraud cases</h2>
            <Link href="/fraud" className="btn-ghost text-sm">Back to queue</Link>
          </div>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Score</th>
                  <th>State</th>
                  <th>Claim</th>
                  <th>Opened</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="py-6 text-center text-sm text-slate-500">Loading...</td></tr>}
                {error && <tr><td colSpan={5} className="py-6 text-center text-sm text-red-700">{error}</td></tr>}
                {!loading && cases.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span className={cn(
                        'inline-flex h-9 w-12 items-center justify-center rounded-md font-mono text-sm font-semibold',
                        c.score >= 80 ? 'bg-red-100 text-red-700' : c.score >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100',
                      )}>{c.score}</span>
                    </td>
                    <td><span className="badge-gray">{c.state_code}</span></td>
                    <td className="font-mono text-xs">{c.claim_id.slice(0, 8)}...</td>
                    <td className="text-xs text-slate-500">{timeSince(c.opened_at)}</td>
                    <td><Link href={`/fraud/cases/${c.id}`} className="btn-ghost">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AppShell>
    </AuthGate>
  );
}