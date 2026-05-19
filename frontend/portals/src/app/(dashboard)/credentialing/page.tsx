'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { AuthGate } from '@/components/AuthGate';
import { api, ApiError } from '@/lib/api-client';
import { formatDateTime, timeSince, cn } from '@/lib/format';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import type { CredentialingApplication } from '@/lib/types';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'default' | 'info';

function statusVariant(s: CredentialingApplication['status']): BadgeVariant {
  if (s === 'approved') return 'success';
  if (s === 'denied' || s === 'expired') return 'danger';
  if (s === 'review_pending' || s === 'psv_pending' || s === 'docs_pending') return 'warning';
  return 'info';
}

function CredentialingInner(): React.ReactElement {
  const [apps, setApps] = useState<CredentialingApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ applications?: CredentialingApplication[] }>('/v1/credentialing/applications')
      .then(d => setApps(d.applications ?? []))
      .catch(err => {
        if (err instanceof ApiError && err.status === 404) {
          setError(
            'GET /credentialing/applications list endpoint not yet exposed. ' +
            'Add a status-filter route to the credentialing-service to surface the queue.',
          );
        } else {
          setError(err instanceof ApiError ? err.message : 'Failed to load applications');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    open:     apps.filter(a => !['approved', 'denied', 'withdrawn', 'expired'].includes(a.status)).length,
    overdue:  apps.filter(a => new Date(a.target_decision_by).getTime() < Date.now() && !['approved', 'denied'].includes(a.status)).length,
    approved: apps.filter(a => a.status === 'approved').length,
    denied:   apps.filter(a => a.status === 'denied').length,
  };

  return (
    <DashboardLayout title="Credentialing">
      <div className="space-y-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ClipboardDocumentCheckIcon className="h-5 w-5" />
            Credentialing Queue
          </h2>
          <p className="text-sm text-slate-500">
            5-day SLA on every application. 6 primary source verification (PSV) checks run automatically.
            Credentialing decisions require specialist review — AI assists, humans approve.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <StatCard label="Open Applications" value={stats.open}     color="default" />
          <StatCard label="Overdue"           value={stats.overdue}  color="danger" />
          <StatCard label="Approved"          value={stats.approved} color="success" />
          <StatCard label="Denied"            value={stats.denied}   color="danger" />
        </div>

        <Card
          title="Applications"
          subtitle="All credentialing applications across states"
          action={
            <Button size="sm" variant="secondary">
              New Application
            </Button>
          }
        >
          {error ? (
            <p className="py-8 text-center text-sm text-slate-500">{error}</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Application ID</th>
                  <th>Provider</th>
                  <th>Type</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Due</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={8} className="py-8 text-center text-sm text-slate-500">Loading applications…</td></tr>
                )}
                {!loading && apps.length === 0 && !error && (
                  <tr><td colSpan={8} className="py-8 text-center text-sm text-slate-500">No applications.</td></tr>
                )}
                {apps.map(a => {
                  const overdue = new Date(a.target_decision_by).getTime() < Date.now()
                    && !['approved', 'denied'].includes(a.status);
                  return (
                    <tr key={a.id}>
                      <td className="font-mono text-xs">{a.id.slice(0, 8)}…</td>
                      <td className="font-mono text-xs text-slate-600">{a.provider_id.slice(0, 8)}…</td>
                      <td><span className="badge-gray">{a.application_type.replace('_', ' ')}</span></td>
                      <td><span className="badge-gray">{a.state_code}</span></td>
                      <td>
                        <Badge variant={statusVariant(a.status)}>
                          {a.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="text-xs text-slate-500">{timeSince(a.submitted_at)}</td>
                      <td className={cn('text-xs', overdue && 'font-semibold text-red-700')}>
                        {formatDateTime(a.target_decision_by)}
                      </td>
                      <td>
                        <Link href={`/credentialing/${a.id}`} className="btn-ghost text-xs">
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function CredentialingPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={[
      'credentialing_specialist', 'state_medicaid_agency', 'mco_admin',
      'compliance_officer', 'platform_administrator',
    ]}>
      <CredentialingInner />
    </AuthGate>
  );
}
