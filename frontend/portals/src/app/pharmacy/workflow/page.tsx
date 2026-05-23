'use client';
import { BeakerIcon, ClipboardDocumentListIcon, ShieldCheckIcon, CurrencyDollarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

const STEPS = [
  { icon: ClipboardDocumentListIcon, title: '1. Rx received', desc: 'Provider e-prescribes via Surescripts → pharmacy queue.' },
  { icon: ShieldCheckIcon, title: '2. Eligibility + PA check', desc: 'eligibility-service confirms coverage; davinci-pas CRD checks if drug needs PA.' },
  { icon: BeakerIcon, title: '3. Formulary + DUR', desc: 'Lookup payer formulary, run drug-utilization-review for interactions and duplicate therapy.' },
  { icon: CurrencyDollarIcon, title: '4. NCPDP D.0 submit', desc: 'pharmacy-service generates NCPDP D.0 pipe-delimited claim → submit to PBM.' },
  { icon: CheckCircleIcon, title: '5. Adjudicate + dispense', desc: 'PBM returns paid amount + copay → pharmacist dispenses → patient signs.' },
];

export default function PharmacyWorkflow() {
  return (
    <AuthGate><AppShell>
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><BeakerIcon className="h-5 w-5"/> Pharmacy claim workflow</h2>
        <ol className="space-y-3">
          {STEPS.map(s => { const Icon = s.icon; return (
            <li key={s.title} className="rounded-lg border border-slate-200 bg-white p-4 flex gap-3">
              <Icon className="h-6 w-6 text-brand-600 flex-shrink-0"/>
              <div><div className="font-medium text-slate-900">{s.title}</div><div className="text-sm text-slate-600">{s.desc}</div></div>
            </li>);})}
        </ol>
      </div>
    </AppShell></AuthGate>
  );
}
