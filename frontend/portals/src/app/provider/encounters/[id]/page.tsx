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
  id: string; doc_type: 'note'|'audio'|'video'|'attachment'|'transcript';
  mime_type: string; size_bytes: string; sha256: string;
  extracted_text: string | null;
  entities: Array<{ text: string; type: string; confidence: number }> | null;
  suggested_diagnosis_codes: Array<{ code: string; code_system: string; description: string; confidence: number; rationale: string }> | null;
  suggested_procedure_codes:  Array<{ code: string; code_system: string; description: string; confidence: number; rationale: string }> | null;
  nlp_engine_version: string | null;
  uploaded_at: string;
}

interface Encounter {
  id: string; patient_id: string; provider_id: string;
  encounter_type: string; status: string;
  started_at: string; completed_at: string | null; signed_at: string | null;
  pa_request_ids: string[]; claim_ids: string[];
  documents: ClinicalDoc[];
}

function EncounterViewerInner(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const [enc, setEnc] = useState<Encounter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [noteText, setNoteText] = useState('');

  const load = (): void => {
    api.get<Encounter>(`/v1/clinical-doc/encounters/${id}`)
      .then(setEnc).catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { if (id) load(); }, [id]);

  const submitNote = async (): Promise<void> => {
    if (!noteText) return;
    setBusy(true); setError(null);
    try {
      await api.post(`/v1/clinical-doc/encounters/${id}/note`, { text: noteText });
      setNoteText(''); load();
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

  // Aggregate suggested codes across docs (deduped)
  const allDiag = new Map<string, ClinicalDoc['suggested_diagnosis_codes'] extends infer T ? T extends Array<infer U> ? U : never : never>();
  const allProc = new Map<string, ClinicalDoc['suggested_procedure_codes'] extends infer T ? T extends Array<infer U> ? U : never : never>();
  for (const d of enc.documents) {
    for (const c of (d.suggested_diagnosis_codes ?? [])) allDiag.set(c.code, c);
    for (const c of (d.suggested_procedure_codes ?? [])) allProc.set(c.code, c);
  }

  return (
    <DetailLayout
      title="Encounter"
      subtitle={<span className="font-mono text-xs">{enc.id}</span>}
      backHref="/provider/encounters"
      badges={<>
        <span className={statusBadge}>{enc.status}</span>
        <span className="badge-gray">{enc.encounter_type}</span>
      </>}
      actions={enc.status !== 'signed' && enc.status !== 'cancelled' && (
        <button className="btn-primary" disabled={busy} onClick={sign}>
          <CheckCircleIcon className="h-4 w-4" /> Sign encounter
        </button>
      )}
    >
      <DetailSection title="Encounter info">
        <dl>
          <FieldRow label="Patient">      <span className="font-mono text-xs">{enc.patient_id.slice(0, 8)}…</span></FieldRow>
          <FieldRow label="Started">      {formatDateTime(enc.started_at)}</FieldRow>
          <FieldRow label="Completed">    {formatDateTime(enc.completed_at)}</FieldRow>
          <FieldRow label="Signed">       {formatDateTime(enc.signed_at)}</FieldRow>
          <FieldRow label="Linked PAs">   {enc.pa_request_ids.length}</FieldRow>
          <FieldRow label="Linked claims">{enc.claim_ids.length}</FieldRow>
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
              <PencilSquareIcon className="h-4 w-4" /> Save & code
            </button>
            <button className="btn-ghost" disabled>
              <MicrophoneIcon className="h-4 w-4" /> Dictate (mobile only)
            </button>
          </div>
        </DetailSection>
      )}

      {(allDiag.size > 0 || allProc.size > 0) && (
        <DetailSection title="AI-suggested codes (clinical-nlp)">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Diagnoses (ICD-10)</h4>
              <ul className="space-y-2">
                {[...allDiag.values()].map(c => (
                  <li key={c.code} className="rounded-md border border-slate-200 p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{c.code}</span>
                      <span className="text-xs text-slate-500">conf {Math.round(c.confidence * 100)}%</span>
                    </div>
                    <div className="text-slate-700">{c.description}</div>
                    <div className="text-xs italic text-slate-500">{c.rationale}</div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Procedures (CPT)</h4>
              <ul className="space-y-2">
                {[...allProc.values()].map(c => (
                  <li key={c.code} className="rounded-md border border-slate-200 p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{c.code}</span>
                      <span className="text-xs text-slate-500">conf {Math.round(c.confidence * 100)}%</span>
                    </div>
                    <div className="text-slate-700">{c.description}</div>
                    <div className="text-xs italic text-slate-500">{c.rationale}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-2 text-xs text-slate-500">
            <SparklesIcon className="h-4 w-4 flex-shrink-0 text-brand-500" />
            Suggestions only — clinician must review and approve before any code goes on a claim.
          </p>
        </DetailSection>
      )}

      <DetailSection title="Documents">
        <ul className="divide-y divide-slate-100">
          {enc.documents.length === 0 && <li className="py-3 text-sm text-slate-500">No documents yet.</li>}
          {enc.documents.map(d => (
            <li key={d.id} className="flex items-center justify-between py-3 text-sm">
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="h-4 w-4 text-slate-500" />
                <span className="font-mono text-xs">{d.id.slice(0, 8)}…</span>
                <span className="badge-gray text-xs">{d.doc_type}</span>
              </div>
              <span className="text-xs text-slate-500">{formatDateTime(d.uploaded_at)}</span>
            </li>
          ))}
        </ul>
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
