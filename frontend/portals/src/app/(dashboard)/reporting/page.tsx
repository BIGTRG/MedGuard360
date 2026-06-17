'use client';

import { useEffect, useState } from 'react';
import {
  ChartBarIcon, DocumentArrowDownIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api, ApiError } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';

interface CatalogReport {
  id: string;
  name: string;
  description: string;
  endpoint?: string;
  parameters?: { kind?: string };
}

interface RunState {
  reportId: string;
  loading: boolean;
  payload: unknown | null;
  error: string | null;
}

function ReportingInner(): React.ReactElement {
  const [reports, setReports] = useState<CatalogReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [runState, setRunState] = useState<RunState | null>(null);

  useEffect(() => {
    api.get<{ reports?: CatalogReport[] }>('/v1/reporting/reports')
      .then(d => setReports(d.reports ?? []))
      .catch(() => setReports([]))
      .finally(() => setLoadingReports(false));
  }, []);

  const runReport = async (report: CatalogReport): Promise<void> => {
    setRunState({ reportId: report.id, loading: true, payload: null, error: null });
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const kind = report.parameters?.kind ?? report.id;
    try {
      const result = await api.post<unknown>('/v1/reporting/reports/run', {
        stateCode: 'NC',
        kind,
        from: from.toISOString(),
        to: to.toISOString(),
      });
      setRunState({ reportId: report.id, loading: false, payload: result, error: null });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to run report';
      setRunState({ reportId: report.id, loading: false, payload: null, error: msg });
    }
  };

  const exportPerm = async (): Promise<void> => {
    try {
      const text = await api.get<string>('/v1/reporting/perm/ffs-universe?format=pipe&stateCode=NC');
      const blob = new Blob([typeof text === 'string' ? text : JSON.stringify(text)], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'perm-nc-demo.txt';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setRunState({ reportId: 'perm-export', loading: false, payload: null, error: (err as Error).message });
    }
  };

  const activeReport = reports.find(r => r.id === runState?.reportId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <ChartBarIcon className="h-5 w-5" />
          Compliance &amp; Analytics Reports
        </h2>
        <p className="text-sm text-slate-500">
          Reports run live against reporting-service (PERM, fraud summary, claims volume).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loadingReports ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card card-body animate-pulse bg-slate-100 h-28" />
          ))
        ) : (
          reports.map(report => {
            const isRunning = runState?.reportId === report.id && runState.loading;
            return (
              <div key={report.id} className="card card-body flex flex-col gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{report.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{report.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-primary text-xs" disabled={isRunning} onClick={() => void runReport(report)}>
                    <ArrowPathIcon className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                    {isRunning ? 'Running…' : 'Run Report'}
                  </button>
                  {report.id === 'perm' && (
                    <button type="button" className="btn-ghost text-xs" onClick={() => void exportPerm()}>
                      <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                      Export PERM
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {runState && (
        <div className="card card-body">
          <h3 className="text-sm font-semibold mb-2">
            {activeReport ? `Results: ${activeReport.name}` : 'Report output'}
          </h3>
          {runState.loading && <p className="text-sm text-slate-500">Generating report…</p>}
          {runState.error && <p className="text-sm text-red-700">{runState.error}</p>}
          {runState.payload != null && (
            <pre className="mt-2 max-h-96 overflow-auto rounded bg-slate-900 p-3 text-xs text-green-100">
              {JSON.stringify(runState.payload, null, 2)}
            </pre>
          )}
          {runState.payload != null && (
            <p className="mt-2 text-xs text-slate-500">Generated {formatDateTime(new Date().toISOString())}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportingPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={[
      'compliance_officer', 'state_medicaid_agency', 'federal_cms',
      'billing_manager', 'qa_auditor', 'fraud_investigator',
      'mco_admin', 'platform_administrator',
    ]}>
      <AppShell><ReportingInner /></AppShell>
    </AuthGate>
  );
}
