'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';

function NewDmeInner(): React.ReactElement {
  const router = useRouter();
  const claims = getCurrentClaims();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    patientId: '', prescribingProviderId: '', supplierProviderId: claims?.sub ?? '',
    payerId: '', stateCode: claims?.stateCode ?? 'NC',
    hcpcsCode: '', description: '', quantity: 1,
    rentalOrPurchase: 'rental' as 'rental'|'purchase',
    rentalMonths: '', totalChargeCents: 0,
    priorAuthId: '', cmnComplete: false,
    dateOfService: new Date().toISOString().slice(0, 10),
    deliveryAddress: '',
  });

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]): void => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      const payload = {
        ...form,
        rentalMonths: form.rentalOrPurchase === 'rental' && form.rentalMonths
          ? Number(form.rentalMonths) : undefined,
        priorAuthId: form.priorAuthId || undefined,
        deliveryAddress: form.deliveryAddress || undefined,
      };
      const order = await api.post<{ order: { id: string } }>('/v1/dme/orders', payload);
      router.push(`/dme/${order.order.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">New DME order</h2>
      <form onSubmit={submit} className="card card-body grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Patient UUID *"        ><input required className="input" value={form.patientId} onChange={e => set('patientId', e.target.value)} /></Field>
        <Field label="Prescribing provider * "><input required className="input" value={form.prescribingProviderId} onChange={e => set('prescribingProviderId', e.target.value)} /></Field>
        <Field label="Payer ID *"             ><input required className="input" value={form.payerId} onChange={e => set('payerId', e.target.value)} /></Field>
        <Field label="State *"                ><input required maxLength={2} className="input uppercase" value={form.stateCode} onChange={e => set('stateCode', e.target.value)} /></Field>
        <Field label="HCPCS code *"           ><input required maxLength={5} className="input uppercase" value={form.hcpcsCode} onChange={e => set('hcpcsCode', e.target.value)} placeholder="E0601" /></Field>
        <Field label="Description *"          ><input required className="input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="CPAP device" /></Field>
        <Field label="Quantity"               ><input type="number" min={1} className="input" value={form.quantity} onChange={e => set('quantity', Number(e.target.value))} /></Field>
        <Field label="Rental or purchase">
          <select className="input" value={form.rentalOrPurchase} onChange={e => set('rentalOrPurchase', e.target.value as 'rental'|'purchase')}>
            <option value="rental">Rental</option><option value="purchase">Purchase</option>
          </select>
        </Field>
        {form.rentalOrPurchase === 'rental' && (
          <Field label="Rental months"><input type="number" min={1} className="input" value={form.rentalMonths} onChange={e => set('rentalMonths', e.target.value)} /></Field>
        )}
        <Field label="Total charge (cents) *"><input required type="number" min={0} className="input" value={form.totalChargeCents} onChange={e => set('totalChargeCents', Number(e.target.value))} /></Field>
        <Field label="Date of service *"      ><input required type="date" className="input" value={form.dateOfService} onChange={e => set('dateOfService', e.target.value)} /></Field>
        <Field label="Prior auth UUID (optional)"><input className="input" value={form.priorAuthId} onChange={e => set('priorAuthId', e.target.value)} /></Field>
        <Field label="Delivery address (optional)" className="md:col-span-2"><input className="input" value={form.deliveryAddress} onChange={e => set('deliveryAddress', e.target.value)} /></Field>
        <label className="md:col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.cmnComplete} onChange={e => set('cmnComplete', e.target.checked)} />
          Certificate of Medical Necessity is on file
        </label>
        {error && <div className="md:col-span-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="md:col-span-2 flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            <CheckCircleIcon className="h-4 w-4" /> {submitting ? 'Submitting…' : 'Create order'}
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

export default function NewDmeOrderPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['dmepos_supplier','individual_provider','facility_provider','platform_administrator']}>
      <AppShell><NewDmeInner /></AppShell>
    </AuthGate>
  );
}
