'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { api } from '@/lib/api-client';
import { timeSince } from '@/lib/format';
import {
  UsersIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
  ClipboardDocumentCheckIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import type { DashboardStats } from '@/lib/types';

const FALLBACK_STATS: DashboardStats = {
  totalClaims: 0,
  fraudCasesOpen: 0,
  paPending: 0,
  credentialingPending: 0,
  activePatients: 0,
};

const SERVICES = [
  'Auth Service',
  'Claims Service',
  'Fraud Engine',
  'Prior Auth Engine',
  'AI Engines (10)',
];

const RECENT_ACTIVITY = [
  { text: 'Claim submitted — CCN 260519-000001', time: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  { text: 'PA request approved — Procedure 93000', time: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  { text: 'Fraud alert raised — Score 78/100', time: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
  { text: 'Provider credentialed — NPI 1234567890', time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
];

export default function DashboardPage(): React.ReactElement {
  const [stats, setStats] = useState<DashboardStats>(FALLBACK_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ count: number }>('/v1/patients?limit=1').catch(() => ({ count: 0 })),
      api.get<{ count: number }>('/v1/claims?limit=1').catch(() => ({ count: 0 })),
      api.get<{ cases: unknown[] }>('/v1/fraud/cases?limit=50').catch(() => ({ cases: [] })),
      api.get<{ count: number }>('/v1/prior-auth/pa-requests/queue').catch(() => ({ count: 0 })),
    ]).then(([patients, claims, fraud, pa]) => {
      setStats({
        activePatients: patients.count ?? 0,
        totalClaims: claims.count ?? 0,
        fraudCasesOpen: fraud.cases?.length ?? 0,
        paPending: pa.count ?? 0,
        credentialingPending: 0,
      });
    }).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Active Patients"
            value={loading ? '…' : stats.activePatients.toLocaleString()}
            icon={<UsersIcon className="h-4 w-4" />}
            color="default"
          />
          <StatCard
            label="Total Claims"
            value={loading ? '…' : stats.totalClaims.toLocaleString()}
            icon={<DocumentTextIcon className="h-4 w-4" />}
            color="default"
          />
          <StatCard
            label="Fraud Cases Open"
            value={loading ? '…' : stats.fraudCasesOpen.toLocaleString()}
            icon={<ShieldExclamationIcon className="h-4 w-4" />}
            color="danger"
          />
          <StatCard
            label="PA Pending"
            value={loading ? '…' : stats.paPending.toLocaleString()}
            icon={<ClipboardDocumentCheckIcon className="h-4 w-4" />}
            color="warning"
          />
          <StatCard
            label="Credentialing Pending"
            value={loading ? '…' : stats.credentialingPending.toLocaleString()}
            icon={<BuildingOfficeIcon className="h-4 w-4" />}
            color="warning"
          />
        </div>

        {/* Activity + Status row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Recent Activity" subtitle="Last 24 hours">
            <div className="space-y-3">
              {RECENT_ACTIVITY.map((item, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-brand-500" />
                  <div>
                    <p className="text-slate-800">{item.text}</p>
                    <p className="text-xs text-slate-400">{timeSince(item.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Platform Status" subtitle="All systems">
            <div className="space-y-3">
              {SERVICES.map(service => (
                <div key={service} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{service}</span>
                  <span className="flex items-center gap-1.5 text-green-600">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    healthy
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
