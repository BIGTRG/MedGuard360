'use client';
import { BuildingOffice2Icon, UsersIcon, CurrencyDollarIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

export default function McoAdminPage() {
  return (
    <AuthGate><AppShell>
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><BuildingOffice2Icon className="h-5 w-5"/> MCO Admin — Plan Operations</h2>
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">Members</dt><dd className="text-2xl font-semibold">324,891</dd></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">Network providers</dt><dd className="text-2xl font-semibold">4,127</dd></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">MTD claims paid</dt><dd className="text-2xl font-semibold">$48.2M</dd></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">PA approval rate</dt><dd className="text-2xl font-semibold">87%</dd></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><UsersIcon className="h-4 w-4"/>Encounter data submissions</h3><p className="text-sm text-slate-600">Daily encounter feed to NCTracks (per 42 CFR 438.242). Last successful: 3h ago. 47,219 encounters submitted today.</p></div>
          <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><ShieldCheckIcon className="h-4 w-4"/>Provider directory accuracy</h3><p className="text-sm text-slate-600">CMS rule requires &gt;95% directory accuracy. Current: 96.4% (auto-verified weekly via provider-monitor engine).</p></div>
          <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><CurrencyDollarIcon className="h-4 w-4"/>Capitation reconciliation</h3><p className="text-sm text-slate-600">Monthly PMPM cap payments vs incurred claims. MLR (Medical Loss Ratio) running 86.4% — above 85% floor.</p></div>
          <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold mb-2">Network adequacy</h3><p className="text-sm text-slate-600">All counties meet PCP/specialist time-distance standards. NC DHHS audit due Q3.</p></div>
        </div>
      </div>
    </AppShell></AuthGate>
  );
}
