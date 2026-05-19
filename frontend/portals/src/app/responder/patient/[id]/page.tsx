'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FingerPrintIcon, PhoneIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DetailLayout, DetailSection } from '@/components/DetailLayout';
import { api } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';
import { formatDate } from '@/lib/format';

interface CrisisPlan {
  id: string; patient_id: string; effective_from: string;
  warning_signs: string[];
  internal_coping_strategies: string[];
  social_supports: Array<{ name: string; phone?: string; relationship?: string }>;
  professional_supports: Array<{ name: string; phone?: string; role?: string }>;
  emergency_contacts: Array<{ name: string; phone?: string; relationship?: string }>;
  safe_environment_steps: string[];
  reasons_for_living: string | null;
}

function ResponderPatientInner(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const [plan, setPlan] = useState<CrisisPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const claims = getCurrentClaims();

  useEffect(() => {
    if (!id) return;
    api.get<CrisisPlan>(`/v1/crisis/responder/patient/${id}`)
      .then(setPlan)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (!claims?.biometricVerified) {
    return (
      <div className="mx-auto max-w-md">
        <div className="card card-body border-l-4 border-amber-500 bg-amber-50">
          <FingerPrintIcon className="h-8 w-8 text-amber-700" />
          <h2 className="mt-2 text-lg font-semibold">Biometric verification required</h2>
          <p className="mt-1 text-sm text-amber-900">
            Crisis plans are biometric-gated. Scan your finger / face now to unlock the patient's plan.
          </p>
          <a href={`/biometric?returnTo=/responder/patient/${id}`} className="btn-primary mt-3 inline-flex">
            <FingerPrintIcon className="h-4 w-4" /> Verify
          </a>
        </div>
      </div>
    );
  }

  if (loading)  return <div className="text-sm text-slate-500">Loading crisis plan…</div>;
  if (error)    return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  if (!plan)    return <div className="text-sm text-slate-500">No active plan.</div>;

  return (
    <DetailLayout
      title="Crisis Plan"
      subtitle={`Active since ${formatDate(plan.effective_from)}`}
      backHref="/responder"
      badges={<span className="badge-red"><ShieldExclamationIcon className="mr-1 h-3 w-3" /> RESPONDER ACCESS</span>}
    >
      <Section title="Warning signs" items={plan.warning_signs} />
      <Section title="Internal coping strategies" items={plan.internal_coping_strategies} />

      <DetailSection title="Social supports">
        <Contacts list={plan.social_supports} />
      </DetailSection>

      <DetailSection title="Professional supports">
        <Contacts list={plan.professional_supports} />
      </DetailSection>

      <DetailSection title="Emergency contacts (call now if needed)">
        <Contacts list={plan.emergency_contacts} highlight />
      </DetailSection>

      <Section title="Steps to make the environment safer" items={plan.safe_environment_steps} />

      {plan.reasons_for_living && (
        <DetailSection title="Reasons for living (patient's own words)">
          <p className="whitespace-pre-line text-sm italic text-slate-700">{plan.reasons_for_living}</p>
        </DetailSection>
      )}

      <p className="text-xs text-slate-500">
        Every access to this plan is audit-logged with timestamp + your identity.
      </p>
    </DetailLayout>
  );
}

function Section({ title, items }: { title: string; items: string[] }): React.ReactElement {
  return (
    <DetailSection title={title}>
      {items.length === 0
        ? <p className="text-sm text-slate-500">None recorded.</p>
        : <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
      }
    </DetailSection>
  );
}

function Contacts({ list, highlight }: { list: Array<{ name: string; phone?: string; relationship?: string; role?: string }>; highlight?: boolean }): React.ReactElement {
  if (list.length === 0) return <p className="text-sm text-slate-500">None on file.</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {list.map((c, i) => (
        <li key={i} className={highlight ? 'flex items-center justify-between py-2 bg-red-50/40 px-2 -mx-2 rounded-md' : 'flex items-center justify-between py-2'}>
          <div>
            <div className="text-sm font-semibold">{c.name}</div>
            <div className="text-xs text-slate-500">{c.relationship ?? c.role ?? '—'}</div>
          </div>
          {c.phone && (
            <a href={`tel:${c.phone}`} className="btn-primary inline-flex">
              <PhoneIcon className="h-4 w-4" /> {c.phone}
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function ResponderPatientPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['emergency_responder', 'platform_administrator']}>
      <AppShell><ResponderPatientInner /></AppShell>
    </AuthGate>
  );
}
