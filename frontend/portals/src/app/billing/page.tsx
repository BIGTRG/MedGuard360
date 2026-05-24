'use client';
import { CurrencyDollarIcon, DocumentTextIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

export default function BillingManagerPage() {
  return (
    <AuthGate><AppShell>
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><CurrencyDollarIcon className="h-5 w-5"/> Billing Manager — Revenue Cycle</h2>
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">A/R 0-30 days</dt><dd className="text-2xl font-semibold">$182K</dd></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">A/R 31-60</dt><dd className="text-2xl font-semibold">$94K</dd></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">A/R 61-90</dt><dd className="text-2xl font-semibold">$28K</dd></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">A/R 90+</dt><dd className="text-2xl font-semibold text-red-700">$11K</dd></div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">Worklists</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between items-center border-b border-slate-100 pb-2"><span className="flex items-center gap-2"><ExclamationTriangleIcon className="h-4 w-4 text-amber-600"/>Held claims (missing info)</span><span className="badge-yellow">14</span></li>
            <li className="flex justify-between items-center border-b border-slate-100 pb-2"><span className="flex items-center gap-2"><ArrowPathIcon className="h-4 w-4 text-blue-600"/>Resubmit queue</span><span className="badge-gray">7</span></li>
            <li className="flex justify-between items-center border-b border-slate-100 pb-2"><span className="flex items-center gap-2"><DocumentTextIcon className="h-4 w-4 text-slate-600"/>Awaiting 835 reconciliation</span><span className="badge-gray">23</span></li>
            <li className="flex justify-between items-center"><span className="flex items-center gap-2"><CurrencyDollarIcon className="h-4 w-4 text-green-600"/>Ready to bill secondary</span><span className="badge-green">3</span></li>
          </ul>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold mb-3">Timely filing tracker</h3>
          <p className="text-sm text-slate-600">NC Medicaid timely filing: 365 days from DOS. 3 claims approaching deadline (within 30 days). Auto-alerts via notification-service.</p>
        </div>
      </div>
    </AppShell></AuthGate>
  );
}
