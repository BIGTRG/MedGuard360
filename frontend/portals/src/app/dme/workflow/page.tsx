'use client';
import { TruckIcon, ClipboardDocumentListIcon, ShieldCheckIcon, CurrencyDollarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

const STEPS = [
  { icon: ClipboardDocumentListIcon, title: '1. Order received', desc: 'Provider orders DMEPOS item with HCPCS code (E0260 hospital bed, etc.).' },
  { icon: ShieldCheckIcon, title: '2. CMN + medical necessity', desc: 'Certificate of Medical Necessity validated; Da Vinci CRD checks PA requirement.' },
  { icon: TruckIcon, title: '3. Deliver + document', desc: 'Equipment delivered; patient signs Proof of Delivery; supplier captures photos.' },
  { icon: CurrencyDollarIcon, title: '4. Submit to CGS (DME MAC JC)', desc: 'dme-service generates 837P → CGS adapter submits via EDI. NC/SC/GA all route to Jurisdiction C.' },
  { icon: CheckCircleIcon, title: '5. Adjudicate + 835', desc: 'CGS returns 835 remittance → reconcile against expected reimbursement.' },
];

export default function DmeWorkflow() {
  return (
    <AuthGate><AppShell>
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><TruckIcon className="h-5 w-5"/> DMEPOS supplier workflow</h2>
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
