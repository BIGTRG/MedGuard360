'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AuthGate } from '@/components/AuthGate';
import { api, ApiError } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { Claim } from '@/lib/types';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'default' | 'info';

function statusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    paid:      'success',
    submitted: 'info',
    accepted:  'info',
    denied:    'danger',
    rejected:  'danger',
    draft:     'default',
    pending:   'warning',
  };
  return map[status] ?? 'default';
}

function fraudColor(score: number): string {
  if (score >= 60) return 'font-semibold text-red-700';
  if (score >= 30) return 'font-semibold text-amber-700';
  return 'font-semibold text-green-700';
}

function ClaimsInner(): React.ReactElement {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ claims?: Claim[] }>('/v1/claims?limit=50')
      .then(d => setClaims(d.claims ?? []))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load claims'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Claims">
      <div className="space-y-4">
        <Card>
          {error ? (
            <p className="py-8 text-center text-sm text-red-700">{error}</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>CCN</th>
                  <th>Type</th>
                  <th>State</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Fraud Score</th>
                  <th>Service Date</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-500">Loading claims…</td></tr>
                )}
                {!loading && claims.length === 0 && !error && (
                  <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-500">No claims found.</td></tr>
                )}
                {claims.map(c => (
                  <tr key={c.id}>
                    <td className="font-mono text-xs">{c.ccn}</td>
                    <td>{c.claim_type}</td>
                    <td><span className="badge-gray">{c.state_code}</span></td>
                    <td className="font-medium">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(c.total_amount))}
                    </td>
                    <td><Badge variant={statusVariant(c.status)}>{c.status}</Badge></td>
                    <td>
                      {c.fraud_score != null ? (
                        <span className={fraudColor(c.fraud_score)}>{c.fraud_score}/100</span>
                      ) : '—'}
                    </td>
                    <td className="text-slate-500">{formatDate(c.service_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

export default function ClaimsPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={[
      'individual_provider', 'facility_provider', 'pharmacy', 'dmepos_supplier',
      'billing_manager', 'compliance_officer', 'fraud_investigator',
      'state_medicaid_agency', 'mco_admin', 'federal_cms',
      'denial_appeals_specialist', 'platform_administrator',
    ]}>
      <ClaimsInner />
    </AuthGate>
  );
}
