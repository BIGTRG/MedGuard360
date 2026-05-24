'use client';
import { ShieldCheckIcon, DocumentMagnifyingGlassIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

const RECENT = [
  { what: 'PHI export — 47 patient records by user fraud@demo', at: '10 min ago',  flag: false },
  { what: 'Bulk claim download — 1,247 claims by billing@demo',  at: '38 min ago',  flag: false },
  { what: 'PA decision override — pa@demo overrode AI denial',   at: '1 hr ago',    flag: true  },
  { what: 'Failed login attempts (5x) — user denial@demo',       at: '3 hr ago',    flag: true  },
];

export default function CompliancePage() {
  return (
    <AuthGate><AppShell>
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheckIcon className="h-5 w-5"/> Compliance Officer</h2>
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">PHI events today</dt><dd className="text-2xl font-semibold">2,847</dd></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">Open audit findings</dt><dd className="text-2xl font-semibold text-amber-700">3</dd></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">BAAs current</dt><dd className="text-2xl font-semibold">7/8</dd></div>
          <div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">Breaches (12mo)</dt><dd className="text-2xl font-semibold text-green-700">0</dd></div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><DocumentMagnifyingGlassIcon className="h-4 w-4"/>Recent PHI access events</h3>
          <ul className="space-y-2 text-sm">
            {RECENT.map((r, i) => (
              <li key={i} className="flex justify-between items-center border-b border-slate-100 pb-2 last:border-0">
                <span className={r.flag ? 'text-amber-900' : 'text-slate-700'}>{r.flag && <ExclamationTriangleIcon className="inline h-4 w-4 text-amber-600 mr-1"/>}{r.what}</span>
                <span className="text-xs text-slate-500"><ClockIcon className="inline h-3 w-3 mr-1"/>{r.at}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold mb-2">HIPAA SRA status</h3><p className="text-sm text-slate-600">Annual risk assessment in progress with Coalfire. Week 3 of 8 — see <code>compliance/6-MONTH-COMPLIANCE-PLAN.md</code>.</p></div>
          <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold mb-2">SOC 2 Type II</h3><p className="text-sm text-slate-600">Observation period started 2026-05-23. Final report due Week 25. A-LIGN.</p></div>
          <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold mb-2">HITRUST CSF i1</h3><p className="text-sm text-slate-600">Parallel track with SOC 2. ~182 i1 controls mapped in <code>compliance/controls.md</code>.</p></div>
          <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold mb-2">42 CFR Part 2 (SUD)</h3><p className="text-sm text-slate-600">Separate consent flow active for any SUD record access. 3 patient consents in last 30 days.</p></div>
        </div>
      </div>
    </AppShell></AuthGate>
  );
}
