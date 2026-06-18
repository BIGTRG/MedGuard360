'use client';

import { useEffect, useState } from 'react';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { Kpi } from '@/components/Kpi';
import { TrendChart, type TrendPoint } from '@/components/TrendChart';
import { api } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';
import { formatNumber } from '@/lib/format';
import type { RollupRow } from '@/lib/types';

function StateCredentialingInner(): React.ReactElement {
  const [data, setData] = useState<{ approved: TrendPoint[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stateCode = getCurrentClaims()?.stateCode ?? 'NC';
    const today = new Date();
    const past = new Date();
    past.setDate(past.getDate() - 30);
    api.get<{ rollups: RollupRow[] }>(
      `/v1/reporting/reports/rollups?stateCode=${stateCode}&metric=credentialing_approved&fromDay=${past.toISOString().slice(0, 10)}&toDay=${today.toISOString().slice(0, 10)}`,
    ).catch(() => ({ rollups: [] as RollupRow[] }))
      .then(r => {
        const series = r.rollups.map(row => ({ day: row.day.slice(5), value: Number(row.value) }));
        const total = r.rollups.reduce((s, row) => s + Number(row.value), 0);
        setData({ approved: series, total });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500">Loading...</div>;
  if (!data) return <div className="text-sm text-slate-500">No data.</div>;

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <ClipboardDocumentCheckIcon className="h-5 w-5" /> Credentialing - state view
      </h2>
      <Kpi label="Applications approved (30d)" value={formatNumber(data.total)} tone="success" />
      <TrendChart label="Approvals, daily" data={data.approved} color="#059669" />
    </div>
  );
}

export default function StateCredentialingPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['state_medicaid_agency', 'mco_admin', 'federal_cms', 'platform_administrator']}>
      <AppShell><StateCredentialingInner /></AppShell>
    </AuthGate>
  );
}