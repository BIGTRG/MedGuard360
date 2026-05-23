'use client';
import { ExclamationTriangleIcon, SparklesIcon, PencilSquareIcon, PaperAirplaneIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

const CARC = [
  { code: 'CO-11', desc: 'Diagnosis inconsistent with procedure', strategy: 'Submit additional clinical documentation' },
  { code: 'CO-16', desc: 'Missing information', strategy: 'Identify missing field, resubmit corrected claim' },
  { code: 'CO-50', desc: 'Not medical necessity', strategy: 'Appeal with chart notes + payer policy citation' },
  { code: 'CO-96', desc: 'Non-covered charges', strategy: 'Check coverage; may need PA + appeal' },
  { code: 'CO-151', desc: 'Payment adjusted because billed in excess', strategy: 'Verify units billed match documentation' },
  { code: 'CO-197', desc: 'PA required', strategy: 'Retroactive PA request + appeal' },
  { code: 'CO-204', desc: 'Service not covered by patient plan', strategy: 'Confirm eligibility, bill secondary, or patient-pay' },
  { code: 'CO-236', desc: 'Procedure/modifier combo not compatible', strategy: 'Correct modifier and resubmit' },
];

export default function DenialsWorkflow() {
  return (
    <AuthGate><AppShell>
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><ExclamationTriangleIcon className="h-5 w-5"/> Denials & appeals workflow</h2>
        <ol className="space-y-3">
          <li className="rounded-lg border border-slate-200 bg-white p-4 flex gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600"/>
            <div><div className="font-medium">1. 835 remittance ingestion</div><div className="text-sm text-slate-600">denial-service consumes <code>claim.denied</code> Kafka events; parses CARC + RARC codes.</div></div>
          </li>
          <li className="rounded-lg border border-slate-200 bg-white p-4 flex gap-3">
            <SparklesIcon className="h-6 w-6 text-brand-600"/>
            <div><div className="font-medium">2. AI drafts appeal</div><div className="text-sm text-slate-600">denial-predictor engine matches CARC → template, fills patient/provider/clinical context, returns Markdown appeal.</div></div>
          </li>
          <li className="rounded-lg border border-slate-200 bg-white p-4 flex gap-3">
            <PencilSquareIcon className="h-6 w-6 text-brand-600"/>
            <div><div className="font-medium">3. Specialist review (REQUIRED)</div><div className="text-sm text-slate-600">Denials appeals specialist reviews, edits, attaches supporting docs. AI never auto-submits.</div></div>
          </li>
          <li className="rounded-lg border border-slate-200 bg-white p-4 flex gap-3">
            <PaperAirplaneIcon className="h-6 w-6 text-brand-600"/>
            <div><div className="font-medium">4. Submit to payer</div><div className="text-sm text-slate-600">Mailed, faxed, or submitted via payer portal. Track 30/60/90-day timely-filing window.</div></div>
          </li>
          <li className="rounded-lg border border-slate-200 bg-white p-4 flex gap-3">
            <CheckCircleIcon className="h-6 w-6 text-green-600"/>
            <div><div className="font-medium">5. Track outcome</div><div className="text-sm text-slate-600">If won → claim adjusted to paid. If lost → escalate to level 2 appeal, or write off per policy.</div></div>
          </li>
        </ol>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <h3 className="bg-slate-50 px-4 py-2 text-xs font-semibold uppercase text-slate-500">Common CARC codes (8 templates wired)</h3>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="py-2 px-3">Code</th><th>Description</th><th>Appeal strategy</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {CARC.map(c => <tr key={c.code} className="hover:bg-slate-50"><td className="py-2 px-3 font-mono text-xs">{c.code}</td><td className="text-slate-700">{c.desc}</td><td className="text-slate-600">{c.strategy}</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell></AuthGate>
  );
}
