'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';

function NewPatientInner(): React.ReactElement {
  const router = useRouter();
  const claims = getCurrentClaims();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: '', lastName: '', dateOfBirth: '',
    sexAtBirth: '' as 'M'|'F'|'U'|'', medicaidId: '',
    email: '', phone: '', addressLine1: '', city: '',
    stateCode: claims?.stateCode ?? 'NC', postalCode: '',
  });

  const change = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    setForm(f => ({ ...f, [k]: e.target.value }));
  };

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (!form.sexAtBirth)  delete payload.sexAtBirth;
      if (!form.email)       delete payload.email;
      if (!form.medicaidId)  delete payload.medicaidId;
      if (!form.addressLine1) delete payload.addressLine1;
      const patient = await api.post<{ id: string }>('/v1/patients', payload);
      router.push(`/provider/patients/${patient.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Register new patient</h2>
      <form onSubmit={submit} className="card card-body grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="First name *">    <input required className="input" value={form.firstName} onChange={change('firstName')} /></Field>
        <Field label="Last name *">     <input required className="input" value={form.lastName}  onChange={change('lastName')} /></Field>
        <Field label="Date of birth *"> <input required type="date" className="input" value={form.dateOfBirth} onChange={change('dateOfBirth')} /></Field>
        <Field label="Sex at birth">
          <select className="input" value={form.sexAtBirth} onChange={change('sexAtBirth')}>
            <option value="">—</option><option value="M">M</option><option value="F">F</option><option value="U">U</option>
          </select>
        </Field>
        <Field label="Medicaid ID">     <input className="input" value={form.medicaidId} onChange={change('medicaidId')} /></Field>
        <Field label="State *">         <input required maxLength={2} className="input uppercase" value={form.stateCode} onChange={change('stateCode')} /></Field>
        <Field label="Email">           <input type="email" className="input" value={form.email} onChange={change('email')} /></Field>
        <Field label="Phone">           <input className="input" value={form.phone} onChange={change('phone')} /></Field>
        <Field label="Address" className="md:col-span-2"><input className="input" value={form.addressLine1} onChange={change('addressLine1')} /></Field>
        <Field label="City">            <input className="input" value={form.city} onChange={change('city')} /></Field>
        <Field label="ZIP">             <input className="input" value={form.postalCode} onChange={change('postalCode')} /></Field>
        {error && <div className="md:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            <CheckCircleIcon className="h-4 w-4" /> {submitting ? 'Saving…' : 'Register patient'}
          </button>
        </div>
      </form>
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

export default function NewPatientPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['individual_provider','facility_provider','credentialing_specialist','platform_administrator']}>
      <AppShell><NewPatientInner /></AppShell>
    </AuthGate>
  );
}
