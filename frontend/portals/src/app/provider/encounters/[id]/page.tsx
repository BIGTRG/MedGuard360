'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  DocumentTextIcon, MicrophoneIcon, PencilSquareIcon, CheckCircleIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DetailLayout, DetailSection, FieldRow } from '@/components/DetailLayout';
import { api } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';

interface ClinicalDoc {
  id: string;
  document_type?: string;
  doc_type?: string;
  content?: string | null;
  created_at?: string;
}

interface Encounter {
  id: string;
  patient_id: string;
  provider_user_id?: string;
  provider_id?: string;
  status: string;
  service_date?: string;
  started_at?: string;
  created_at?: string;
  signed_at: string | null;
  note_text?: string | null;
}

interface EncounterDetail {
  encounter: Encounter;
  documents: ClinicalDoc[];
}

function EncounterViewerInner(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const [enc, setEnc] = useState<Encounter | null>(null);
  const [documents, setDocuments] = useState<ClinicalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [noteText, setNoteText] = useState('');

  const load = (): void => {
    api.get<EncounterDetail>(`/v1/clinical-doc/encounters/${id}`)
      .then(r => {
        setEnc(r.encounter);
        setDocuments(r.documents ?? []);
        const noteDoc = (r.documents ?? []).find(d => (d.document_type ?? d.doc_type) === 'note');
        setNoteText(noteDoc?.content ?? r.encounter.note_text ?? '');
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { if (id) load(); }, [id]);

  const submitNote = async (): Promise<void> => {
    if (!noteText) return;
    setBusy(true); setError(null);
    try {
      await api.put(`/v1/clinical-doc/encounters/${id}/note`, { noteText });
      load();
    } catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const sign = async (): Promise<void> => {
    setBusy(true);
    try {
      await api.post(`/v1/clinical-doc/encounters/${id}/sign`);
      load();
    } finally { setBusy(false); }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>;
  if (!enc) return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error ?? 'Not found'}</div>;

  const statusBadge = enc.status === 'signed' ? 'badge-green'
    : enc.status === 'transcribing' ? 'badge-yellow'
    : enc.status === 'cancelled' ? 'badge-red' : 'badge-blue';

  return (
    <DetailLayout
      title="Encounter"
      subtitle={<span className="font-mono text-xs">{enc.id}</span>}
      backHref="/provider/encounters"
      badges={<span className={statusBadge}>{enc.status}</span>}
      actions={enc.status !== 'signed' && enc.status !== 'cancelled' && (
        <button className="btn-primary" disabled={busy} onClick={sign}>
          <CheckCircleIcon className="h-4 w-4" /> Sign encounter
        </button>
      )}
    >
      <DetailSection title="Encounter info">
        <dl>
          <FieldRow label="Patient"><span className="font-mono text-xs">{enc.patient_id.slice(0, 8)}…</span></FieldRow>
          <FieldRow label="Service date">{formatDateTime(enc.started_at ?? enc.created_at)}</FieldRow>
          <FieldRow label="Signed">{formatDateTime(enc.signed_at)}</FieldRow>
        </dl>
      </DetailSection>

      {enc.status !== 'signed' && (
        <DetailSection title="Add a typed note">
          <textarea
            className="input min-h-[120px]"
            placeholder="Document the encounter…"
            value={noteText} onChange={e => setNoteText(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button className="btn-primary" disabled={busy || !noteText} onClick={submitNote}>
              <PencilSquareIcon className="h-4 w-4" /> Save note
            </button>
            <button className="btn-ghost" disabled>
              <MicrophoneIcon className="h-4 w-4" /> Dictate (mobile only)
            </button>
          </div>
        </DetailSection>
      )}

      {(noteText && enc.status === 'signed') && (
        <DetailSection title="Signed note">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{noteText}</p>
        </DetailSection>
      )}

      <DetailSection title="Documents">
        <ul className="divide-y divide-slate-100">
          {documents.length === 0 && <li className="py-3 text-sm text-slate-500">No documents yet.</li>}
          {documents.map(d => (
            <li key={d.id} className="flex items-center justify-between py-3 text-sm">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="h-4 w-4 text-slate-500" />
                <span className="font-mono text-xs">{d.id.slice(0, 8)}…</span>
                <span className="badge-gray text-xs">{d.document_type ?? d.doc_type ?? 'doc'}</span>
              </div>
              <span className="text-xs text-slate-500">{formatDateTime(d.created_at)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
          <SparklesIcon className="h-4 w-4 flex-shrink-0 text-brand-500" />
          Clinical NLP code suggestions appear after audio upload or note save in full deployments.
        </p>
      </DetailSection>
    </DetailLayout>
  );
}

export default function EncounterViewerPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['individual_provider','facility_provider','prior_auth_specialist','platform_administrator']}>
      <AppShell><EncounterViewerInner /></AppShell>
    </AuthGate>
  );
}
