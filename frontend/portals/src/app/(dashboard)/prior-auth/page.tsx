'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { AuthGate } from '@/components/AuthGate';
import { api, ApiError } from '@/lib/api-client';
import { formatDateTime, timeSince, cn } from '@/lib/format';
import { SparklesIcon } from '@heroicons/react/24/outline';
import type { PaRequest } from '@/lib/types';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'default' | 'info';

function urgencyVariant(u: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    drug:      'danger',
    expedited: 'warning',
    standard:  'info',
  };
  return map[u] ?? 'default';
}

function recVariant(rec: string | null): BadgeVariant {
  if (!rec) return 'default';
  if (rec === 'approve') return 'success';
  if (rec === 'deny') return 'danger';
  return 'warning';
}

function PriorAuthInner(): React.ReactElement {
  const [requests, setRequests] = useState<PaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ requests?: PaRequest[] }>('/v1/prior-auth/pa-requests/queue')
      .then(d => setRequests(d.requests ?? []))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load queue'))
      .finally(() => setLoading(false));
  }, []);

  const sla = {
    drug:      requests.filter(r => r.urgency === 'drug').length,
    expedited: requests.filter(r => r.urgency === 'expedited').length,
    standard:  requests.filter(r => r.urgency === 'standard').length,
    overdue:   requests.filter(r => new Date(r.due_at).getTime() < Date.now()).length,
  };

  return (
    <DashboardLayout title="Prior Authorization Queue">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-slate-500">
            AI Clinical Decision Engine has reviewed each request against payer criteria.
            Every recommendation is yours to confirm — humans make the final call.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard label="Drug PA (24h SLA)"       value={sla.drug}      color="danger" />
          <StatCard label="Expedited PA (72h SLA)"  value={sla.expedited} color="warning" />
          <StatCard label="Standard PA (7d SLA)"    value={sla.standard}  color="default" />
          <StatCard label="Past Due"                value={sla.overdue}   color="danger" />
        </div>

        <Card title="Pending Decisions" subtitle="AI recommendations require human approval">
          {error ? (
            <p className="py-8 text-center text-sm text-slate-500">{error}</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Procedure</th>
                  <th>Urgency</th>
                  <th>AI Recommendation</th>
                  <th>Due</th>
                  <th>Submitted</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-500">Loading…</td></tr>
                )}
                {!loading && requests.length === 0 && !error && (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-500">Queue is empty.</td></tr>
                )}
                {requests.map(r => {
                  const overdue = new Date(r.due_at).getTime() < Date.now();
                  return (
                    <tr key={r.id}>
                      <td className="font-mono text-xs">{r.procedure_code}</td>
                      <td><Badge variant={urgencyVariant(r.urgency)}>{r.urgency}</Badge></td>
                      <td>
                        {r.ai_recommendation ? (
                          <Badge variant={recVariant(r.ai_recommendation)}>
                            AI: {r.ai_recommendation}
                          </Badge>
                        ) : '—'}
                      </td>
                      <td className={cn('text-xs', overdue && 'font-semibold text-red-700')}>
                        {formatDateTime(r.due_at)}
                      </td>
                      <td className="text-xs text-slate-500">{timeSince(r.created_at)}</td>
                      <td>
                        <Link href={`/pa-queue/${r.id}`} className="btn-ghost text-xs">Decide</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        <div className="card card-body bg-brand-50">
          <div className="flex items-start gap-3 text-sm text-brand-900">
            <SparklesIcon className="h-5 w-5 flex-shrink-0 text-brand-600 mt-0.5" />
            <div>
              <strong className="font-semibold">How the AI helps:</strong> for each request, the
              BERT semantic-similarity engine has read the clinical evidence and scored each line of
              the coverage criteria document. You will see which criteria are met, not-met, or
              indeterminate with the evidence excerpt when you open a request.
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function PriorAuthPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['prior_auth_specialist', 'billing_manager', 'platform_administrator']}>
      <PriorAuthInner />
    </AuthGate>
  );
}
