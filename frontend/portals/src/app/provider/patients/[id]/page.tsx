'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DocumentTextIcon, PencilSquareIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DetailLayout, DetailSection, FieldRow } from '@/components/DetailLayout';
import { api } from '@/lib/api-client';
import { formatDate, formatDateTime } from '@/lib/format';
import { getCurrentClaims } from '@/lib/auth';

interface Patient {
  id: string; first_name: string; last_name: string;
  date_of_birth: string; sex_at_birth: string | null;
  email: string | null; phone: string | null;
  address_line1: string | null; city: string | null;
  state_code: string; postal_code: string | null;
  medicaid_id: string | null; medicare_beneficiary_id: string | null;
  primary_care_provider_id: string | null;
  crisis_plan_id: string | null;
  status: string;
  created_at: string;
}

function PatientDetailInner(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const claims = getCurrentClaims();

  useEffect(() => {
    if (!id) return;
    api.get<Patient>(`/v1/patients/${id}`)
      .then(setP)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const exportRecord = async (): Promise<void> => {
    if (!claims?.biometricVerified) {
      setError('Biometric verification required for full-record export. Visit /biometric.');
      return;
    }
    setExporting(true);
    try {
      const blob = await fetch(`/api/v1/patients/${id}/export`, {
        headers: { authorization: `Bearer ${typeof window !== 'undefined' ? sessionStorage.getItem('mg_access') : ''}` },
      }).then(r => r.blob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `patient-${id}.json`; a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading patient…</div>;
  if (error)   return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  if (!p)      return <div className="text-sm text-slate-500">Not found.</div>;

  return (
    <DetailLayout
      title={`${p.last_name}, ${p.first_name}`}
      subtitle={<span className="font-mono text-xs">{p.id}</span>}
      backHref="/provider/patients"
      badges={<>
        <span className="badge-gray">{p.state_code}</span>
        <span className={p.status === 'active' ? 'badge-green' : 'badge-yellow'}>{p.status}</span>
        {p.medicaid_id && <span className="badge-blue">Medicaid {p.medicaid_id}</span>}
      </>}
      actions={<>
        <Link href={`/provider/patients/${p.id}/edit`} className="btn-ghost">
          <PencilSquareIcon className="h-4 w-4" /> Edit
        </Link>
        <button onClick={exportRecord} disabled={exporting} className="btn-primary">
          <ArrowDownTrayIcon className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export record'}
        </button>
      </>}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <DetailSection title="Demographics">
          <dl>
            <FieldRow label="DOB">{formatDate(p.date_of_birth)}</FieldRow>
            <FieldRow label="Sex at birth">{p.sex_at_birth ?? '—'}</FieldRow>
            <FieldRow label="Email">{p.email ?? '—'}</FieldRow>
            <FieldRow label="Phone">{p.phone ?? '—'}</FieldRow>
          </dl>
        </DetailSection>

        <DetailSection title="Address">
          <dl>
            <FieldRow label="Street">{p.address_line1 ?? '—'}</FieldRow>
            <FieldRow label="City">{p.city ?? '—'}</FieldRow>
            <FieldRow label="State">{p.state_code}</FieldRow>
            <FieldRow label="ZIP">{p.postal_code ?? '—'}</FieldRow>
          </dl>
        </DetailSection>

        <DetailSection title="Coverage">
          <dl>
            <FieldRow label="Medicaid ID">  {p.medicaid_id ?? '—'}</FieldRow>
            <FieldRow label="Medicare MBI">  {p.medicare_beneficiary_id ?? '—'}</FieldRow>
          </dl>
        </DetailSection>

        <DetailSection title="Care team">
          <dl>
            <FieldRow label="Primary care provider">
              {p.primary_care_provider_id ?? '—'}
            </FieldRow>
            <FieldRow label="Crisis plan">
              {p.crisis_plan_id
                ? <Link href={`/responder/patient/${p.id}`} className="text-brand-700 hover:underline">View plan</Link>
                : 'None on file'}
            </FieldRow>
            <FieldRow label="Record created">{formatDateTime(p.created_at)}</FieldRow>
          </dl>
        </DetailSection>
      </div>

      <DetailSection title="Related">
        <div className="grid gap-3 md:grid-cols-3">
          <Link href={`/provider/encounters?patientId=${p.id}`}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
            <DocumentTextIcon className="mb-1 h-4 w-4 text-slate-500" />
            Encounters →
          </Link>
          <Link href={`/provider/claims?patientId=${p.id}`}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
            Claims →
          </Link>
          <Link href={`/provider/pa?patientId=${p.id}`}
                className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
            PA Requests →
          </Link>
        </div>
      </DetailSection>
    </DetailLayout>
  );
}

export default function PatientDetailPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['individual_provider','facility_provider','prior_auth_specialist','platform_administrator']}>
      <AppShell><PatientDetailInner /></AppShell>
    </AuthGate>
  );
}
