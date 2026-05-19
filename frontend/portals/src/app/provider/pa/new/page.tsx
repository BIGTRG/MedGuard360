'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';

function NewPaInner(): React.ReactElement {
  const router = useRouter();
  const claims = getCurrentClaims();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnoses, setDiagnoses] = useState('');
  const [form, setForm] = useState({
    patientId: '', orderingProviderId: claims?.sub ?? '',
    payerId: '', stateCode: claims?.stateCode ?? 'NC',
    serviceCode: '', serviceCodeType: 'CPT' as 'CPT'|'HCPCS'|'NDC'|'REVENUE',
    serviceDescription: '',
    urgency: 'standard' as 'standard'|'expedited'|'drug',
    clinicalDocId: '',
  });

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]): void => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      const diagCodes = diagnoses.split(/[,\s]+/).filter(Boolean);
      const r = await api.post<{ paRequest: { id: string } }>('/v1/prior-auth/pa-requests', {
        ...form,
        serviceDescription: form.serviceDescription || undefined,
        clinicalDocId: form.clinicalDocId || undefined,
        diagnosisCodes: diagCodes,
      });
      router.push(`/provider/pa/${r.paRequest.id}`);
    } catch (err) {
      setError((err as Error).message); setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <ClipboardDocumentCheckIcon className="h-5 w-5" /> Submit prior authorization request
      </h2>
      <form onSubmit={submit} className="card card-body grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Patient UUID *">  <input required className="input" value={form.patientId} onChange={e => set('patientId', e.target.value)} /></Field>
        <Field label="Payer ID *">      <input required className="input" value={form.payerId} onChange={e => set('payerId', e.target.value)} /></Field>
        <Field label="State *">         <input required maxLength={2} className="input uppercase" value={form.stateCode} onChange={e => set('stateCode', e.target.value)} /></Field>
        <Field label="Urgency *">
          <select className="input" value={form.urgency} onChange={e => set('urgency', e.target.value as typeof form.urgency)}>
            <option value="standard">Standard (7 days)</option>
            <option value="expedited">Expedited (72 hours)</option>
            <option value="drug">Drug (24 hours)</option>
          </select>
        </Field>
        <Field label="Service code *">  <input required className="input uppercase" value={form.serviceCode} onChange={e => set('serviceCode', e.target.value)} placeholder="99213" /></Field>
        <Field label="Code type *">
          <select className="input" value={form.serviceCodeType} onChange={e => set('serviceCodeType', e.target.value as typeof form.serviceCodeType)}>
            <option value="CPT">CPT</option><option value="HCPCS">HCPCS</option>
            <option value="NDC">NDC</option><option value="REVENUE">Revenue</option>
          </select>
        </Field>
        <Field label="Service description" className="md:col-span-2"><input className="input" value={form.serviceDescription} onChange={e => set('serviceDescription', e.target.value)} /></Field>
        <Field label="Diagnosis codes (comma or space separated) *" className="md:col-span-2"><input required className="input uppercase" value={diagnoses} onChange={e => setDiagnoses(e.target.value)} placeholder="F32.9, F41.1" /></Field>
        <Field label="Clinical doc UUID (evidence)" className="md:col-span-2"><input className="input" value={form.clinicalDocId} onChange={e => set('clinicalDocId', e.target.value)} placeholder="Optional — AI engine reads this for criterion matching" /></Field>
        {error && <div className="md:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit for AI evaluation'}
          </button>
        </div>
      </form>
      <p className="text-xs text-slate-500">
        On submit, the BERT clinical-decision engine evaluates each criterion in the payer's
        coverage document against the clinical evidence. A specialist confirms the final decision.
      </p>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }): React.ReactElement {
  return (
    <label className={className ?? ''}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export default function NewPaPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['individual_provider','facility_provider','pharmacy','prior_auth_specialist','platform_administrator']}>
      <AppShell><NewPaInner /></AppShell>
    </AuthGate>
  );
}
