'use client';

import { useEffect, useState } from 'react';
import {
  HeartIcon, ShieldCheckIcon, ClipboardDocumentListIcon,
  CalendarDaysIcon, ChatBubbleLeftRightIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/format';

type TabId = 'overview' | 'coverage' | 'claims' | 'crisis' | 'appointments' | 'messages';

interface PatientProfile {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  medicaid_id: string | null;
  state_code: string;
}

interface Coverage {
  active: boolean;
  plan_name: string;
  payer_id: string;
  effective_from: string;
  effective_to: string | null;
}

interface CrisisPlan {
  warning_signs: string[];
  internal_coping_strategies: string[];
  emergency_contacts: { name: string; phone: string }[];
  safe_environment_steps: string[];
}

interface MemberClaim {
  id: string;
  service_date: string;
  service_label: string;
  provider_name: string;
  amount_cents: number;
  status: string;
}

interface MemberAppointment {
  id: string;
  when: string;
  provider: string;
  location: string;
}

interface MemberMessage {
  id: string;
  from: string;
  at: string;
  preview: string;
}

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusLabel(status: string): string {
  if (status === 'paid') return 'Paid';
  if (status === 'submitted') return 'Pending';
  if (status === 'denied') return 'Denied';
  return status.replace('_', ' ');
}

const TABS: { id: TabId; label: string; icon: typeof HeartIcon }[] = [
  { id: 'overview', label: 'Overview', icon: HeartIcon },
  { id: 'coverage', label: 'Coverage', icon: ShieldCheckIcon },
  { id: 'claims', label: 'Claims', icon: ClipboardDocumentListIcon },
  { id: 'crisis', label: 'Crisis Plan', icon: ExclamationTriangleIcon },
  { id: 'appointments', label: 'Appointments', icon: CalendarDaysIcon },
  { id: 'messages', label: 'Messages', icon: ChatBubbleLeftRightIcon },
];

function PatientInner(): React.ReactElement {
  const [tab, setTab] = useState<TabId>('overview');
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [coverages, setCoverages] = useState<Coverage[]>([]);
  const [crisis, setCrisis] = useState<CrisisPlan | null>(null);
  const [claims, setClaims] = useState<MemberClaim[]>([]);
  const [appointments, setAppointments] = useState<MemberAppointment[]>([]);
  const [messages, setMessages] = useState<MemberMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<PatientProfile>('/v1/patients/me'),
      api.get<{ coverages: Coverage[] }>('/v1/patients/me/coverages'),
      api.get<CrisisPlan>('/v1/patients/me/crisis-plan').catch(() => null),
      api.get<{ claims: MemberClaim[] }>('/v1/patients/me/claims').catch(() => ({ claims: [] })),
      api.get<{ appointments: MemberAppointment[] }>('/v1/patients/me/appointments').catch(() => ({ appointments: [] })),
      api.get<{ messages: MemberMessage[] }>('/v1/patients/me/messages').catch(() => ({ messages: [] })),
    ])
      .then(([p, c, crisisPlan, claimRes, apptRes, msgRes]) => {
        setProfile(p);
        setCoverages(c.coverages ?? []);
        setCrisis(crisisPlan);
        setClaims(claimRes.claims ?? []);
        setAppointments(apptRes.appointments ?? []);
        setMessages(msgRes.messages ?? []);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500">Loading your health record…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {profile ? `Welcome, ${profile.first_name}` : 'My Health'}
        </h2>
        <p className="text-sm text-slate-500">
          Same surface as the mobile app — offline-first cache, biometric login, crisis plan in 3 seconds.
        </p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-slate-200 pb-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm',
              tab === id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && profile && (
        <div className="card card-body grid gap-4 md:grid-cols-3">
          <Field label="Medicaid ID" value={profile.medicaid_id ?? 'Not on file'} />
          <Field label="Date of birth" value={profile.date_of_birth} />
          <Field label="State" value={profile.state_code} />
        </div>
      )}

      {tab === 'coverage' && (
        <ul className="space-y-2">
          {coverages.map((c, i) => (
            <li key={i} className="card card-body">
              <div className="font-semibold">{c.plan_name}</div>
              <div className="text-xs text-slate-500 mt-1">
                {c.payer_id} · effective {c.effective_from}
                {c.effective_to ? ` — ${c.effective_to}` : ' — present'}
              </div>
              <span className={cn('badge mt-2 inline-block', c.active ? 'badge-green' : 'badge-gray')}>
                {c.active ? 'Active' : 'Inactive'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {tab === 'claims' && (
        <table className="w-full text-sm card overflow-hidden">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Provider</th>
              <th className="px-4 py-2 text-left">Service</th>
              <th className="px-4 py-2 text-right">Amount</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {claims.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">No claims on file.</td></tr>
            )}
            {claims.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-2">{c.service_date}</td>
                <td className="px-4 py-2">{c.provider_name}</td>
                <td className="px-4 py-2">{c.service_label}</td>
                <td className="px-4 py-2 text-right">{formatUsd(c.amount_cents)}</td>
                <td className="px-4 py-2">
                  <span className={cn(
                    'badge',
                    c.status === 'paid' ? 'badge-green' : c.status === 'denied' ? 'badge-red' : 'badge-yellow',
                  )}>{statusLabel(c.status)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {tab === 'crisis' && (
        crisis ? (
          <div className="space-y-4">
            <div className="card card-body">
              <h3 className="text-sm font-semibold mb-2">Warning signs</h3>
              <ul className="list-disc pl-5 text-sm text-slate-700">
                {crisis.warning_signs.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
            <div className="card card-body">
              <h3 className="text-sm font-semibold mb-2">What helps</h3>
              <ul className="list-disc pl-5 text-sm text-slate-700">
                {crisis.internal_coping_strategies.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
            <div className="card card-body">
              <h3 className="text-sm font-semibold mb-2">Emergency contacts</h3>
              <ul className="text-sm text-slate-700 space-y-1">
                {crisis.emergency_contacts.map((c) => (
                  <li key={c.phone}><strong>{c.name}</strong> — {c.phone}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No crisis plan on file.</p>
        )
      )}

      {tab === 'appointments' && (
        <ul className="space-y-2">
          {appointments.map((a) => (
            <li key={a.id} className="card card-body">
              <div className="font-medium">{a.when}</div>
              <div className="text-sm text-slate-600">{a.provider} · {a.location}</div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'messages' && (
        <ul className="space-y-2">
          {messages.map((m) => (
            <li key={m.id} className="card card-body">
              <div className="flex justify-between text-xs text-slate-500">
                <span className="font-medium text-slate-800">{m.from}</span>
                <span>{m.at}</span>
              </div>
              <p className="text-sm text-slate-700 mt-1">{m.preview}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="card card-body bg-brand-50 text-sm text-brand-900">
        Your privacy is protected by row-level security and append-only audit logs.
        Every access to your record is logged and reviewable.
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
}

export default function PatientPortal(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['patient']}>
      <AppShell><PatientInner /></AppShell>
    </AuthGate>
  );
}
