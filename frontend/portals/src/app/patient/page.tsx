'use client';

import { useEffect, useState } from 'react';
import {
  HeartIcon, ShieldCheckIcon, ClipboardDocumentListIcon, PhoneIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';

interface PatientProfile {
  id: string; first_name: string; last_name: string;
  date_of_birth: string; medicaid_id: string | null; state_code: string;
}

function PatientInner(): React.ReactElement {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const claims = getCurrentClaims();
    if (!claims) return;
    api.get<PatientProfile>(`/v1/patients/${claims.sub}`)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500">Loading your health record…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {profile ? `Welcome, ${profile.first_name}` : 'Welcome'}
        </h2>
        <p className="text-sm text-slate-500">Your coverage, claims, and care plan in one place.</p>
      </div>

      {profile && (
        <div className="card card-body grid gap-4 md:grid-cols-3">
          <Field label="Medicaid ID"   value={profile.medicaid_id ?? 'Not on file'} />
          <Field label="Date of birth" value={profile.date_of_birth} />
          <Field label="State"         value={profile.state_code} />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <ActionCard
          icon={ShieldCheckIcon} title="Check my coverage"
          subtitle="Real-time Medicaid + Medicare eligibility"
          href="/patient/eligibility"
        />
        <ActionCard
          icon={ClipboardDocumentListIcon} title="My care plan"
          subtitle="Crisis plan, medications, prior authorizations"
          href="/patient/care-plan"
        />
        <ActionCard
          icon={HeartIcon} title="My claims"
          subtitle="See what your providers have billed"
          href="/patient/claims"
        />
        <ActionCard
          icon={PhoneIcon} title="Call the state hub"
          subtitle="24/7 help — eligibility, claims, complaints"
          href="/patient/hub"
        />
      </div>

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

function ActionCard({ icon: Icon, title, subtitle, href }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; subtitle: string; href: string;
}): React.ReactElement {
  return (
    <a href={href} className="card card-body flex items-center gap-3 hover:border-brand-300 hover:shadow-md">
      <div className="rounded-lg bg-brand-50 p-2"><Icon className="h-5 w-5 text-brand-600" /></div>
      <div>
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="text-xs text-slate-500">{subtitle}</div>
      </div>
    </a>
  );
}

export default function PatientPortal(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['patient']}>
      <AppShell><PatientInner /></AppShell>
    </AuthGate>
  );
}
