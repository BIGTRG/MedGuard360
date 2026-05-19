'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DataTable, type Column } from '@/components/DataTable';
import { DetailLayout, DetailSection, FieldRow } from '@/components/DetailLayout';
import { api } from '@/lib/api-client';
import { cn, formatCurrencyCents, formatDateTime } from '@/lib/format';

interface ClaimDetail {
  claim: {
    id: string; claim_control_number: string; status: string;
    total_charge_cents: string; payer_id: string; state_code: string;
    submitted_at: string | null; fraud_score: number | null; fraud_recommendation: string | null;
    diagnosis_codes: string[]; edi_payload: string | null;
  };
  lines: Array<{
    id: string; line_number: number;
    service_code: string; charge_cents: string;
    service_date: string; place_of_service: string;
  }>;
}

function ClaimDetailInner(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<ClaimDetail>(`/v1/claims/${id}`)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const submitClaim = async (): Promise<void> => {
    if (!data) return;
    setSubmitting(true); setError(null);
    try {
      const r = await api.post<ClaimDetail>(`/v1/claims/${id}/submit`);
      setData(prev => prev ? { ...prev, claim: r.claim } : prev);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading claim…</div>;
  if (error)   return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>;
  if (!data)   return <div className="text-sm text-slate-500">Not found.</div>;

  const c = data.claim;
  const statusBadge = (s: string): string =>
    s === 'paid' ? 'badge-green' :
    s === 'denied' || s === 'fraud_review' ? 'badge-red' :
    s === 'submitted' ? 'badge-blue' : 'badge-gray';

  const columns: Column<ClaimDetail['lines'][number]>[] = [
    { header: '#',            accessor: l => l.line_number },
    { header: 'Service',      accessor: l => <span className="font-mono">{l.service_code}</span> },
    { header: 'Charge',       accessor: l => formatCurrencyCents(l.charge_cents) },
    { header: 'POS',          accessor: l => l.place_of_service },
    { header: 'Service date', accessor: l => l.service_date },
  ];

  return (
    <DetailLayout
      title={`Claim ${c.claim_control_number}`}
      subtitle={<span className="font-mono text-xs">{c.id}</span>}
      backHref="/provider/claims"
      badges={<>
        <span className={statusBadge(c.status)}>{c.status.replace('_', ' ')}</span>
        <span className="badge-gray">{c.state_code}</span>
        <span className="badge-gray">payer {c.payer_id}</span>
        {c.fraud_score != null && (
          <span className={cn(
            'inline-flex h-6 items-center rounded-md px-2 font-mono text-xs',
            c.fraud_score >= 80 ? 'bg-red-100 text-red-700' :
            c.fraud_score >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700',
          )}>fraud {c.fraud_score}</span>
        )}
      </>}
      actions={
        c.status === 'draft' && (
          <button onClick={submitClaim} disabled={submitting} className="btn-primary">
            <PaperAirplaneIcon className="h-4 w-4" /> {submitting ? 'Submitting…' : 'Submit to clearinghouse'}
          </button>
        )
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <DetailSection title="Summary">
          <dl>
            <FieldRow label="Total charge">{formatCurrencyCents(c.total_charge_cents)}</FieldRow>
            <FieldRow label="Diagnoses">{c.diagnosis_codes.join(', ') || '—'}</FieldRow>
            <FieldRow label="Submitted">{formatDateTime(c.submitted_at)}</FieldRow>
          </dl>
        </DetailSection>
        <DetailSection title="Fraud screening">
          <dl>
            <FieldRow label="Score">{c.fraud_score ?? '—'}</FieldRow>
            <FieldRow label="Recommendation">{c.fraud_recommendation ?? '—'}</FieldRow>
          </dl>
        </DetailSection>
      </div>

      <DetailSection title="Service lines">
        <DataTable rows={data.lines} columns={columns} rowKey={l => l.id} />
      </DetailSection>

      {c.edi_payload && (
        <DetailSection title="Generated 837P">
          <pre className="overflow-x-auto rounded-md bg-slate-50 p-3 font-mono text-xs">{c.edi_payload}</pre>
        </DetailSection>
      )}
    </DetailLayout>
  );
}

export default function ClaimDetailPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['individual_provider','facility_provider','billing_manager','platform_administrator']}>
      <AppShell><ClaimDetailInner /></AppShell>
    </AuthGate>
  );
}
