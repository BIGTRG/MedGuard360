'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, MinusCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api, ApiError } from '@/lib/api-client';
import { cn, formatDateTime } from '@/lib/format';

interface CaseDetail {
  id: string;
  claim_id: string;
  state_code: string;
  status: string;
  opened_at: string;
  score: number;
  recommendation: 'auto_pay' | 'route_to_review' | 'auto_block';
  explanation: string;
  flags?: Array<{ code: string; label: string; severity: number }>;
}

function FraudCaseDetailInner(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resolution, setResolution] = useState('');

  useEffect(() => {
    if (!params.id) return;
    api.get<{ cases: CaseDetail[] }>('/v1/fraud/cases')
      .then(r => setData(r.cases.find(c => c.id === params.id) ?? null))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const resolve = async (status: 'confirmed_fraud' | 'cleared' | 'closed'): Promise<void> => {
    if (!data) return;
    if (resolution.trim().length < 10) { setError('Please describe the resolution (at least 10 characters).'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/v1/fraud/cases/${data.id}/resolve`, { status, resolution });
      router.push('/fraud');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resolve');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading case…</div>;
  if (!data)   return <div className="text-sm text-slate-500">Case not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Fraud case</h2>
          <p className="font-mono text-xs text-slate-500">{data.id}</p>
        </div>
        <span className="badge-gray">{data.state_code}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card card-body lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">AI assessment</h3>
          <div className="flex items-center gap-4">
            <div className={cn(
              'flex h-20 w-20 flex-col items-center justify-center rounded-xl font-bold',
              data.score >= 80 ? 'bg-red-100 text-red-700' :
              data.score >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700',
            )}>
              <span className="text-3xl">{data.score}</span>
              <span className="text-[10px] uppercase tracking-wider">/ 100</span>
            </div>
            <div>
              <div className={cn(
                'mb-1 inline-flex items-center',
                data.recommendation === 'auto_block' ? 'badge-red'    :
                data.recommendation === 'route_to_review' ? 'badge-yellow' : 'badge-green',
              )}>
                {data.recommendation.replace('_', ' ')}
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-line">{data.explanation}</p>
            </div>
          </div>
        </div>

        <div className="card card-body">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Case info</h3>
          <dl className="space-y-2 text-sm">
            <Pair label="Claim">  <span className="font-mono text-xs">{data.claim_id}</span> </Pair>
            <Pair label="Status"> <span className="badge-gray">{data.status}</span></Pair>
            <Pair label="Opened"> <span>{formatDateTime(data.opened_at)}</span></Pair>
          </dl>
        </div>
      </div>

      <div className="card">
        <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">Resolution</div>
        <div className="card-body space-y-3">
          <textarea
            className="input min-h-[120px]"
            placeholder="Describe what you investigated and the final disposition…"
            value={resolution}
            onChange={e => setResolution(e.target.value)}
          />
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex flex-wrap gap-2">
            <button className="btn-danger" disabled={submitting} onClick={() => resolve('confirmed_fraud')}>
              <XCircleIcon className="h-4 w-4" /> Confirm fraud
            </button>
            <button className="btn-primary" disabled={submitting} onClick={() => resolve('cleared')}>
              <CheckCircleIcon className="h-4 w-4" /> Clear (false positive)
            </button>
            <button className="btn-ghost" disabled={submitting} onClick={() => resolve('closed')}>
              <MinusCircleIcon className="h-4 w-4" /> Close without finding
            </button>
          </div>
        </div>
      </div>

      <div className="card card-body bg-brand-50 text-sm text-brand-900">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="h-5 w-5 flex-shrink-0 text-brand-600" />
          <p>Your decision is logged and feeds quarterly retraining of the fraud-detection model.</p>
        </div>
      </div>
    </div>
  );
}

function Pair({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-center justify-between text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default function FraudCaseDetail(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['fraud_investigator', 'compliance_officer', 'platform_administrator']}>
      <AppShell>
        <FraudCaseDetailInner />
      </AppShell>
    </AuthGate>
  );
}
