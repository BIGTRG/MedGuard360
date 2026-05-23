'use client';

import { useState } from 'react';
import {
  ExclamationTriangleIcon, ClockIcon, UserCircleIcon, DocumentMagnifyingGlassIcon,
  ChatBubbleLeftIcon, ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

interface TimelineEvent {
  ts: string;
  who: string;
  type: 'flag' | 'review' | 'note' | 'escalate' | 'resolve' | 'sanction';
  text: string;
}

const SAMPLE_TIMELINE: TimelineEvent[] = [
  { ts: '2026-05-22T14:30:00Z', who: 'fraud-engine-service', type: 'flag',     text: 'Claim 260515-000003 scored 82/100. Recommendation: route_to_review. Flags: unusual_volume, distance_anomaly.' },
  { ts: '2026-05-22T14:30:01Z', who: 'platform',             type: 'flag',     text: 'Auto-opened fraud_cases row 50000000-...-001. Status: open.' },
  { ts: '2026-05-22T15:12:00Z', who: 'fraud@demo',           type: 'review',   text: 'Pulled 30-day claim history for Dr. Alice Johnson MD (NPI 1234567893).' },
  { ts: '2026-05-22T15:48:00Z', who: 'fraud@demo',           type: 'note',     text: 'Provider billed 3x normal volume of CPT 99215 (high-complexity office visit) this week. Verifying patient location vs service location.' },
  { ts: '2026-05-22T16:05:00Z', who: 'fraud@demo',           type: 'note',     text: 'GPS confirms 9 of the patients were within 90 miles of service location at time of encounter — explains distance flag. Reducing distance_anomaly weight.' },
];

function CaseInner({ id }: { id: string }): React.ReactElement {
  const [events, setEvents] = useState<TimelineEvent[]>(SAMPLE_TIMELINE);
  const [draft, setDraft] = useState('');

  function addNote(): void {
    if (!draft.trim()) return;
    setEvents([...events, {
      ts: new Date().toISOString(), who: 'fraud@demo', type: 'note', text: draft.trim(),
    }]);
    setDraft('');
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" /> Fraud Case <code className="text-sm">{id}</code>
        </h2>
        <p className="text-sm text-slate-600 mt-1">Claim 260515-000003 · provider 1234567893 · NC · opened 2026-05-22</p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="rounded border border-slate-200 bg-white p-3">
          <dt className="text-slate-500">AI score</dt><dd className="text-lg font-semibold text-red-700">82 / 100</dd>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3">
          <dt className="text-slate-500">Status</dt><dd className="text-lg font-semibold text-amber-700">investigating</dd>
        </div>
        <div className="rounded border border-slate-200 bg-white p-3">
          <dt className="text-slate-500">Assigned</dt><dd className="text-lg font-semibold text-slate-900">fraud@demo</dd>
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
                       : e.type === 'sanction' ? ShieldCheckIcon
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

        <div className="mt-4 border-t border-slate-200 pt-3">
          <label className="text-xs font-medium text-slate-500">Add note</label>
          <div className="flex gap-2 mt-1">
            <input value={draft} onChange={e => setDraft(e.target.value)} className="flex-1 rounded border border-slate-300 px-3 py-1.5 text-sm" placeholder="What did you find?" />
            <button onClick={addNote} className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700">Add</button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">Escalate to OCPI</button>
        <button className="rounded border border-red-300 text-red-700 px-4 py-2 text-sm hover:bg-red-50">Recommend payment hold</button>
        <button className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100">Mark cleared</button>
      </div>
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
