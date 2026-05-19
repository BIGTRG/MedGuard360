'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { AuthGate } from '@/components/AuthGate';
import { api, ApiError } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import type { ReportDefinition, ReportResult } from '@/lib/types';

/** Fallback catalogue shown when the reporting endpoint is unavailable. */
const BUILT_IN_REPORTS: ReportDefinition[] = [
  {
    id: 'perm-summary',
    name: 'PERM Error Rate Summary',
    description: 'Payment Error Rate Measurement — claim error rates by state and program.',
    category: 'Compliance',
    endpoint: '/v1/reporting/perm/summary',
  },
  {
    id: 'fraud-monthly',
    name: 'Monthly Fraud Activity Report',
    description: 'Fraud cases opened, closed, confirmed, and cleared by month and state.',
    category: 'Fraud',
    endpoint: '/v1/reporting/fraud/monthly',
  },
  {
    id: 'pa-disposition',
    name: 'PA Disposition Report',
    description: 'Prior authorization approvals, denials, and appeal outcomes by procedure and payer.',
    category: 'Prior Auth',
    endpoint: '/v1/reporting/pa/disposition',
  },
  {
    id: 'credentialing-pipeline',
    name: 'Credentialing Pipeline Report',
    description: 'Application volume, average decision time, and approval rates by state.',
    category: 'Credentialing',
    endpoint: '/v1/reporting/credentialing/pipeline',
  },
  {
    id: 'claims-volume',
    name: 'Claims Volume & Status Report',
    description: 'Claim submission volume, acceptance/rejection rates, and payment status by claim type.',
    category: 'Claims',
    endpoint: '/v1/reporting/claims/volume',
  },
  {
    id: 'eligibility-hits',
    name: 'Eligibility Verification Report',
    description: 'Real-time eligibility check volume, hit/miss rates, and average latency.',
    category: 'Eligibility',
    endpoint: '/v1/reporting/eligibility/hits',
  },
];

const CATEGORY_COLORS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  Compliance:    'warning',
  Fraud:         'danger',
  'Prior Auth':  'info',
  Credentialing: 'default',
  Claims:        'info',
  Eligibility:   'success',
};

interface RunState {
  reportId: string;
  loading: boolean;
  result: ReportResult | null;
  error: string | null;
}

function ReportingInner(): React.ReactElement {
  const [reports, setReports] = useState<ReportDefinition[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [runState, setRunState] = useState<RunState | null>(null);

  useEffect(() => {
    api.get<{ reports?: ReportDefinition[] }>('/v1/reporting/reports')
      .then(d => setReports(d.reports ?? BUILT_IN_REPORTS))
      .catch(() => setReports(BUILT_IN_REPORTS))
      .finally(() => setLoadingReports(false));
  }, []);

  const runReport = async (report: ReportDefinition): Promise<void> => {
    setRunState({ reportId: report.id, loading: true, result: null, error: null });
    try {
      const result = await api.get<ReportResult>(report.endpoint);
      setRunState({ reportId: report.id, loading: false, result, error: null });
    } catch (err) {
      const msg = err instanceof ApiError
        ? `${err.status === 404 ? 'Endpoint not yet available: ' : ''}${err.message}`
        : 'Failed to run report';
      setRunState({ reportId: report.id, loading: false, result: null, error: msg });
    }
  };

  const activeReport = reports.find(r => r.id === runState?.reportId);
  const categories   = [...new Set(reports.map(r => r.category))];

  return (
    <DashboardLayout title="Reports">
      <div className="space-y-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ChartBarIcon className="h-5 w-5" />
            Compliance &amp; Analytics Reports
          </h2>
          <p className="text-sm text-slate-500">
            Run on-demand reports. Results are generated live from the reporting-service.
            PERM and fraud reports are also scheduled automatically for CMS submission.
          </p>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Available Reports"    value={reports.length}    color="default" />
          <StatCard label="Report Categories"    value={categories.length} color="default" />
          <StatCard label="Reporting Service"    value="Active"            color="success" />
        </div>

        {/* Report catalogue */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {loadingReports ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card card-body animate-pulse bg-slate-100 h-28" />
            ))
          ) : (
            reports.map(report => {
              const isRunning = runState?.reportId === report.id && runState.loading;
              return (
                <div key={report.id} className="card card-body flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-slate-900 truncate">{report.name}</h3>
                        <Badge variant={CATEGORY_COLORS[report.category] ?? 'default'}>
                          {report.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{report.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      loading={isRunning}
                      onClick={() => runReport(report)}
                    >
                      {isRunning ? (
                        <>
                          <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                          Running…
                        </>
                      ) : (
                        <>
                          <ArrowPathIcon className="h-3.5 w-3.5" />
                          Run Report
                        </>
                      )}
                    </Button>
                    <Button size="sm" variant="ghost">
                      <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                      Export
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Results panel */}
        {runState && (
          <Card
            title={activeReport ? `Results: ${activeReport.name}` : 'Report Results'}
            subtitle={runState.result ? `Generated ${formatDateTime(runState.result.generated_at)} · ${runState.result.row_count} rows` : undefined}
          >
            {runState.loading && (
              <div className="py-8 text-center text-sm text-slate-500">
                <ArrowPathIcon className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-500" />
                Generating report…
              </div>
            )}

            {runState.error && (
              <div className="py-6 text-center text-sm text-slate-500">
                <p className="text-red-700 mb-2">{runState.error}</p>
                <p className="text-xs text-slate-400">
                  The reporting-service endpoint may not be implemented yet for this report type.
                  Once the backend route is wired, results will appear here automatically.
                </p>
              </div>
            )}

            {runState.result && runState.result.columns.length > 0 && (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      {runState.result.columns.map(col => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {runState.result.rows.length === 0 ? (
                      <tr>
                        <td colSpan={runState.result.columns.length} className="py-6 text-center text-sm text-slate-500">
                          No data for this period.
                        </td>
                      </tr>
                    ) : (
                      runState.result.rows.map((row, i) => (
                        <tr key={i}>
                          {runState.result!.columns.map(col => (
                            <td key={col}>{row[col] ?? '—'}</td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {runState.result && runState.result.columns.length === 0 && (
              <p className="py-6 text-center text-sm text-slate-500">Report returned no columns.</p>
            )}
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function ReportingPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={[
      'compliance_officer', 'state_medicaid_agency', 'federal_cms',
      'billing_manager', 'qa_auditor', 'fraud_investigator',
      'mco_admin', 'platform_administrator',
    ]}>
      <ReportingInner />
    </AuthGate>
  );
}
