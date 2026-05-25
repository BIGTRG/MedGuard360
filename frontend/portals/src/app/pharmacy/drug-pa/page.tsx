'use client';
import { useEffect, useState } from 'react';
import { BeakerIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';

interface DrugPa {
  id: string; patient_id: string; payer_id: string; state_code: string;
  service_code: string;          // NDC
  service_description: string;   // drug name
  diagnosis_codes: string[];
  urgency: 'standard' | 'expedited' | 'drug';
  status: 'received'|'evaluating'|'approved'|'denied'|'needs_more_info'|'expired'|'withdrawn';
  days_supply: number | null;
  quantity: number | null;
  formulary_tier: string | null;
  step_therapy_required: boolean;
  payer_denial_reason: string | null;
  due_at: string;
  created_at: string;
}

function statusBadge(s: DrugPa['status']): React.ReactElement {
  if (s === 'approved')        return <span className="badge-green"><CheckCircleIcon className="h-3 w-3 mr-1"/>approved</span>;
  if (s === 'denied')          return <span className="badge-red"><XCircleIcon className="h-3 w-3 mr-1"/>denied</span>;
  if (s === 'needs_more_info') return <span className="badge-yellow">needs more info</span>;
  if (s === 'expired')         return <span className="badge-gray">expired</span>;
  return <span className="badge-yellow"><ClockIcon className="h-3 w-3 mr-1"/>{s}</span>;
}

function Inner(): React.ReactElement {
  const [rows, setRows] = useState<DrugPa[]>([]);
  const [err, setErr]   = useState<string | null>(null);

  useEffect(() => {
    api.get<{ paRequests: DrugPa[] }>('/v1/prior-auth/pa-requests?serviceCodeType=NDC&limit=200')
      .then(d => setRows(d.paRequests ?? []))
      .catch(e => setErr(e.message));
  }, []);

  const buckets = {
    pending:  rows.filter(r => ['received','evaluating','needs_more_info'].includes(r.status)),
    approved: rows.filter(r => r.status === 'approved'),
    denied:   rows.filter(r => r.status === 'denied'),
  };

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><BeakerIcon className="h-5 w-5"/> Drug Prior Authorization Queue</h2>
      <p className="text-sm text-slate-600">
        CMS-0062-P (effective 2027-10-01) — extends electronic PA to pharmacy-benefit drugs.
        SLA: <strong>24 hours</strong>. Step therapy must be documented before submission.
        Payer denial reasons captured per the rule's transparency requirement.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Pending review" n={buckets.pending.length}  tone="amber"/>
        <Kpi label="Approved"       n={buckets.approved.length} tone="green"/>
        <Kpi label="Denied"         n={buckets.denied.length}   tone="red"/>
      </div>

      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">{err}</div>}

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-500">
            <tr>
              <th className="py-2 px-2">NDC / Drug</th>
              <th>Payer</th>
              <th>Patient</th>
              <th>Tier</th>
              <th>Days</th>
              <th>Step</th>
              <th>Status</th>
              <th>SLA due</th>
              <th>Denial reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? <tr><td className="p-4 text-slate-500" colSpan={9}>No drug PAs yet. Create one via <code>POST /prior-auth/drug-pa</code>.</td></tr> :
              rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-2 px-2">
                    <div className="font-mono text-[10px] text-slate-500">{r.service_code}</div>
                    <div className="font-medium">{r.service_description}</div>
                  </td>
                  <td>{r.payer_id}</td>
                  <td className="font-mono">{r.patient_id.slice(0,8)}…</td>
                  <td>{r.formulary_tier ?? '—'}</td>
                  <td>{r.days_supply ?? '—'}</td>
                  <td>{r.step_therapy_required ? <span className="badge-yellow">required</span> : '—'}</td>
                  <td>{statusBadge(r.status)}</td>
                  <td className="text-slate-600">{new Date(r.due_at).toLocaleString()}</td>
                  <td className="text-red-700">{r.payer_denial_reason ?? '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>AI governance:</strong> Drug PA decisions are AI-evaluated against payer policy
        via the pa-nlp-matcher BERT engine. <strong>Final decision requires a human pharmacist
        or PA specialist</strong>. No drug PA is auto-denied.
      </div>
    </div>
  );
}
function Kpi({ label, n, tone }: { label: string; n: number; tone: 'green' | 'amber' | 'red' }) {
  const c = { green: 'border-green-200 bg-green-50', amber: 'border-amber-200 bg-amber-50', red: 'border-red-200 bg-red-50' }[tone];
  return <div className={`rounded-lg border ${c} p-3`}><div className="text-xs uppercase opacity-70">{label}</div><div className="text-2xl font-semibold mt-1">{n}</div></div>;
}

export default function PharmacyDrugPaPage(): React.ReactElement {
  return <AuthGate><AppShell><Inner /></AppShell></AuthGate>;
}
