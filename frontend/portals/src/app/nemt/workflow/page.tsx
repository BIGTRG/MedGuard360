'use client';
import { TruckIcon, MapIcon, ClipboardDocumentListIcon, CurrencyDollarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

const STEPS = [
  { icon: ClipboardDocumentListIcon, title: '1. Member books ride', desc: 'Patient calls broker (MTM Link / ModivCare) or self-books in member app.' },
  { icon: MapIcon, title: '2. Broker authorizes', desc: 'mtm-adapter / modivcare-adapter assigns HCPCS (A0100 ambulatory, A0130 WC, A0090 stretcher) + mileage estimate.' },
  { icon: TruckIcon, title: '3. Trip + GPS capture', desc: 'Driver app records pickup, route polyline, dropoff timestamps. GPS variance >15% flags for review.' },
  { icon: CurrencyDollarIcon, title: '4. Submit trip claim', desc: 'nemt-service submits to broker; broker bills the Standard Plan via 837P.' },
  { icon: CheckCircleIcon, title: '5. Two-sided settlement', desc: 'Broker pays transport provider; plan pays broker. Both transactions audited.' },
];

export default function NemtWorkflow() {
  return (
    <AuthGate><AppShell>
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><TruckIcon className="h-5 w-5"/> NEMT broker workflow</h2>
        <ol className="space-y-3">
          {STEPS.map(s => { const Icon = s.icon; return (
            <li key={s.title} className="rounded-lg border border-slate-200 bg-white p-4 flex gap-3">
              <Icon className="h-6 w-6 text-brand-600 flex-shrink-0"/>
              <div><div className="font-medium text-slate-900">{s.title}</div><div className="text-sm text-slate-600">{s.desc}</div></div>
            </li>);})}
        </ol>
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          fraud-engine watches for 10 NEMT-specific red flags: phantom trips (no GPS), mileage inflation,
          duplicate billing, member ID resold to brokers, etc.
        </div>
      </div>
    </AppShell></AuthGate>
  );
}
