'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { AuthGate } from '@/components/AuthGate';
import { api, ApiError } from '@/lib/api-client';
import { timeSince, cn } from '@/lib/format';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import type { FraudCase } from '@/lib/types';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'default' | 'info';

function riskVariant(score: number | null): BadgeVariant {
  if (!score) return 'default';
  if (score >= 80) return 'danger';
  if (score >= 30) return 'warning';
  return 'success';
}

function riskLabel(score: number | null): string {
  if (!score) return 'Unknown';
  if (score >= 80) return `Critical ${score}`;
  if (score >= 60) return `High ${score}`;
  if (score >= 30) return `Medium ${score}`;
  return `Low ${score}`;
}

function FraudInner(): React.ReactElement {
  const [cases, setCases] = useState<FraudCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ cases?: FraudCase[] }>('/v1/fraud/cases?limit=50')
      .then(d => setCases(d.cases ?? []))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load fraud cases'))
      .finally(() => setLoading(false));
  }, []);

  const total    = cases.length;
  const critical = cases.filter(c => (c.risk_score ?? 0) >= 80).length;
  const review   = cases.filter(c => { const s = c.risk_score ?? 0; return s >= 30 && s < 80; }).length;

  return (
    <DashboardLayout title="Fraud Investigation Queue">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-slate-500">
            Cases sorted by AI score. Per AI governance, every case requires investigator review before final action.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Open Cases"              value={total.toLocaleString()}    color="default" />
          <StatCard label="Auto-block (score ≥ 80)" value={critical.toLocaleString()} color="danger" />
          <StatCard label="Route to review (30–79)" value={review.toLocaleString()}   color="warning" />
        </div>

        <Card>
          {error ? (
            <p className="py-8 text-center text-sm text-red-700">{error}</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Score</th>
                  <th>Case ID</th>
                  <th>Status</th>
                  <th>AI Explanation</th>
                  <th>Opened</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-500">Loading…</td></tr>
                )}
                {!loading && cases.length === 0 && !error && (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-500">No open fraud cases.</td></tr>
                )}
                {cases.map(c => (
                  <tr key={c.id}>
                    <td>
                      <span className={cn(
                        'inline-flex h-9 w-12 items-center justify-center rounded-md font-mono text-sm font-semibold',
                        (c.risk_score ?? 0) >= 80 ? 'bg-red-100 text-red-700' :
                        (c.risk_score ?? 0) >= 30 ? 'bg-amber-100 text-amber-700' :
                                                     'bg-slate-100 text-slate-700',
                      )}>
                        {c.risk_score ?? '—'}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-slate-600">{c.id.slice(0, 8)}…</td>
                    <td><Badge variant={riskVariant(c.risk_score)}>{riskLabel(c.risk_score)}</Badge></td>
                    <td className="max-w-xs truncate text-xs text-slate-600" title={c.ai_explanation ?? ''}>
                      {c.ai_explanation ?? '—'}
                    </td>
                    <td className="text-xs text-slate-500">{timeSince(c.created_at)}</td>
                    <td>
                      <Link href={`/fraud/${c.id}`} className="btn-ghost text-xs">Review</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <div className="card card-body bg-brand-50">
          <div className="flex items-start gap-3 text-sm text-brand-900">
            <ShieldCheckIcon className="h-5 w-5 flex-shrink-0 text-brand-600 mt-0.5" />
            <p>
              <strong className="font-semibold">AI governance:</strong> the AI engine never autonomously
              denies payment. Every case in this queue must be reviewed and resolved by an investigator.
              Overrides are logged and feed quarterly model retraining.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function FraudPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={[
      'fraud_investigator', 'compliance_officer', 'state_medicaid_agency',
      'federal_cms', 'platform_administrator',
    ]}>
      <FraudInner />
    </AuthGate>
  );
}
