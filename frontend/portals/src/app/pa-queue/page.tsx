'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ClipboardDocumentCheckIcon, ClockIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { Kpi } from '@/components/Kpi';
import { api, ApiError } from '@/lib/api-client';
import { cn, formatDateTime, formatNumber, timeSince } from '@/lib/format';
import type { PaRequestRow } from '@/lib/types';

function PaQueueInner(): React.ReactElement {
  const [items, setItems] = useState<PaRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No backend endpoint yet; the queue endpoint can be added to prior-auth-service as a follow-up.
    // For now we surface the schema and let the user know.
    api.get<{ requests?: PaRequestRow[] }>('/v1/prior-auth/pa-requests/queue')
      .then(r => setItems(r.requests ?? []))
      .catch(err => {
        if (err instanceof ApiError && err.status === 404) {
          setError('PA queue endpoint not yet exposed by prior-auth-service. Add a GET /pa-requests/queue route to surface the in_review items.');
        } else {
          setError(err instanceof ApiError ? err.message : 'Failed to load queue');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const sla = {
    drug:      items.filter(p => p.urgency === 'drug').length,
    expedited: items.filter(p => p.urgency === 'expedited').length,
    standard:  items.filter(p => p.urgency === 'standard').length,
    overdue:   items.filter(p => new Date(p.due_at).getTime() < Date.now()).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Prior Authorization Queue</h2>
        <p className="text-sm text-slate-500">
          AI Clinical Decision Engine has reviewed each request against payer criteria.
          Every recommendation is yours to confirm — humans make the final call.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Drug PA (24h SLA)"        value={formatNumber(sla.drug)} tone="danger" />
        <Kpi label="Expedited PA (72h SLA)"   value={formatNumber(sla.expedited)} tone="warning" />
        <Kpi label="Standard PA (7d SLA)"     value={formatNumber(sla.standard)} />
        <Kpi label="Past due"                 value={formatNumber(sla.overdue)} tone="danger" />
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>AI score</th>
              <th>Service</th>
              <th>Diagnoses</th>
              <th>Urgency</th>
              <th>Due</th>
              <th>Submitted</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="py-6 text-center text-sm text-slate-500">Loading…</td></tr>}
            {!loading && items.length === 0 && !error && (
              <tr><td colSpan={7} className="py-6 text-center text-sm text-slate-500">Queue is empty.</td></tr>
            )}
            {error && (
              <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                {error}
              </td></tr>
            )}
            {items.map(p => {
              const score = p.ai_match_score ? Math.round(Number(p.ai_match_score) * 100) : null;
              const overdue = new Date(p.due_at).getTime() < Date.now();
              return (
                <tr key={p.id}>
                  <td>
                    {score != null && (
                      <span className={cn(
                        'inline-flex h-9 w-12 items-center justify-center rounded-md font-mono text-sm font-semibold',
                        score >= 85 ? 'bg-green-100 text-green-700' :
                        score >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700',
                      )}>{score}</span>
                    )}
                  </td>
                  <td className="font-mono text-xs">{p.service_code}</td>
                  <td className="text-xs">{p.diagnosis_codes.slice(0, 3).join(', ')}</td>
                  <td>
                    <span className={
                      p.urgency === 'drug' ? 'badge-red' :
                      p.urgency === 'expedited' ? 'badge-yellow' : 'badge-gray'
                    }>{p.urgency}</span>
                  </td>
                  <td className="text-xs">
                    <span className={overdue ? 'text-red-700 font-semibold' : ''}>
                      {formatDateTime(p.due_at)}
                    </span>
                  </td>
                  <td className="text-xs text-slate-500">{timeSince(p.created_at)}</td>
                  <td className="space-x-1 whitespace-nowrap">
                    <Link href={`/pa-queue/${p.id}/evidence`} className="btn-ghost text-xs">Evidence</Link>
                    <Link href={`/pa-queue/${p.id}`} className="btn-ghost text-xs">Decide</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card card-body bg-brand-50">
        <div className="flex items-start gap-3 text-sm text-brand-900">
          <SparklesIcon className="h-5 w-5 flex-shrink-0 text-brand-600" />
          <div>
            <strong className="font-semibold">How the AI helps:</strong> for each request, the
            BERT semantic-similarity engine has read the clinical evidence and scored each line of
            the coverage criteria document. You'll see which criteria are met, not-met, or
            indeterminate — with the evidence excerpt — when you open a request.
          </div>
        </div>
      </div>

      <div className="hidden">{ClipboardDocumentCheckIcon.toString()}{ClockIcon.toString()}</div>
    </div>
  );
}

export default function PaQueue(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['prior_auth_specialist', 'platform_administrator']}>
      <AppShell>
        <PaQueueInner />
      </AppShell>
    </AuthGate>
  );
}
