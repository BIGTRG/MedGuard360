'use client';
import { useEffect, useState } from 'react';
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';

interface Overdue {
  id: string; patient_id: string; state_code: string;
  reporting_period: string; hours_documented: number;
  engagement_type: string; status: string; next_renewal_due_at: string;
}

function Inner(): React.ReactElement {
  const [rows, setRows] = useState<Overdue[]>([]);
  const [err, setErr]   = useState<string | null>(null);
  useEffect(() => {
    api.get<{ count: number; rows: Overdue[] }>('/v1/eligibility/community-engagement/overdue/list')
      .then(d => setRows(d.rows)).catch(e => setErr(e.message));
  }, []);
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <ClockIcon className="h-5 w-5"/> Community Engagement — State Compliance
      </h2>
      <p className="text-sm text-slate-600">
        WFTC H.R. 1 work-requirement compliance dashboard. Population: expansion-state
        Medicaid adults age 19-64. Renewal frequency: 6 months. Effective 2027-01-01.
      </p>
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Overdue renewals"   n={rows.length}  tone="red"/>
        <Kpi label="60-day window"      n={0}            tone="amber"/>
        <Kpi label="Compliant (state)"  n={0}            tone="green"/>
      </div>
      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">{err}</div>}
      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-500">
            <tr><th className="py-2 px-2">Patient</th><th>State</th><th>Period</th><th>Hours</th><th>Type</th><th>Status</th><th>Renewal due</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? <tr><td className="p-4 text-slate-500" colSpan={7}>No overdue records.</td></tr> :
              rows.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-2 px-2 font-mono">{r.patient_id.slice(0,8)}…</td>
                  <td>{r.state_code}</td>
                  <td>{r.reporting_period}</td>
                  <td>{r.hours_documented}</td>
                  <td>{r.engagement_type.replace(/_/g,' ')}</td>
                  <td>{r.status}</td>
                  <td className="text-red-700"><ExclamationTriangleIcon className="inline h-3 w-3 mr-1"/>{r.next_renewal_due_at.slice(0,10)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function Kpi({ label, n, tone }: { label: string; n: number; tone: 'green' | 'amber' | 'red' }) {
  const c = { green: 'border-green-200 bg-green-50', amber: 'border-amber-200 bg-amber-50', red: 'border-red-200 bg-red-50' }[tone];
  return <div className={`rounded-lg border ${c} p-3`}><div className="text-xs uppercase opacity-70">{label}</div><div className="text-2xl font-semibold mt-1">{n}</div></div>;
}

export default function StateEngagementPage(): React.ReactElement {
  return <AuthGate><AppShell><Inner /></AppShell></AuthGate>;
}
