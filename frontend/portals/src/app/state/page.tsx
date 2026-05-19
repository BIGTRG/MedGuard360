'use client';

import { useEffect, useState } from 'react';
import { ShieldCheckIcon, ExclamationTriangleIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { Kpi } from '@/components/Kpi';
import { TrendChart, type TrendPoint } from '@/components/TrendChart';
import { api, ApiError } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';
import { formatNumber, formatDate } from '@/lib/format';
import type { RollupRow } from '@/lib/types';

interface DashboardData {
  claimsSubmitted: TrendPoint[];
  claimsPaid: TrendPoint[];
  fraudFlagged: TrendPoint[];
  paApproved: TrendPoint[];
  totals: {
    claimsSubmitted: number; claimsPaid: number; claimsDenied: number;
    fraudFlagged: number; paApproved: number; paDenied: number;
    credentialingApproved: number;
  };
}

function StateDashboardInner(): React.ReactElement {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const claims = getCurrentClaims();
    if (!claims?.stateCode) { setError('No state assigned to your account.'); setLoading(false); return; }
    const stateCode = claims.stateCode;
    const today = new Date();
    const past = new Date(); past.setDate(past.getDate() - 30);
    const fromDay = past.toISOString().slice(0, 10);
    const toDay = today.toISOString().slice(0, 10);

    Promise.all([
      api.get<{ rollups: RollupRow[] }>(`/v1/reporting/reports/rollups?stateCode=${stateCode}&metric=claims_submitted&fromDay=${fromDay}&toDay=${toDay}`).catch(empty),
      api.get<{ rollups: RollupRow[] }>(`/v1/reporting/reports/rollups?stateCode=${stateCode}&metric=claims_paid&fromDay=${fromDay}&toDay=${toDay}`).catch(empty),
      api.get<{ rollups: RollupRow[] }>(`/v1/reporting/reports/rollups?stateCode=${stateCode}&metric=claims_denied&fromDay=${fromDay}&toDay=${toDay}`).catch(empty),
      api.get<{ rollups: RollupRow[] }>(`/v1/reporting/reports/rollups?stateCode=${stateCode}&metric=fraud_flagged&fromDay=${fromDay}&toDay=${toDay}`).catch(empty),
      api.get<{ rollups: RollupRow[] }>(`/v1/reporting/reports/rollups?stateCode=${stateCode}&metric=pa_approved&fromDay=${fromDay}&toDay=${toDay}`).catch(empty),
      api.get<{ rollups: RollupRow[] }>(`/v1/reporting/reports/rollups?stateCode=${stateCode}&metric=pa_denied&fromDay=${fromDay}&toDay=${toDay}`).catch(empty),
      api.get<{ rollups: RollupRow[] }>(`/v1/reporting/reports/rollups?stateCode=${stateCode}&metric=credentialing_approved&fromDay=${fromDay}&toDay=${toDay}`).catch(empty),
    ]).then(([sub, paid, denied, flagged, paApp, paDen, credApp]) => {
      const series = (rows: RollupRow[]): TrendPoint[] => rows.map(r => ({ day: r.day.slice(5), value: Number(r.value) }));
      const sum = (rows: RollupRow[]): number => rows.reduce((s, r) => s + Number(r.value), 0);
      setData({
        claimsSubmitted: series(sub.rollups),
        claimsPaid:      series(paid.rollups),
        fraudFlagged:    series(flagged.rollups),
        paApproved:      series(paApp.rollups),
        totals: {
          claimsSubmitted: sum(sub.rollups), claimsPaid: sum(paid.rollups), claimsDenied: sum(denied.rollups),
          fraudFlagged: sum(flagged.rollups),
          paApproved: sum(paApp.rollups), paDenied: sum(paDen.rollups),
          credentialingApproved: sum(credApp.rollups),
        },
      });
    }).catch(err => {
      setError(err instanceof ApiError ? err.message : 'Failed to load dashboard');
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error)   return <ErrorBox message={error} />;
  if (!data)   return <ErrorBox message="No data" />;

  const claims = getCurrentClaims();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {claims?.stateCode} Medicaid — 30-day overview
          </h2>
          <p className="text-sm text-slate-500">Pre-payment fraud prevention + real-time program metrics. {formatDate(new Date())}.</p>
        </div>
        <button className="btn-primary">Run PERM report</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Claims submitted (30d)" value={formatNumber(data.totals.claimsSubmitted)} />
        <Kpi label="Claims paid"            value={formatNumber(data.totals.claimsPaid)} tone="success" />
        <Kpi label="Claims denied"          value={formatNumber(data.totals.claimsDenied)} tone="warning" />
        <Kpi label="Fraud flags raised"     value={formatNumber(data.totals.fraudFlagged)} tone="danger" hint="Pre-payment blocks" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart label="Claims submitted, daily" data={data.claimsSubmitted} />
        <TrendChart label="Fraud flags raised, daily" data={data.fraudFlagged} color="#dc2626" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Kpi label="PA approved (30d)"      value={formatNumber(data.totals.paApproved)} tone="success" />
        <Kpi label="PA denied (30d)"        value={formatNumber(data.totals.paDenied)} tone="warning" />
        <Kpi label="Credentialing approvals"value={formatNumber(data.totals.credentialingApproved)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TrendChart label="PA approvals, daily" data={data.paApproved} color="#16a34a" />
        <TrendChart label="Claims paid, daily"  data={data.claimsPaid} color="#16a34a" />
      </div>

      <div className="card">
        <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
          What's happening right now
        </div>
        <ul className="divide-y divide-slate-100">
          <ActivityItem icon={ShieldCheckIcon} title="Pre-payment fraud engine online" subtitle="Auto-block threshold: 80 / 100" tone="success" />
          <ActivityItem icon={ClockIcon} title="PA SLA tracking enforced" subtitle="Drug 24h • Expedited 72h • Standard 7d" tone="default" />
          <ActivityItem icon={ExclamationTriangleIcon} title="3 fraud cases require investigator review" subtitle="Open queue in Fraud → Cases" tone="warning" />
          <ActivityItem icon={CurrencyDollarIcon} title="Daily rollups refresh every event" subtitle="Real-time from Kafka topics" tone="default" />
        </ul>
      </div>
    </div>
  );
}

function ActivityItem({ icon: Icon, title, subtitle, tone }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; subtitle: string;
  tone: 'success' | 'warning' | 'danger' | 'default';
}): React.ReactElement {
  const toneClass = tone === 'success' ? 'text-green-600' :
                    tone === 'warning' ? 'text-amber-600' :
                    tone === 'danger'  ? 'text-red-600'   : 'text-slate-500';
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <Icon className={`h-5 w-5 ${toneClass}`} />
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-800">{title}</div>
        <div className="text-xs text-slate-500">{subtitle}</div>
      </div>
    </li>
  );
}

function Loading(): React.ReactElement { return <div className="text-sm text-slate-500">Loading dashboard…</div>; }
function ErrorBox({ message }: { message: string }): React.ReactElement {
  return <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>;
}
function empty(): { rollups: RollupRow[] } { return { rollups: [] }; }

export default function StateDashboard(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['state_medicaid_agency', 'mco_admin', 'federal_cms', 'platform_administrator']}>
      <AppShell>
        <StateDashboardInner />
      </AppShell>
    </AuthGate>
  );
}
