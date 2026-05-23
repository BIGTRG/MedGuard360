'use client';

import { useEffect, useState } from 'react';
import {
  ExclamationTriangleIcon, ClockIcon, DocumentMagnifyingGlassIcon,
  ChatBubbleLeftIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';

// ─── Types — match GET /api/v1/fraud/cases/:id ─────────────────────────────

type EscalationTarget = 'OCPI' | 'MFCU' | 'CMS_UPIC' | 'STATE_OIG';

interface FraudCase {
  id: string;
  claim_id: string;
  provider_user_id: string;
  patient_id: string;
  state_code: string;
  risk_score: number | null;
  risk_level: string | null;
  flags: string[];
  recommendation: string | null;
  ai_explanation: string | null;
  // Actual values used by the service: 'open' | 'under_review' | 'cleared' | 'confirmed_fraud'.
  // Kept as string here to avoid drifting if new states are added on the backend.
  status: string;
  assigned_to: string | null;
  ai_engine_unavailable: boolean;
  resolved_at: string | null;
  resolution_notes: string | null;
  escalated_at: string | null;
  escalated_by: string | null;
  escalation_target: EscalationTarget | null;
  escalation_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface TimelineEvent {
  ts: string;
  who: string;
  type: 'flag' | 'review' | 'note' | 'escalate' | 'resolve';
  text: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Synthesize a timeline from fraud_cases fields. There's no fraud_case_events
 * table yet — adding one is a future enhancement. The timeline shows:
 *   - opened (created_at)        — system event with AI flags + score
 *   - assigned (updated_at)      — only if assigned_to is set
 *   - resolved (resolved_at)     — only if resolved_at is set
 *   - local notes (this session) — investigator scratchpad, not persisted yet
 */
function synthesizeTimeline(c: FraudCase, localNotes: TimelineEvent[]): TimelineEvent[] {
  const out: TimelineEvent[] = [];

  // Opening event
  out.push({
    ts: c.created_at,
    who: 'fraud-engine-service',
    type: 'flag',
    text: `Claim ${c.claim_id.slice(0, 8)}… scored ${c.risk_score ?? '?'}/100${c.risk_level ? ` (${c.risk_level})` : ''}.` +
      (c.recommendation ? ` Recommendation: ${c.recommendation}.` : '') +
      (c.flags.length ? ` Flags: ${c.flags.join(', ')}.` : ''),
  });
  if (c.ai_explanation) {
    out.push({
      ts: c.created_at,
      who: 'fraud-detection AI',
      type: 'review',
      text: c.ai_explanation,
    });
  }
  if (c.ai_engine_unavailable) {
    out.push({
      ts: c.created_at,
      who: 'platform',
      type: 'flag',
      text: 'AI engine was unavailable when this case opened — defaulted to manual review.',
    });
  }
  if (c.assigned_to) {
    out.push({
      ts: c.updated_at,
      who: 'platform',
      type: 'review',
      text: `Assigned to investigator ${c.assigned_to.slice(0, 8)}….`,
    });
  }
  if (c.escalated_at) {
    out.push({
      ts: c.escalated_at,
      who: c.escalated_by ? `investigator ${c.escalated_by.slice(0, 8)}…` : 'investigator',
      type: 'escalate',
      text: `Escalated to ${c.escalation_target ?? 'OCPI'}${c.escalation_notes ? ': ' + c.escalation_notes : '.'}`,
    });
  }
  if (c.resolved_at && c.resolution_notes) {
    out.push({
      ts: c.resolved_at,
      who: 'investigator',
      type: 'resolve',
      text: `Resolved as ${c.status}: ${c.resolution_notes}`,
    });
  }

  // Append local (session-scoped) notes
  return [...out, ...localNotes].sort((a, b) => a.ts.localeCompare(b.ts));
}

function badge(s: FraudCase['status']): React.ReactElement {
  if (s === 'cleared')          return <span className="badge-green">cleared</span>;
  if (s === 'confirmed_fraud')  return <span className="badge-red">confirmed fraud</span>;
  if (s === 'under_review')     return <span className="badge-yellow">under review</span>;
  if (s === 'investigating')    return <span className="badge-yellow">investigating</span>;
  return <span className="badge-gray">open</span>;
}

// ─── Page ──────────────────────────────────────────────────────────────────

function CaseInner({ id }: { id: string }): React.ReactElement {
  const [fraudCase, setFraudCase] = useState<FraudCase | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Session-scoped scratchpad notes. Persisted into resolution_notes on resolve.
  const [localNotes, setLocalNotes] = useState<TimelineEvent[]>([]);
  const [draft, setDraft] = useState('');

  // Resolve-flow state
  const [resolveStatus, setResolveStatus] = useState<'cleared' | 'confirmed_fraud' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Escalation modal state
  const [showEscalate, setShowEscalate] = useState(false);
  const [escalateTarget, setEscalateTarget] = useState<EscalationTarget>('OCPI');
  const [escalateNotes, setEscalateNotes] = useState('');
  const [escalating, setEscalating] = useState(false);

  useEffect(() => {
    api.get<FraudCase>(`/v1/fraud/cases/${id}`)
      .then(setFraudCase)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  function addLocalNote(): void {
    if (!draft.trim()) return;
    setLocalNotes([...localNotes, {
      ts: new Date().toISOString(),
      who: 'me (draft — not persisted)',
      type: 'note',
      text: draft.trim(),
    }]);
    setDraft('');
  }

  async function escalate(): Promise<void> {
    if (!fraudCase) return;
    if (escalateNotes.trim().length < 10) {
      alert('Escalation notes must be at least 10 characters.');
      return;
    }
    setEscalating(true);
    try {
      await api.post(`/v1/fraud/cases/${id}/escalate`, {
        target: escalateTarget,
        notes:  escalateNotes.trim(),
      });
      const refreshed = await api.get<FraudCase>(`/v1/fraud/cases/${id}`);
      setFraudCase(refreshed);
      setShowEscalate(false);
      setEscalateNotes('');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setEscalating(false);
    }
  }

  async function resolve(status: 'cleared' | 'confirmed_fraud'): Promise<void> {
    if (!fraudCase) return;
    // Aggregate local notes into the resolution payload
    const noteText = localNotes.length
      ? localNotes.map(n => `- ${n.text}`).join('\n')
      : `Resolved as ${status} by investigator.`;
    if (noteText.length < 10) {
      alert('Need at least 10 characters of notes to resolve.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/v1/fraud/cases/${id}/resolve`, { status, notes: noteText });
      // Refetch the case so the UI shows the resolved state
      const refreshed = await api.get<FraudCase>(`/v1/fraud/cases/${id}`);
      setFraudCase(refreshed);
      setLocalNotes([]);
      setResolveStatus(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-sm text-slate-500">Loading case {id}…</div>;
  if (err) return <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-900">{err}</div>;
  if (!fraudCase) return <div className="text-sm text-slate-500">Case not found.</div>;

  const events = synthesizeTimeline(fraudCase, localNotes);
  const isResolved = fraudCase.status === 'cleared' || fraudCase.status === 'confirmed_fraud';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" /> Fraud Case <code className="text-sm">{id.slice(0, 8)}…</code>
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Claim {fraudCase.claim_id.slice(0, 8)}… · provider {fraudCase.provider_user_id.slice(0, 8)}… ·
          {' '}{fraudCase.state_code} · opened {fraudCase.created_at.slice(0, 10)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="rounded border border-slate-200 bg-white p-3">
          <dt className="text-slate-500">AI score</dt>
          <dd className={'text-lg font-semibold ' + ((fraudCase.risk_score ?? 0) >= 70 ? 'text-red-700' : (fraudCase.risk_score ?? 0) >= 40 ? 'text-amber-700' : 'text-slate-700')}>
            {fraudCase.risk_score ?? '—'} / 100
          </dd>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3">
          <dt className="text-slate-500">Status</dt><dd className="text-lg font-semibold mt-1">{badge(fraudCase.status)}</dd>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3">
          <dt className="text-slate-500">Assigned</dt>
          <dd className="text-lg font-semibold text-slate-900">{fraudCase.assigned_to ? `${fraudCase.assigned_to.slice(0, 8)}…` : 'unassigned'}</dd>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-xs font-medium text-slate-500 uppercase mb-3">Timeline</div>
        <ol className="space-y-3">
          {events.map((e, i) => {
            const Icon = e.type === 'flag' ? ShieldCheckIcon
                       : e.type === 'review' ? DocumentMagnifyingGlassIcon
                       : e.type === 'note' ? ChatBubbleLeftIcon
                       : e.type === 'escalate' ? ExclamationTriangleIcon
                       : e.type === 'resolve' ? ShieldCheckIcon
                       : ClockIcon;
            return (
              <li key={i} className="flex gap-3">
                <div className={'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ' +
                  (e.type === 'flag' ? 'bg-red-50 text-red-700' :
                   e.type === 'note' ? 'bg-slate-100 text-slate-600' :
                   e.type === 'review' ? 'bg-blue-50 text-blue-700' :
                   e.type === 'escalate' ? 'bg-amber-50 text-amber-700' :
                   'bg-green-50 text-green-700')}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">{e.who}</span>
                    <span className="text-slate-500">{new Date(e.ts).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-700 mt-0.5">{e.text}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {!isResolved && (
          <div className="mt-4 border-t border-slate-200 pt-3">
            <label className="text-xs font-medium text-slate-500">Add scratchpad note (aggregated into resolution)</label>
            <div className="flex gap-2 mt-1">
              <input value={draft} onChange={e => setDraft(e.target.value)} className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm" placeholder="What did you find?" />
              <button onClick={addLocalNote} className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700">Add</button>
            </div>
            <p className="text-xs text-slate-400 mt-1 italic">Notes persist into the case only when you Mark cleared or Confirm fraud below. A dedicated fraud_case_events table is future work.</p>
          </div>
        )}
      </div>

      {!isResolved && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={submitting}
              onClick={() => { setResolveStatus('cleared'); void resolve('cleared'); }}
              className="rounded border border-green-300 text-green-700 px-4 py-2 text-sm hover:bg-green-50 disabled:opacity-50">
              {submitting && resolveStatus === 'cleared' ? 'Submitting…' : 'Mark cleared'}
            </button>
            <button
              disabled={submitting}
              onClick={() => { setResolveStatus('confirmed_fraud'); void resolve('confirmed_fraud'); }}
              className="rounded bg-red-600 text-white px-4 py-2 text-sm hover:bg-red-700 disabled:opacity-50">
              {submitting && resolveStatus === 'confirmed_fraud' ? 'Submitting…' : 'Confirm fraud'}
            </button>
            <button
              disabled={submitting || !!fraudCase.escalated_at}
              onClick={() => setShowEscalate(true)}
              title={fraudCase.escalated_at ? `Already escalated to ${fraudCase.escalation_target}` : 'Hand off to Program Integrity'}
              className="rounded border border-amber-300 text-amber-800 px-4 py-2 text-sm hover:bg-amber-50 disabled:opacity-50">
              {fraudCase.escalated_at ? `Escalated to ${fraudCase.escalation_target}` : 'Escalate to OCPI'}
            </button>
          </div>
          {localNotes.length > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              {localNotes.length} scratchpad note{localNotes.length === 1 ? '' : 's'} will be saved to the case on resolve.
            </p>
          )}

          {showEscalate && (
            <div className="mt-4 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Escalate case</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-xs text-slate-600">
                  <span className="block mb-1 font-medium">Counterparty</span>
                  <select
                    value={escalateTarget}
                    onChange={e => setEscalateTarget(e.target.value as EscalationTarget)}
                    className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm">
                    <option value="OCPI">OCPI (NC Medicaid Office of Compliance &amp; Program Integrity)</option>
                    <option value="STATE_OIG">State OIG (GA DCH / SC HHS)</option>
                    <option value="MFCU">MFCU (NC DOJ MID / GA AG MFD)</option>
                    <option value="CMS_UPIC">CMS UPIC (Qlarant)</option>
                  </select>
                </label>
                <div></div>
                <label className="text-xs text-slate-600 md:col-span-2">
                  <span className="block mb-1 font-medium">Notes (≥10 chars)</span>
                  <textarea
                    value={escalateNotes}
                    onChange={e => setEscalateNotes(e.target.value)}
                    rows={3}
                    placeholder="Brief justification + evidence pointers. This becomes part of the alert packet to the receiving party."
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  disabled={escalating || escalateNotes.trim().length < 10}
                  onClick={() => void escalate()}
                  className="rounded bg-amber-600 text-white px-4 py-2 text-sm hover:bg-amber-700 disabled:opacity-50">
                  {escalating ? 'Escalating…' : `Send to ${escalateTarget}`}
                </button>
                <button
                  disabled={escalating}
                  onClick={() => { setShowEscalate(false); setEscalateNotes(''); }}
                  className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FraudCasePage({ params }: { params: { id: string } }): React.ReactElement {
  return (
    <AuthGate>
      <AppShell>
        <CaseInner id={params.id} />
      </AppShell>
    </AuthGate>
  );
}
