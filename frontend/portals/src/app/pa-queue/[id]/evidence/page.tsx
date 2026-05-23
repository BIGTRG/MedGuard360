'use client';

import { useState } from 'react';
import {
  CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, BookOpenIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

type Outcome = 'met' | 'not_met' | 'unclear';
interface Criterion {
  id: string;
  text: string;
  aiOutcome: Outcome;
  aiConfidence: number;
  aiEvidence: string;
  humanOutcome?: Outcome;
  humanNote?: string;
}

const SAMPLE_PA = {
  id: '70000000-0000-0000-0000-000000000001',
  service: '70553 — MRI brain w/o contrast',
  diagnosis: 'G44.1 (Vascular headache, NEC)',
  payer: 'NC_MEDICAID',
  patient: 'John Doe (NCMD00100001)',
  ordering: 'Dr. Alice Johnson MD (1234567893)',
  urgency: 'standard (7 days)',
  dueAt: '2026-05-29T13:13Z',
};

const SAMPLE_CRITERIA: Criterion[] = [
  {
    id: 'c1', text: 'Documentation of headache present ≥ 4 weeks',
    aiOutcome: 'met', aiConfidence: 0.92,
    aiEvidence: 'Encounter note (2026-05-15): "patient reports daily headaches for past 6 weeks, worsening with exertion." Cited by pa-nlp-matcher v1.0.',
  },
  {
    id: 'c2', text: 'Failed conservative treatment ≥ 4 weeks (NSAID + lifestyle)',
    aiOutcome: 'unclear', aiConfidence: 0.41,
    aiEvidence: 'Note mentions "ibuprofen 600 mg trial" but no documented duration or response.',
  },
  {
    id: 'c3', text: 'Red-flag features OR neurologic exam abnormality',
    aiOutcome: 'not_met', aiConfidence: 0.78,
    aiEvidence: 'Neuro exam documented as normal. No red flags (no thunderclap onset, no fever, no focal deficit).',
  },
];

function badge(o: Outcome): React.ReactElement {
  if (o === 'met')      return <span className="badge-green"><CheckCircleIcon className="h-3.5 w-3.5 mr-1"/>met</span>;
  if (o === 'not_met')  return <span className="badge-red"><XCircleIcon className="h-3.5 w-3.5 mr-1"/>not met</span>;
  return <span className="badge-yellow"><QuestionMarkCircleIcon className="h-3.5 w-3.5 mr-1"/>unclear</span>;
}

function EvidenceInner({ id: paId }: { id: string }): React.ReactElement {
  const [criteria, setCriteria] = useState<Criterion[]>(SAMPLE_CRITERIA);
  const [decision, setDecision] = useState<'approve' | 'deny' | 'needs_more_info' | null>(null);
  const [explanation, setExplanation] = useState('');

  function setHuman(id: string, outcome: Outcome): void {
    setCriteria(criteria.map(c => c.id === id ? { ...c, humanOutcome: outcome } : c));
  }

  const aiSummary = (() => {
    const met = criteria.filter(c => c.aiOutcome === 'met').length;
    const total = criteria.length;
    return `${met}/${total} criteria met by AI`;
  })();

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
          <div><dt className="text-slate-500">Service</dt><dd className="font-medium">{SAMPLE_PA.service}</dd></div>
          <div><dt className="text-slate-500">Diagnosis</dt><dd className="font-medium">{SAMPLE_PA.diagnosis}</dd></div>
          <div><dt className="text-slate-500">Payer</dt><dd className="font-medium">{SAMPLE_PA.payer}</dd></div>
          <div><dt className="text-slate-500">Patient</dt><dd className="font-medium">{SAMPLE_PA.patient}</dd></div>
          <div><dt className="text-slate-500">Ordering provider</dt><dd className="font-medium">{SAMPLE_PA.ordering}</dd></div>
          <div><dt className="text-slate-500">Urgency / due</dt><dd className="font-medium">{SAMPLE_PA.urgency} · {new Date(SAMPLE_PA.dueAt).toLocaleString()}</dd></div>
        </dl>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-700"><SparklesIcon className="inline h-4 w-4 text-brand-600 mr-1"/>AI summary: <strong>{aiSummary}</strong></div>
        <span className="badge-yellow">pa-nlp-matcher v1.0</span>
      </div>

      <div className="space-y-3">
        {criteria.map(c => (
          <div key={c.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-slate-900">{c.text}</p>
                <p className="text-xs text-slate-600 mt-1">{c.aiEvidence}</p>
                <p className="text-xs text-slate-500 mt-1">AI confidence: {Math.round(c.aiConfidence * 100)}%</p>
              </div>
              <div className="text-right space-y-2">
                <div>{badge(c.aiOutcome)}</div>
                <div className="flex gap-1">
                  <button onClick={() => setHuman(c.id, 'met')}     className={'rounded border px-2 py-1 text-xs ' + (c.humanOutcome === 'met' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-300 hover:bg-slate-50')}>met</button>
                  <button onClick={() => setHuman(c.id, 'not_met')} className={'rounded border px-2 py-1 text-xs ' + (c.humanOutcome === 'not_met' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-300 hover:bg-slate-50')}>not met</button>
                  <button onClick={() => setHuman(c.id, 'unclear')} className={'rounded border px-2 py-1 text-xs ' + (c.humanOutcome === 'unclear' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-300 hover:bg-slate-50')}>unclear</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Decision</h3>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setDecision('approve')}          className={'rounded border px-4 py-2 text-sm ' + (decision === 'approve' ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-300 hover:bg-slate-50')}>Approve</button>
          <button onClick={() => setDecision('deny')}             className={'rounded border px-4 py-2 text-sm ' + (decision === 'deny' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-300 hover:bg-slate-50')}>Deny</button>
          <button onClick={() => setDecision('needs_more_info')}  className={'rounded border px-4 py-2 text-sm ' + (decision === 'needs_more_info' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-300 hover:bg-slate-50')}>Needs more info</button>
        </div>
        <label className="text-xs font-medium text-slate-500">Explanation to provider (required, ≥ 1 sentence)</label>
        <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={3}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="Plain language explanation of which criteria were met or missing." />
        <button disabled={!decision || explanation.length < 20}
          className="mt-3 rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
          Submit decision
        </button>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        AI generated the criterion outcomes — <strong>human decision is required</strong> before
        the PA is finalized. Decision emits <code>pa.approved</code> / <code>pa.denied</code> /
        <code>pa.needs.more.info</code> to Kafka with full audit trail.
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
