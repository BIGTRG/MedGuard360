'use client';
import { useEffect, useState } from 'react';
import { ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';

interface Summary {
  patient_id: string; state_code: string; required: boolean; rule_reason?: string;
  current_record: { reporting_period: string; hours_documented: number; engagement_type: string; status: string } | null;
  next_renewal_due_at: string | null;
  days_until_renewal: number | null;
  compliance_status: 'compliant' | 'pending' | 'overdue' | 'exempt' | 'not_required';
  notification_window: '60_day' | '30_day' | '7_day' | 'overdue' | 'none';
  history: { id: string; reporting_period: string; hours_documented: number; engagement_type: string; status: string }[];
}

function Inner(): React.ReactElement {
  const [s, setS] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api.get<{ patient_id: string }>('/v1/patients/me').then(p =>
      api.get<Summary>(`/v1/eligibility/community-engagement/${p.patient_id}`).then(setS).catch(e => setErr(e.message))
    ).catch(e => setErr(e.message));
  }, []);
  if (err) return <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-900">{err}</div>;
  if (!s)  return <div className="text-sm text-slate-500">Loading…</div>;

  if (!s.required) {
    return <div className="rounded border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      Community engagement reporting is not required in your state ({s.state_code}). {s.rule_reason ?? ''}
    </div>;
  }

  const banner = {
    compliant: { tone: 'green',   text: '✓ You\'re up to date. Next renewal: ' + (s.next_renewal_due_at?.slice(0,10) ?? '—') },
    pending:   { tone: 'amber',   text: 'Your submission is under review.' },
    overdue:   { tone: 'red',     text: 'Action required — your renewal is past due.' },
    exempt:    { tone: 'green',   text: 'You are currently exempt.' },
    not_required: { tone: 'slate', text: 'Not required in your state.' },
  }[s.compliance_status];

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><ClockIcon className="h-5 w-5"/> My Community Engagement</h2>
      <p className="text-sm text-slate-600">
        Per H.R. 1 (Working Families Tax Credit Act), expansion-state Medicaid adults age 19-64
        must verify 80+ hours of work, school, training, volunteering, caregiving, or qualifying
        exemption each month. Renewal every 6 months.
      </p>

      <div className={`rounded-lg border p-4 ${
        banner.tone === 'green' ? 'border-green-200 bg-green-50 text-green-900' :
        banner.tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-900' :
        banner.tone === 'red'   ? 'border-red-200 bg-red-50 text-red-900' :
                                  'border-slate-200 bg-slate-50 text-slate-700'
      }`}>
        <div className="flex items-center gap-2">
          {s.compliance_status === 'compliant' || s.compliance_status === 'exempt'
            ? <CheckCircleIcon className="h-5 w-5"/>
            : <ExclamationTriangleIcon className="h-5 w-5"/>}
          <strong>{banner.text}</strong>
        </div>
        {s.days_until_renewal !== null && s.days_until_renewal > 0 && (
          <div className="text-xs mt-2">{s.days_until_renewal} days until renewal.</div>
        )}
      </div>

      {s.current_record && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold mb-2">Current period: {s.current_record.reporting_period}</h3>
          <dl className="grid grid-cols-3 text-xs gap-y-2">
            <div><dt className="text-slate-500">Hours documented</dt><dd className="font-medium">{s.current_record.hours_documented}</dd></div>
            <div><dt className="text-slate-500">Type</dt><dd className="font-medium">{s.current_record.engagement_type.replace(/_/g,' ')}</dd></div>
            <div><dt className="text-slate-500">Status</dt><dd className="font-medium">{s.current_record.status}</dd></div>
          </dl>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold mb-2">History</h3>
        {s.history.length === 0 ? (
          <p className="text-xs text-slate-500">No prior records.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase text-slate-500">
              <tr><th className="text-left py-1">Period</th><th className="text-right">Hours</th><th className="text-left">Type</th><th className="text-left">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {s.history.map(h => (
                <tr key={h.id}>
                  <td className="py-1.5 font-mono">{h.reporting_period}</td>
                  <td className="text-right">{h.hours_documented}</td>
                  <td className="text-slate-700">{h.engagement_type.replace(/_/g,' ')}</td>
                  <td><span className={
                    h.status === 'verified' ? 'badge-green' :
                    h.status === 'rejected' ? 'badge-red' :
                    h.status === 'expired'  ? 'badge-gray' : 'badge-yellow'
                  }>{h.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <button className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        Submit this month's hours
      </button>
    </div>
  );
}

export default function EngagementPage(): React.ReactElement {
  return <AuthGate><AppShell><Inner /></AppShell></AuthGate>;
}
