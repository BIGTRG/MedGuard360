'use client';

import { useEffect, useState } from 'react';
import { ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';

interface HetsRow {
  id: string; npi: string; provider_id: string;
  hets_submitter_uid: string;
  attestation_status: 'not_started' | 'pending' | 'attested' | 'revoked' | 'rejected';
  attestation_submitted_at: string | null;
  attestation_confirmed_at: string | null;
  last_aaa41_at: string | null;
  notes: string | null;
}

function badge(s: HetsRow['attestation_status']): React.ReactElement {
  if (s === 'attested')      return <span className="badge-green">attested</span>;
  if (s === 'pending')       return <span className="badge-yellow">pending</span>;
  if (s === 'revoked')       return <span className="badge-red">revoked</span>;
  if (s === 'rejected')      return <span className="badge-red">rejected</span>;
  return <span className="badge-gray">not started</span>;
}

function Inner(): React.ReactElement {
  const [rows, setRows] = useState<HetsRow[]>([]);
  const [submitterUid, setSubmitterUid] = useState<string>('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ submitterUid: string; enrollments: HetsRow[] }>('/v1/eligibility/hets-status')
      .then(r => { setRows(r.enrollments); setSubmitterUid(r.submitterUid); })
      .catch(e => setErr(e.message));
  }, []);

  const counts = {
    attested:    rows.filter(r => r.attestation_status === 'attested').length,
    pending:     rows.filter(r => r.attestation_status === 'pending').length,
    not_started: rows.filter(r => r.attestation_status === 'not_started').length,
    blocked:     rows.filter(r => r.attestation_status !== 'attested').length,
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <ShieldCheckIcon className="h-5 w-5" /> HETS Compliance — Medicare 270/271 Submitter
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          CMS HETS Trading Partner Management System (effective 2026-05-11). Every Medicare
          270/271 transaction MedGuard360 sends must carry our HETS Submitter UID. Providers
          whose NPI is not attested under our UID will receive AAA error 41 — Medicare
          eligibility checks for those NPIs are blocked.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          MedGuard360 HETS UID: <code className="px-1 bg-slate-100 rounded">{submitterUid || '…'}</code>
        </p>
      </div>

      {submitterUid === 'MEDGUARD360_PENDING_UID' && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <div>
            <strong>HETS UID placeholder in use.</strong> MedGuard360 must request its production
            HETS Submitter UID from CMS HETS Trading Partner Management. Until assigned, all
            Medicare 270/271 transactions will return AAA-41 from CMS. Submit the HETS Trading
            Partner request via the {' '}
            <a className="underline" href="https://www.cms.gov/medicare/coordination-benefits-recovery/customer-information-management/transaction-system">CMS HETS portal</a>.
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        <Kpi label="Attested"      n={counts.attested}    tone="green" />
        <Kpi label="Pending"       n={counts.pending}     tone="amber" />
        <Kpi label="Not started"   n={counts.not_started} tone="slate" />
        <Kpi label="Medicare-blocked" n={counts.blocked}  tone="red" />
      </div>

      {err && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-900">{err}</div>}

      <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-500">
            <tr>
              <th className="py-2 px-2">NPI</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Confirmed</th>
              <th>Last AAA-41</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-slate-500">No enrollments yet. Seed providers via migration 0025.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="py-2 px-2 font-mono">{r.npi}</td>
                <td>{badge(r.attestation_status)}</td>
                <td className="text-slate-600">{r.attestation_submitted_at?.slice(0, 10) ?? '—'}</td>
                <td className="text-slate-600">{r.attestation_confirmed_at?.slice(0, 10) ?? '—'}</td>
                <td className="text-slate-600">{r.last_aaa41_at ? new Date(r.last_aaa41_at).toLocaleString() : '—'}</td>
                <td className="text-slate-500">{r.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
        <strong>Attestation workflow:</strong> credentialing specialists initiate attestation
        via <code>POST /eligibility/hets-status/upsert</code>. CMS confirms via the HETS
        TPMS portal; status is updated to <code>attested</code> when confirmed. Routine
        re-attestation is required when the HETS Submitter UID is rotated.
      </div>
    </div>
  );
}

function Kpi({ label, n, tone }: { label: string; n: number; tone: 'green' | 'amber' | 'slate' | 'red' }): React.ReactElement {
  const colors = {
    green: 'border-green-200 bg-green-50 text-green-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    slate: 'border-slate-200 bg-slate-50 text-slate-900',
    red:   'border-red-200   bg-red-50   text-red-900',
  }[tone];
  return (
    <div className={`rounded-lg border ${colors} p-3`}>
      <div className="text-xs uppercase opacity-70">{label}</div>
      <div className="text-2xl font-semibold mt-1">{n}</div>
    </div>
  );
}

export default function HetsPage(): React.ReactElement {
  return <AuthGate><AppShell><Inner /></AppShell></AuthGate>;
}
