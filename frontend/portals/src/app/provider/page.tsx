'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  UsersIcon, DocumentTextIcon, CurrencyDollarIcon, ClipboardDocumentCheckIcon,
  FingerPrintIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { Kpi } from '@/components/Kpi';
import { api } from '@/lib/api-client';
import { formatCurrencyCents, formatDateTime, formatNumber } from '@/lib/format';
import { getCurrentClaims } from '@/lib/auth';

interface PatientRow {
  id: string; first_name: string; last_name: string;
  date_of_birth: string; state_code: string;
}
interface EncounterRow { id: string; patient_id: string; encounter_type: string; status: string; started_at: string }
interface ClaimRow {
  id: string; claim_control_number: string; status: string;
  total_charge_cents: string; submitted_at: string | null; fraud_score: number | null;
}
interface PaRow { id: string; service_code: string; status: string; urgency: string; due_at: string }

function ProviderHome(): React.ReactElement {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [encounters, setEncounters] = useState<EncounterRow[]>([]);
  const [pa, setPa] = useState<PaRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const claims = getCurrentClaims();
    const stateCode = claims?.stateCode ?? '';
    Promise.all([
      api.get<{ patients: PatientRow[] }>(`/v1/patients?stateCode=${stateCode}&limit=10`).catch(() => ({ patients: [] })),
      api.get<{ claims: ClaimRow[] }>('/v1/claims?limit=10').catch(() => ({ claims: [] })),
    ]).then(([p, c]) => {
      setPatients(p.patients ?? []);
      setClaims(c.claims ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const claimsTotal = claims.reduce((s, c) => s + Number(c.total_charge_cents), 0);
  const claimsPending = claims.filter(c => c.status === 'submitted' || c.status === 'fraud_review').length;
  const paAwaiting = pa.filter(p => p.status === 'received' || p.status === 'evaluating').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Welcome back</h2>
          <p className="text-sm text-slate-500">Your patients, encounters, claims, and PA queue at a glance.</p>
        </div>
        <Link href="/provider/encounters/new" className="btn-primary">
          <DocumentTextIcon className="h-4 w-4" /> Start encounter
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Active patients"  value={formatNumber(patients.length)} />
        <Kpi label="Open encounters"  value={formatNumber(encounters.length)} />
        <Kpi label="Claims awaiting payment" value={formatNumber(claimsPending)} />
        <Kpi label="PA awaiting decision"    value={formatNumber(paAwaiting)} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Recent patients" emptyText="No patients yet." link="/provider/patients" icon={UsersIcon}>
          <ul className="divide-y divide-slate-100">
            {patients.slice(0, 6).map(p => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{p.last_name}, {p.first_name}</span>
                <span className="text-xs text-slate-500">{p.state_code} • DOB {p.date_of_birth}</span>
              </li>
            ))}
            {loading && <li className="px-5 py-3 text-sm text-slate-500">Loading…</li>}
          </ul>
        </Card>

        <Card title="Open encounters" emptyText="No active encounters." link="/provider/encounters" icon={DocumentTextIcon}>
          <ul className="divide-y divide-slate-100">
            {encounters.slice(0, 6).map(e => (
              <li key={e.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{e.encounter_type} • {e.status}</span>
                <span className="text-xs text-slate-500">{formatDateTime(e.started_at)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Claims" subtitle={`Total submitted: ${formatCurrencyCents(claimsTotal)}`} emptyText="No claims yet." link="/provider/claims" icon={CurrencyDollarIcon}>
          <ul className="divide-y divide-slate-100">
            {claims.slice(0, 6).map(c => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-mono text-xs">{c.claim_control_number}</span>
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  {c.fraud_score != null && <span className="badge-gray">fraud {c.fraud_score}</span>}
                  <span className={c.status === 'paid' ? 'badge-green' : c.status === 'denied' ? 'badge-red' : 'badge-yellow'}>
                    {c.status}
                  </span>
                  {formatCurrencyCents(c.total_charge_cents)}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="PA requests" emptyText="No PA requests." link="/provider/pa" icon={ClipboardDocumentCheckIcon}>
          <ul className="divide-y divide-slate-100">
            {pa.slice(0, 6).map(p => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{p.service_code} • {p.urgency}</span>
                <span className="text-xs text-slate-500">{p.status} • due {formatDateTime(p.due_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="card card-body bg-brand-50">
        <div className="flex items-start gap-3 text-sm">
          <FingerPrintIcon className="h-5 w-5 text-brand-600" />
          <p className="text-brand-900">
            <strong>Reminder:</strong> claim submission and full patient-record export both require biometric verification each session.
          </p>
        </div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, link, icon: Icon, emptyText, children }: {
  title: string; subtitle?: string; link?: string; emptyText: string;
  icon: React.ComponentType<{ className?: string }>; children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-500" />
          <div>
            <span className="text-sm font-semibold text-slate-700">{title}</span>
            {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
          </div>
        </div>
        {link && (
          <Link href={link} className="flex items-center gap-1 text-xs text-brand-600 hover:underline">
            View all <ArrowRightIcon className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

export default function ProviderPortal(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['individual_provider', 'facility_provider', 'platform_administrator']}>
      <AppShell>
        <ProviderHome />
      </AppShell>
    </AuthGate>
  );
}
