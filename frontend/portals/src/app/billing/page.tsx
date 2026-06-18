'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CurrencyDollarIcon, DocumentTextIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';
import { formatCurrencyCents } from '@/lib/format';

interface ClaimRow {
  id: string;
  claim_control_number: string;
  status: string;
  total_charge_cents: number;
  patient_id: string;
}

function BillingInner(): React.ReactElement {
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ claims: ClaimRow[] }>('/v1/claims?limit=100&stateCode=NC')
      .then(r => setClaims(r.claims ?? []))
      .catch(e => setErr(e.message));
  }, []);

  const byStatus = (s: string): number => claims.filter(c => c.status === s).length;
  const openCents = claims
    .filter(c => ['draft', 'validated', 'submitted', 'fraud_review'].includes(c.status))
    .reduce((sum, c) => sum + Number(c.total_charge_cents), 0);

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <CurrencyDollarIcon className="h-5 w-5" /> Billing Manager - Revenue Cycle
      </h2>
      {err && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Open A/R (NC)" value={formatCurrencyCents(openCents)} />
        <Kpi label="Draft / validated" value={String(byStatus('draft') + byStatus('validated'))} />
        <Kpi label="In payer queue" value={String(byStatus('submitted'))} />
        <Kpi label="Fraud hold" value={String(byStatus('fraud_review'))} tone="warn" />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold">Worklists (live from claims-service)</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" />
              Draft claims (missing info)
            </span>
            <span className="badge-yellow">{byStatus('draft')}</span>
          </li>
          <li className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="flex items-center gap-2">
              <ArrowPathIcon className="h-4 w-4 text-blue-600" />
              Validated, ready to submit
            </span>
            <span className="badge-gray">{byStatus('validated')}</span>
          </li>
          <li className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="flex items-center gap-2">
              <DocumentTextIcon className="h-4 w-4 text-slate-600" />
              Submitted / awaiting 835
            </span>
            <span className="badge-gray">{byStatus('submitted')}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CurrencyDollarIcon className="h-4 w-4 text-green-600" />
              Paid (30d demo set)
            </span>
            <span className="badge-green">{byStatus('paid')}</span>
          </li>
        </ul>
      </div>
      <div className="flex gap-3 text-sm">
        <Link href="/provider/claims" className="text-brand-700 hover:underline">Open claims queue</Link>
        <Link href="/denials" className="text-brand-700 hover:underline">Denials worklist</Link>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'warn' }): React.ReactElement {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`text-2xl font-semibold ${tone === 'warn' ? 'text-amber-700' : ''}`}>{value}</dd>
    </div>
  );
}

export default function BillingManagerPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['billing_manager', 'platform_administrator']}>
      <AppShell><BillingInner /></AppShell>
    </AuthGate>
  );
}
