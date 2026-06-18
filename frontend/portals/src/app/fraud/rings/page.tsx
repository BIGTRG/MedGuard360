'use client';

import { useState } from 'react';
import { ArrowsRightLeftIcon, PlayIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { Kpi } from '@/components/Kpi';
import { api } from '@/lib/api-client';
import { cn, formatNumber } from '@/lib/format';

interface Ring {
  members: string[];
  size: number;
  suspicion_score: number;
  shared_attributes: string[];
  explanation: string;
}
interface DetectResp { rings: Ring[]; total_nodes: number; total_edges: number; engine_version: string }

function RingsInner(): React.ReactElement {
  const [result, setResult] = useState<DetectResp | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = async (): Promise<void> => {
    setRunning(true); setError(null);
    try {
      const data = await api.post<DetectResp>('/v1/fraud/rings/scan');
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <ArrowsRightLeftIcon className="h-5 w-5" /> Fraud rings
        </h2>
        <button onClick={scan} disabled={running} className="btn-primary">
          <PlayIcon className="h-4 w-4" /> {running ? 'Scanning…' : 'Run ring detection'}
        </button>
      </div>

      <div className="card card-body bg-brand-50 text-sm text-brand-900">
        Fraud-ring-gnn projects (provider/patient/facility) × (address/phone/bank/EIN/NPI) into an
        entity-entity strong-tie graph, finds connected components ≥ 3, and scores each cluster
        on density + shared-attribute diversity.
      </div>

      {error && <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>}

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi label="Rings found"  value={formatNumber(result.rings.length)} />
            <Kpi label="Nodes scanned" value={formatNumber(result.total_nodes)} />
            <Kpi label="Edges scanned" value={formatNumber(result.total_edges)} />
          </div>
          <div className="space-y-3">
            {result.rings.map((r, i) => (
              <div key={i} className="card card-body">
                <div className="mb-2 flex items-center gap-3">
                  <span className={cn(
                    'inline-flex h-9 w-12 items-center justify-center rounded-md font-mono text-sm font-semibold',
                    r.suspicion_score >= 0.7 ? 'bg-red-100 text-red-700' :
                    r.suspicion_score >= 0.4 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700',
                  )}>{Math.round(r.suspicion_score * 100)}</span>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{r.size} members</div>
                    <div className="text-xs text-slate-500">
                      Shared: {r.shared_attributes.length ? r.shared_attributes.join(', ') : 'none'}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-700">{r.explanation}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.members.slice(0, 12).map(m => (
                    <span key={m} className="badge-gray font-mono text-[10px]">{m.slice(0, 8)}…</span>
                  ))}
                  {r.members.length > 12 && (
                    <span className="text-xs text-slate-500">+ {r.members.length - 12} more</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function RingsPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['fraud_investigator', 'compliance_officer', 'state_medicaid_agency', 'platform_administrator']}>
      <AppShell><RingsInner /></AppShell>
    </AuthGate>
  );
}
