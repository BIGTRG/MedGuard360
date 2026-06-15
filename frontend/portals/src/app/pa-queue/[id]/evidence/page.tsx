'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, BookOpenIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';

// ─── Types — match GET /api/v1/prior-auth/pa-requests/:id ──────────────────

type CriterionOutcome = 'met' | 'not_met' | 'unclear';
type ApiOutcome = 'met' | 'not_met' | 'indeterminate' | 'unclear';

interface PaRequestRow {
  id: string;
  patient_id: string;
  provider_user_id: string;
  state_code: string;
  payer_id: string;
  procedure_code: string;
  diagnosis_codes: string[];
  clinical_justification: string;
  urgency: 'standard' | 'expedited' | 'drug';
  status: 'pending' | 'approved' | 'denied' | 'needs_more_info' | 'expired';
  ai_recommendation: string | null;
  ai_confidence: number | null;
  ai_explanation: string | null;
  human_reviewer_id: string | null;
  human_decision: string | null;
  human_notes: string | null;
  due_at: string;
  decided_at: string | null;
  created_at: string;
}

interface CriterionEvaluation {
  id: string;
  pa_request_id: string;
  criterion_text: string;
  similarity_score: number;
  outcome: ApiOutcome;
  explanation: string;
  human_outcome: ApiOutcome | null;
  human_outcome_at: string | null;
  human_reviewer_id: string | null;
  created_at: string;
}

