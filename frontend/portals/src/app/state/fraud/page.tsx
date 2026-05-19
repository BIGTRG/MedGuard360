'use client';

import { useEffect, useState } from 'react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { Kpi } from '@/components/Kpi';
import { TrendChart, type TrendPoint } from '@/components/TrendChart';
import { api } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';
import { formatNumber } from '@/lib/format';
import type { RollupRow } from '@/lib/types';

function StateFraudInner(): React.ReactElement {
  const [data, setData] = useState<{
    autoBlocked: TrendPoint[]; routedReview: TrendPoint[]; autoPaid: TrendPoint[];
    totals: { autoBlocked: number; routedReview: number; autoPaid: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const claims = getCurrentClaims();
    if (!claims?.stateCode) return;
    const stateCode = claims.stateCode;
    const today = new Date(); const past = new Date(); past.setDate(past.getDate() - 30);
    const fromDay = past.toISOString().slice(0, 10); const toDay = today.toISOString().slice(0, 10);

    Promise.all([
      api.get<{ rollups: RollupRow[] }>(`/v1/reporting/reports/rollups?stateCode=${stateCode}&metric=fraud_auto_block&fromDay=${fromDay}&toDay=${toDay}`).catch(()=>({rollups:[]})),
      api.get<{ rollups: RollupRow[] }>(`/v1/reporting/reports/rollups?stateCode=${stateCode}&metric=fraud_route_to_review&fromDay=${fromDay}&toDay=${toDay}`).catch(()=>({rollups:[]})),
      api.get<{ rollups: RollupRow[] }>(`/v1/reporting/reports/rollups?stateCode=${stateCode}&metric=fraud_auto_pay&fromDay=${fromDay}&toDay=${toDay}`).catch(()=>({rollups:[]})),
    ]).then(([blocked, review, paid]) => {
      const series = (rows: RollupRow[]): TrendPoint[] => rows.map(r => ({ day: r.day.slice(5), value: Number(r.value) }));
      const sum = (rows: RollupRow[]): number => rows.reduce((s, r) => s + Number(r.value), 0);
      setData({
        autoBlocked: series(blocked.rollups),
        routedReview: series(review.rollups),
        autoPaid: series(paid.rollups),
        totals: { autoBlocked: sum(blocked.rollups), routedReview: sum(review.rollups), autoPaid: sum(paid.rollups) },
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>;
  if (!data)   return <div className="text-sm text-slate-500">No data.</div>;

  return (
    <div className="space-y-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
        <ShieldCheckIcon className="h-5 w-5" /> Fraud — state view
      </h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Auto-blocked (30d)"     value={formatNumber(data.totals.autoBlocked)} tone="danger" />
        <Kpi label="Routed to review (30d)" value={formatNumber(data.totals.routedReview)} tone="warning" />
        <Kpi label="Auto-paid (30d)"        value={formatNumber(data.totals.autoPaid)} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <TrendChart label="Auto-blocked, daily"     data={data.autoBlocked} color="#dc2626" />
        <TrendChart label="Routed to review, daily" data={data.routedReview} color="#f59e0b" />
        <TrendChart label="Auto-paid, daily"        data={data.autoPaid} color="#16a34a" />
      </div>
    </div>
  );
}

export default function StateFraudPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['state_medicaid_agency', 'mco_admin', 'federal_cms', 'fraud_investigator', 'compliance_officer', 'platform_administrator']}>
      <AppShell><StateFraudInner /></AppShell>
    </AuthGate>
  );
}
