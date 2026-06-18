'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SparklesIcon, PaperAirplaneIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DetailLayout, DetailSection, FieldRow } from '@/components/DetailLayout';
import { api } from '@/lib/api-client';
import { formatCurrencyCents, formatDateTime } from '@/lib/format';

interface AppealRow {
  id: string; attempt_number: number; status: string;
  drafted_by_ai: boolean; ai_engine_version: string | null; ai_confidence: string | null;
  subject: string; body: string; attachments: string[];
  reviewed_at: string | null; submitted_at: string | null;
}
interface DenialDetail {
  id: string; claim_id: string; carc_code: string; carc_description: string;
  rarc_codes: string[]; denied_amount_cents: string; payer_message: string | null;
  status: string; appeal_deadline: string | null; remit_received_at: string;
  state_code: string;
  appeals: AppealRow[];
}

function DenialDetailInner(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<DenialDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [editing, setEditing] = useState<{ subject: string; body: string } | null>(null);

  const load = (): void => {
    api.get<DenialDetail>(`/v1/denials/${id}`)
      .then(setD)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { if (id) load(); }, [id]);

  const draft = async (): Promise<void> => {
    setDrafting(true); setError(null);
    try {
      await api.post(`/v1/denials/${id}/draft-appeal`, {});
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDrafting(false);
    }
  };

  const saveEdit = async (appealId: string): Promise<void> => {
    if (!editing) return;
    try {
      await api.post(`/v1/denials/appeals/${appealId}/review`, editing);
      setEditing(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const submitAppeal = async (appealId: string): Promise<void> => {
    try {
      await api.post(`/v1/denials/appeals/${appealId}/submit`, {});
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading denial…</div>;
  if (!d) return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error ?? 'Not found'}</div>;

  const latestDraft = d.appeals.find(a => a.status === 'draft');

  return (
    <DetailLayout
      title={`Denial — CARC ${d.carc_code}`}
      subtitle={<span className="font-mono text-xs">{d.id}</span>}
      backHref="/denials"
      badges={<>
        <span className="badge-red">{d.carc_description}</span>
        <span className="badge-gray">{d.state_code}</span>
        <span className="badge-gray">{formatCurrencyCents(d.denied_amount_cents)} denied</span>
      </>}
      actions={!latestDraft && d.status !== 'appeal_won' && (
        <button onClick={draft} disabled={drafting} className="btn-primary">
          <SparklesIcon className="h-4 w-4" /> {drafting ? 'Drafting…' : 'AI draft appeal'}
        </button>
      )}
    >
      <DetailSection title="Denial details">
        <dl>
          <FieldRow label="Claim">           <span className="font-mono text-xs">{d.claim_id}</span></FieldRow>
          <FieldRow label="Remit received">  {formatDateTime(d.remit_received_at)}</FieldRow>
          <FieldRow label="Appeal deadline"> {d.appeal_deadline ? formatDateTime(d.appeal_deadline) : '—'}</FieldRow>
          <FieldRow label="RARC codes">      {d.rarc_codes.join(', ') || '—'}</FieldRow>
          <FieldRow label="Payer message">   {d.payer_message ?? '—'}</FieldRow>
        </dl>
      </DetailSection>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {d.appeals.map(a => (
        <DetailSection key={a.id} title={`Appeal attempt #${a.attempt_number} — ${a.status.replace('_', ' ')}`}>
          {editing && editing.subject === a.subject ? (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Subject</span>
                <input className="input" value={editing.subject} onChange={e => setEditing({ ...editing, subject: e.target.value })} />
              </label>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Body</span>
                <textarea className="input min-h-[240px] font-mono text-xs" value={editing.body}
                  onChange={e => setEditing({ ...editing, body: e.target.value })} />
              </label>
              <div className="mt-3 flex gap-2">
                <button className="btn-primary" onClick={() => saveEdit(a.id)}>Save edits</button>
                <button className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <h4 className="text-sm font-semibold">{a.subject}</h4>
              {a.drafted_by_ai && (
                <div className="mt-1 text-xs text-slate-500">
                  AI-drafted via <span className="font-mono">{a.ai_engine_version}</span>
                  {a.ai_confidence && ` • confidence ${Math.round(Number(a.ai_confidence) * 100)}%`}
                </div>
              )}
              <pre className="mt-3 overflow-x-auto rounded-md bg-slate-50 p-3 font-mono text-xs whitespace-pre-wrap">{a.body}</pre>
              {a.attachments.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-medium text-slate-600">Recommended attachments:</div>
                  <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">
                    {a.attachments.map(att => <li key={att}>{att}</li>)}
                  </ul>
                </div>
              )}
              {a.status === 'draft' && (
                <div className="mt-3 flex gap-2">
                  <button className="btn-ghost" onClick={() => setEditing({ subject: a.subject, body: a.body })}>
                    <PencilSquareIcon className="h-4 w-4" /> Edit
                  </button>
                  <button className="btn-primary" onClick={() => submitAppeal(a.id)}>
                    <PaperAirplaneIcon className="h-4 w-4" /> Submit to payer
                  </button>
                </div>
              )}
            </>
          )}
        </DetailSection>
      ))}
    </DetailLayout>
  );
}

export default function DenialDetailPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['denial_appeals_specialist','billing_manager','compliance_officer','platform_administrator']}>
      <AppShell><DenialDetailInner /></AppShell>
    </AuthGate>
  );
}
