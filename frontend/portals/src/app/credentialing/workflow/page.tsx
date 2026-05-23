'use client';
import { ShieldCheckIcon, DocumentMagnifyingGlassIcon, IdentificationIcon, CheckBadgeIcon, ClockIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

const PSV = [
  { name: 'NPI Registry (NPPES)',         desc: 'Confirm name + taxonomy + practice address match',                        ok: true },
  { name: 'PECOS enrollment',             desc: 'Verify Medicare enrollment status + revalidation date',                    ok: true },
  { name: 'LEIE (OIG exclusions)',        desc: 'Monthly download cross-check',                                              ok: true },
  { name: 'SAM.gov entity exclusions',    desc: 'Federal contracts / awards exclusion list',                                 ok: true },
  { name: 'NC State medical license',     desc: 'NC Medical Board active license + no disciplinary',                         ok: true },
  { name: 'DEA registration',             desc: 'Active controlled-substance registration matching state of practice',       ok: true },
  { name: 'NC DHSR facility license',     desc: 'For facility applicants — licensed and not on suspension',                  ok: true },
  { name: 'NC DHSR HCPR (nurse aides)',   desc: 'For nurse aide hires — clean substantiated-finding registry',               ok: true },
];

export default function CredentialingWorkflow() {
  return (
    <AuthGate><AppShell>
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheckIcon className="h-5 w-5"/> Credentialing — 50-state PSV workflow</h2>
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2">
          <div className="flex gap-3 items-center"><IdentificationIcon className="h-6 w-6 text-brand-600"/><div><div className="font-medium">1. Application intake</div><div className="text-xs text-slate-600">Provider submits CAQH ProView pull OR direct entry. OCR engine extracts data from uploaded docs.</div></div></div>
          <div className="flex gap-3 items-center"><DocumentMagnifyingGlassIcon className="h-6 w-6 text-brand-600"/><div><div className="font-medium">2. Primary Source Verification (PSV)</div><div className="text-xs text-slate-600">Run 8 parallel checks (below). Target turnaround: 3-5 business days.</div></div></div>
          <div className="flex gap-3 items-center"><CheckBadgeIcon className="h-6 w-6 text-brand-600"/><div><div className="font-medium">3. Committee review</div><div className="text-xs text-slate-600">Credentialing specialist reviews PSV results + writes recommendation; medical director approves/denies.</div></div></div>
          <div className="flex gap-3 items-center"><ClockIcon className="h-6 w-6 text-brand-600"/><div><div className="font-medium">4. Monthly re-screen</div><div className="text-xs text-slate-600">provider-monitor engine re-runs LEIE/SAM/license-expiry monthly; alerts on changes.</div></div></div>
        </div>
        <table className="w-full text-sm rounded-lg border border-slate-200 bg-white">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="py-2 px-3">PSV Check</th><th>Purpose</th><th>Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {PSV.map(c => <tr key={c.name}><td className="py-2 px-3 font-medium">{c.name}</td><td className="text-slate-600">{c.desc}</td><td><span className="badge-green">passed</span></td></tr>)}
          </tbody>
        </table>
      </div>
    </AppShell></AuthGate>
  );
}
