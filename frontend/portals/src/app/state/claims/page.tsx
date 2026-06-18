'use client';

import { useEffect, useState } from 'react';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { Kpi } from '@/components/Kpi';
import { TrendChart, type TrendPoint } from '@/components/TrendChart';
import { api } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';
import { formatNumber } from '@/lib/format';
import type { RollupRow } from '@/lib/types';

function StateClaimsInner(): React.ReactElement {
  const [data, setData] = useState<{
    submitted: TrendPoint[]; paid: TrendPoint[]; denied: TrendPoint[];
    totals: { submitted: number; paid: number; denied: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stateCode = getCurrentClaims()?.stateCode ?? 'NC';
    const today = new Date();
    const past = new Date();
    past.setDate(past.getDate() - 30);
    const fromDay = past.toISOString().slice(0, 10);
    const toDay = today.toISOString().slice(0, 10);
    const q = (metric: string) =>
      api.get<{ rollups: RollupRow[] }>(
        `/v1/reporting/reports/rollups?stateCode=${stateCode}&metric=${metric}&fromDay=${fromDay}&toDay=${toDay}`,
      ).catch(() => ({ rollups: [] as RollupRow[] }));

    Promise.all([q('claims_submitted'), q('claims_paid'), q('claims_denied')]).then(([sub, paid, denied]) => {
      const series = (rows: RollupRow[]): TrendPoint[] => rows.map(r => ({ day: r.day.slice(5), value: Number(r.value) }));
      const sum = (rows: RollupRow[]): number => rows.reduce((s, r) => s + Number(r.value), 0);
      setData({
        submitted: series(sub.rollups),
        paid: series(paid.rollups),
        denied: series(denied.rollups),
        totals: { submitted: sum(sub.rollups), paid: sum(paid.rollups), denied: sum(denied.rollups) },
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500">Loading...</div>;
  if (!data) return <div className="text-sm text-slate-500">No data.</div>;

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <CurrencyDollarIcon className="h-5 w-5" /> Claims - state view
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Submitted (30d)" value={formatNumber(data.totals.submitted)} />
        <Kpi label="Paid (30d)" value={formatNumber(data.totals.paid)} tone="success" />
        <Kpi label="Denied (30d)" value={formatNumber(data.totals.denied)} tone="warning" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <TrendChart label="Submitted, daily" data={data.submitted} color="#2563eb" />
        <TrendChart label="Paid, daily" data={data.paid} color="#16a34a" />
        <TrendChart label="Denied, daily" data={data.denied} color="#d97706" />
      </div>
    </div>
  );
}

export default function StateClaimsPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['state_medicaid_agency', 'mco_admin', 'federal_cms', 'platform_administrator']}>
      <AppShell><StateClaimsInner /></AppShell>
    </AuthGate>
  );
}