'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MapIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';

function ScheduleTripInner(): React.ReactElement {
  const router = useRouter();
  const claims = getCurrentClaims();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    patientId: '', brokerId: claims?.sub ?? '', payerId: '',
    stateCode: claims?.stateCode ?? 'NC',
    tripType: 'one_way' as 'one_way' | 'round_trip' | 'recurring',
    pickupAddress: '', destinationAddress: '',
    scheduledPickupAt: '', appointmentId: '',
  });

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]): void => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      const trip = await api.post<{ id: string }>('/v1/nemt/trips', {
        ...form,
        scheduledPickupAt: new Date(form.scheduledPickupAt).toISOString(),
        appointmentId: form.appointmentId || undefined,
      });
      router.push(`/nemt/${trip.id}`);
    } catch (err) {
      setError((err as Error).message); setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <MapIcon className="h-5 w-5" /> Schedule NEMT trip
      </h2>
      <form onSubmit={submit} className="card card-body grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Patient UUID *">          <input required className="input" value={form.patientId} onChange={e => set('patientId', e.target.value)} /></Field>
        <Field label="Payer ID *">              <input required className="input" value={form.payerId}   onChange={e => set('payerId', e.target.value)} /></Field>
        <Field label="State *">                 <input required maxLength={2} className="input uppercase" value={form.stateCode} onChange={e => set('stateCode', e.target.value)} /></Field>
        <Field label="Trip type *">
          <select className="input" value={form.tripType} onChange={e => set('tripType', e.target.value as typeof form.tripType)}>
            <option value="one_way">One way</option>
            <option value="round_trip">Round trip</option>
            <option value="recurring">Recurring</option>
          </select>
        </Field>
        <Field label="Pickup address *"      className="md:col-span-2"><input required className="input" value={form.pickupAddress}      onChange={e => set('pickupAddress', e.target.value)} /></Field>
        <Field label="Destination address *" className="md:col-span-2"><input required className="input" value={form.destinationAddress} onChange={e => set('destinationAddress', e.target.value)} /></Field>
        <Field label="Scheduled pickup *"    ><input required type="datetime-local" className="input" value={form.scheduledPickupAt} onChange={e => set('scheduledPickupAt', e.target.value)} /></Field>
        <Field label="Appointment ID (optional)"><input className="input" value={form.appointmentId} onChange={e => set('appointmentId', e.target.value)} /></Field>
        {error && <div className="md:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Scheduling…' : 'Schedule trip'}
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

export default function ScheduleNemtPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['nemt_broker','individual_provider','facility_provider','platform_administrator']}>
      <AppShell><ScheduleTripInner /></AppShell>
    </AuthGate>
  );
}
