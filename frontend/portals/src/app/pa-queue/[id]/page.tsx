'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon,
  SparklesIcon, BookOpenIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api, ApiError } from '@/lib/api-client';
import { cn, formatDateTime } from '@/lib/format';
import type { PaRequestRow, CriterionEvalRow } from '@/lib/types';

interface DetailResponse extends PaRequestRow {
  criteria?: CriterionEvalRow[];
}

function DecisionInner(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [pa, setPa] = useState<DetailResponse | null>(null);
  const [criteria, setCriteria] = useState<CriterionEvalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [explanation, setExplanation] = useState('');

  useEffect(() => {
    if (!params.id) return;
    api.get<DetailResponse>(`/v1/prior-auth/pa-requests/${params.id}`)
      .then(r => {
        setPa(r);
        setCriteria(r.criteria ?? []);
      })
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const decide = async (status: 'approved' | 'denied' | 'needs_more_info'): Promise<void> => {
    if (!pa) return;
    if (explanation.trim().length < 10) {
      setError('Explanation must be at least 10 characters — your decision is part of the audit record.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/v1/prior-auth/pa-requests/${pa.id}/decide`, { status, explanation });
      router.push('/pa-queue');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to record decision');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading request…</div>;
  if (error && !pa) return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  if (!pa) return <div className="text-sm text-slate-500">Not found.</div>;

  const score = pa.ai_match_score ? Math.round(Number(pa.ai_match_score) * 100) : null;
  const met = criteria.filter(c => c.status === 'met');
  const notMet = criteria.filter(c => c.status === 'not_met');
  const indet = criteria.filter(c => c.status === 'indeterminate');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Prior Authorization Decision</h2>
          <p className="font-mono text-xs text-slate-500">{pa.id}</p>
        </div>
        <div className="flex gap-2">
          <span className={pa.urgency === 'drug' ? 'badge-red' : pa.urgency === 'expedited' ? 'badge-yellow' : 'badge-gray'}>
            {pa.urgency}
          </span>
          <span className="badge-gray">due {formatDateTime(pa.due_at)}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card card-body lg:col-span-2">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <SparklesIcon className="h-5 w-5 text-brand-600" />
            <h3 className="text-sm font-semibold text-slate-700">AI Clinical Decision Engine</h3>
            {pa.ai_engine_version && <span className="font-mono text-xs text-slate-400">{pa.ai_engine_version}</span>}
          </div>
          <div className="flex items-center gap-4 py-3">
            {score != null && (
              <div className={cn(
                'flex h-20 w-20 flex-col items-center justify-center rounded-xl font-bold',
                score >= 85 ? 'bg-green-100 text-green-700' :
                score >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700',
              )}>
                <span className="text-3xl">{score}</span>
                <span className="text-[10px] uppercase tracking-wider">match</span>
              </div>
            )}
            <div className="flex-1">
              <p className="whitespace-pre-line text-sm text-slate-700">{pa.decision_explanation ?? '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-3 text-center">
            <Stat label="Met"          value={met.length}   tone="success" />
            <Stat label="Not met"      value={notMet.length} tone="danger" />
            <Stat label="Indeterminate" value={indet.length} tone="warning" />
          </div>
        </div>

        <div className="card card-body">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Request</h3>
          <dl className="space-y-2 text-sm">
            <Field label="Service code"  value={<span className="font-mono">{pa.service_code}</span>} />
            <Field label="Diagnoses"     value={pa.diagnosis_codes.join(', ')} />
            <Field label="Payer"         value={pa.payer_id} />
            <Field label="State"         value={pa.state_code} />
            <Field label="Patient"       value={<span className="font-mono text-xs">{pa.patient_id.slice(0, 8)}…</span>} />
            <Field label="Submitted"     value={formatDateTime(pa.created_at)} />
          </dl>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
          <BookOpenIcon className="h-4 w-4 text-slate-500" />
          Criteria evaluation
          <span className="ml-auto text-xs font-normal text-slate-500">{criteria.length} criteria scored</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {criteria.length === 0 && (
            <li className="px-5 py-4 text-sm text-slate-500">
              No criterion-level evaluation available for this request.
            </li>
          )}
          {criteria.map(c => (
            <li key={c.id} className="px-5 py-4">
              <div className="mb-1 flex items-center gap-2">
                <span className={
                  c.status === 'met'     ? 'badge-green' :
                  c.status === 'not_met' ? 'badge-red'   : 'badge-yellow'
                }>
                  {c.status === 'met' && <CheckCircleIcon className="mr-1 h-3 w-3" />}
                  {c.status === 'not_met' && <XCircleIcon className="mr-1 h-3 w-3" />}
                  {c.status === 'indeterminate' && <QuestionMarkCircleIcon className="mr-1 h-3 w-3" />}
                  {c.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-slate-500">
                  confidence {Math.round(Number(c.ai_confidence) * 100)}%
                </span>
              </div>
              <p className="text-sm text-slate-800">{c.criterion_text}</p>
              {c.evidence_excerpt && (
                <blockquote className="mt-2 border-l-2 border-brand-300 pl-3 text-xs italic text-slate-600">
                  Evidence: “{c.evidence_excerpt}”
                </blockquote>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">Your decision</div>
        <div className="card-body space-y-3">
          <textarea
            className="input min-h-[120px]"
            placeholder="Plain-language explanation of your decision. This is part of the audit record and may be shared with the provider."
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
          />
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={submitting} onClick={() => decide('approved')}>
              <CheckCircleIcon className="h-4 w-4" /> Approve
            </button>
            <button className="btn-ghost" disabled={submitting} onClick={() => decide('needs_more_info')}>
              <QuestionMarkCircleIcon className="h-4 w-4" /> Request more info
            </button>
            <button className="btn-danger" disabled={submitting} onClick={() => decide('denied')}>
              <XCircleIcon className="h-4 w-4" /> Deny
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Your decision is logged with full criterion-level reasoning and may differ from the AI recommendation.
        Overrides feed quarterly retraining (AI governance).
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'success' | 'danger' | 'warning' }): React.ReactElement {
  const cls = tone === 'success' ? 'text-green-700' :
              tone === 'danger'  ? 'text-red-700'   : 'text-amber-700';
  return (
    <div>
      <div className={`text-2xl font-semibold ${cls}`}>{value}</div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

export default function PaDecisionPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['prior_auth_specialist', 'platform_administrator']}>
      <AppShell>
        <DecisionInner />
      </AppShell>
    </AuthGate>
  );
}