interface PaDetailResponse {
  paRequest: PaRequestRow;
  criteriaEvaluations: CriterionEvaluation[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeOutcome(o: ApiOutcome): CriterionOutcome {
  // pa-nlp-matcher emits 'indeterminate' but the UI treats unclear/indeterminate equivalently.
  if (o === 'indeterminate') return 'unclear';
  return o;
}

function outcomeBadge(o: CriterionOutcome): React.ReactElement {
  if (o === 'met')     return <span className="badge-green"><CheckCircleIcon className="h-3.5 w-3.5 mr-1" />met</span>;
  if (o === 'not_met') return <span className="badge-red"><XCircleIcon className="h-3.5 w-3.5 mr-1" />not met</span>;
  return <span className="badge-yellow"><QuestionMarkCircleIcon className="h-3.5 w-3.5 mr-1" />unclear</span>;
}

function urgencyLabel(u: PaRequestRow['urgency']): string {
  if (u === 'drug')      return 'drug (24h)';
  if (u === 'expedited') return 'expedited (72h)';
  return 'standard (7 days)';
}

// ─── Page ──────────────────────────────────────────────────────────────────

function EvidenceInner({ id: paId }: { id: string }): React.ReactElement {
  const [data, setData] = useState<PaDetailResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Per-criterion override save tracking (UUID → saving | error). The actual
  // override values come from data.criteriaEvaluations[].human_outcome so they
  // round-trip through the server and persist across page reloads.
  const [savingCriterion, setSavingCriterion] = useState<Record<string, boolean>>({});

  // Decision form state
  const [decision, setDecision] = useState<'approved' | 'denied' | 'needs_more_info' | null>(null);
  const [explanation, setExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<PaDetailResponse & { criteria?: CriterionEvaluation[] }>(`/v1/prior-auth/pa-requests/${paId}`)
      .then((r) => setData({
        paRequest: r.paRequest ?? (r as unknown as PaRequestRow),
        criteriaEvaluations: r.criteriaEvaluations ?? r.criteria ?? [],
      }))
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [paId]);

  const aiSummary = useMemo(() => {
    if (!data) return '';
    const met = data.criteriaEvaluations.filter(c => normalizeOutcome(c.outcome) === 'met').length;
    return `${met}/${data.criteriaEvaluations.length} criteria met by AI`;
  }, [data]);

  async function submit(): Promise<void> {
    if (!decision) return;
    if (explanation.trim().length < 20) {
      alert('Explanation must be at least 20 characters.');
      return;
    }
    setSubmitting(true);
    try {
      // Per-criterion overrides are persisted live via PUT
      // /criteria/:cid/override (migration 0024). The decision notes no
      // longer need to carry override breadcrumbs — they're queryable
      // from pa_criterion_evaluations.human_outcome directly.
      await api.post(`/v1/prior-auth/pa-requests/${paId}/decide`, { decision, notes: explanation.trim() });
      const refreshed = await api.get<PaDetailResponse>(`/v1/prior-auth/pa-requests/${paId}`);
      setData(refreshed);
      setDecision(null);
      setExplanation('');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function setOverride(criterionId: string, o: CriterionOutcome): Promise<void> {
    setSavingCriterion(prev => ({ ...prev, [criterionId]: true }));
    try {
      // 'unclear' is normalized to 'indeterminate' server-side via the
      // OverrideSchema.transform on prior-auth-service.
      await api.put(
        `/v1/prior-auth/pa-requests/${paId}/criteria/${criterionId}/override`,
        { outcome: o },
      );
      const refreshed = await api.get<PaDetailResponse>(`/v1/prior-auth/pa-requests/${paId}`);
      setData(refreshed);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSavingCriterion(prev => ({ ...prev, [criterionId]: false }));
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Loading PA {paId}…</div>;
  if (err) return <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-900">{err}</div>;
  if (!data) return <div className="text-sm text-slate-500">PA request not found.</div>;

  const { paRequest, criteriaEvaluations } = data;
  const alreadyDecided = paRequest.decided_at !== null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <BookOpenIcon className="h-5 w-5" /> PA Evidence Review
        </h2>
        <p className="text-xs text-slate-500 mt-0.5 font-mono">{paId}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-xs">
          <div><dt className="text-slate-500">Procedure</dt><dd className="font-medium">{paRequest.procedure_code}</dd></div>
          <div><dt className="text-slate-500">Diagnoses</dt><dd className="font-medium">{paRequest.diagnosis_codes.join(', ')}</dd></div>
          <div><dt className="text-slate-500">Payer</dt><dd className="font-medium">{paRequest.payer_id}</dd></div>
          <div><dt className="text-slate-500">Patient</dt><dd className="font-medium font-mono">{paRequest.patient_id.slice(0, 8)}…</dd></div>
          <div><dt className="text-slate-500">Ordering provider</dt><dd className="font-medium font-mono">{paRequest.provider_user_id.slice(0, 8)}…</dd></div>
          <div><dt className="text-slate-500">Urgency / due</dt><dd className="font-medium">{urgencyLabel(paRequest.urgency)} · {new Date(paRequest.due_at).toLocaleString()}</dd></div>
        </dl>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-700"><SparklesIcon className="inline h-4 w-4 text-brand-600 mr-1" />AI summary: <strong>{aiSummary || 'no criteria evaluated yet'}</strong></div>
        <span className="badge-yellow">pa-nlp-matcher · confidence {paRequest.ai_confidence !== null ? Math.round(paRequest.ai_confidence * 100) + '%' : '—'}</span>
      </div>

      {paRequest.ai_explanation && (
        <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <strong>AI overall:</strong> {paRequest.ai_explanation}
          {paRequest.ai_recommendation && <div className="mt-1"><strong>Recommendation:</strong> {paRequest.ai_recommendation}</div>}
        </div>
      )}

      <div className="space-y-3">
        {criteriaEvaluations.length === 0 && (
          <div className="text-xs text-slate-400 italic px-4 py-3 border border-dashed border-slate-200 rounded">
            No criterion-level evaluations attached to this PA yet. The clinical decision engine
            may still be running, or this PA was created without a payer rule lookup. Refresh in a moment.
          </div>
        )}
        {criteriaEvaluations.map(c => {
          const aiOut = normalizeOutcome(c.outcome);
          const humanOut: CriterionOutcome | null = c.human_outcome ? normalizeOutcome(c.human_outcome) : null;
          const saving = savingCriterion[c.id] === true;
          return (
            <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium text-slate-900">{c.criterion_text}</p>
                  <p className="text-xs text-slate-600 mt-1">{c.explanation}</p>
                  <p className="text-xs text-slate-500 mt-1">AI similarity: {Math.round(c.similarity_score * 100)}%</p>
                  {humanOut && c.human_outcome_at && (
                    <p className="text-xs text-amber-700 mt-1">
                      Investigator override: <strong>{humanOut}</strong>
                      {' '}({new Date(c.human_outcome_at).toLocaleString()})
                    </p>
                  )}
                </div>
                <div className="text-right space-y-2">
                  <div>{outcomeBadge(aiOut)}</div>
                  {!alreadyDecided && (
                    <div className="flex gap-1">
                      <button disabled={saving} onClick={() => void setOverride(c.id, 'met')}     className={'rounded border px-2 py-1 text-xs disabled:opacity-50 ' + (humanOut === 'met'     ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-300 hover:bg-slate-50')}>met</button>
                      <button disabled={saving} onClick={() => void setOverride(c.id, 'not_met')} className={'rounded border px-2 py-1 text-xs disabled:opacity-50 ' + (humanOut === 'not_met' ? 'border-red-500 bg-red-50 text-red-700'     : 'border-slate-300 hover:bg-slate-50')}>not met</button>
                      <button disabled={saving} onClick={() => void setOverride(c.id, 'unclear')} className={'rounded border px-2 py-1 text-xs disabled:opacity-50 ' + (humanOut === 'unclear' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-300 hover:bg-slate-50')}>unclear</button>
                    </div>
                  )}
                  {saving && <div className="text-xs text-slate-400 italic">saving…</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {alreadyDecided ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Decision (final)</h3>
          <dl className="text-xs space-y-1">
            <div><dt className="inline text-slate-500">Decision:</dt> <dd className="inline font-medium">{paRequest.human_decision ?? paRequest.status}</dd></div>
            <div><dt className="inline text-slate-500">Decided:</dt> <dd className="inline font-medium">{paRequest.decided_at && new Date(paRequest.decided_at).toLocaleString()}</dd></div>
            <div><dt className="inline text-slate-500">Reviewer:</dt> <dd className="inline font-mono">{paRequest.human_reviewer_id?.slice(0, 8)}…</dd></div>
            {paRequest.human_notes && <div className="mt-2"><dt className="text-slate-500 mb-0.5">Notes:</dt> <dd className="text-slate-800 whitespace-pre-wrap">{paRequest.human_notes}</dd></div>}
          </dl>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Decision</h3>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setDecision('approved')}         className={'rounded border px-4 py-2 text-sm ' + (decision === 'approved' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-300 hover:bg-slate-50')}>Approve</button>
            <button onClick={() => setDecision('denied')}           className={'rounded border px-4 py-2 text-sm ' + (decision === 'denied' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-300 hover:bg-slate-50')}>Deny</button>
            <button onClick={() => setDecision('needs_more_info')}  className={'rounded border px-4 py-2 text-sm ' + (decision === 'needs_more_info' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-300 hover:bg-slate-50')}>Needs more info</button>
          </div>
          <label className="text-xs font-medium text-slate-500">Explanation to provider (required, ≥20 chars)</label>
          <textarea
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="Plain language explanation of which criteria were met or missing."
          />
          <button
            disabled={!decision || explanation.trim().length < 20 || submitting}
            onClick={() => void submit()}
            className="mt-3 rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit decision'}
          </button>
          {criteriaEvaluations.some(c => c.human_outcome) && (
            <p className="text-xs text-slate-500 mt-2">
              {criteriaEvaluations.filter(c => c.human_outcome).length} criterion override{criteriaEvaluations.filter(c => c.human_outcome).length === 1 ? '' : 's'} are persisted on this PA and visible to other reviewers.
            </p>
          )}
        </div>
      )}

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        AI generated the criterion outcomes — <strong>human decision is required</strong> before
        the PA is finalized. Decision emits <code>pa.decided.approved</code> / <code>pa.decided.denied</code> /
        <code>pa.decided.needs_more_info</code> to Kafka with full audit trail.
      </div>
    </div>
  );
}

export default function PaEvidencePage({ params }: { params: { id: string } }): React.ReactElement {
  return (
    <AuthGate>
      <AppShell>
        <EvidenceInner id={params.id} />
      </AppShell>
    </AuthGate>
  );
}
