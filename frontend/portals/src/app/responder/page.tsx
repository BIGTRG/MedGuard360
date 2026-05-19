'use client';

import { useEffect, useState } from 'react';
import { BoltIcon, FingerPrintIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { Kpi } from '@/components/Kpi';
import { DataTable, type Column } from '@/components/DataTable';
import { api } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';
import { cn, formatDateTime, timeSince } from '@/lib/format';

interface AlertRow {
  id: string; state_code: string; severity: 'low' | 'moderate' | 'high' | 'critical';
  source: string; detected_at: string; status: string;
  patient_id: string | null;
}

function ResponderInner(): React.ReactElement {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const claims = getCurrentClaims();

  useEffect(() => {
    api.get<{ alerts: AlertRow[] }>('/v1/crisis/alerts')
      .then(r => setAlerts(r.alerts))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const severityBadge = (s: AlertRow['severity']): string => ({
    critical: 'badge-red', high: 'badge-red',
    moderate: 'badge-yellow', low: 'badge-gray',
  })[s];

  const columns: Column<AlertRow>[] = [
    { header: 'Severity', accessor: a => <span className={severityBadge(a.severity)}>{a.severity}</span> },
    { header: 'State',    accessor: a => <span className="badge-gray">{a.state_code}</span> },
    { header: 'Source',   accessor: a => <span className="text-xs">{a.source}</span> },
    { header: 'Detected', accessor: a => timeSince(a.detected_at) },
    { header: 'Status',   accessor: a => <span className={a.status === 'active' ? 'badge-red' : 'badge-yellow'}>{a.status.replace('_',' ')}</span> },
    { header: 'Patient',  accessor: a => a.patient_id
        ? <a href={`/responder/patient/${a.patient_id}`} className="font-mono text-xs text-brand-700 hover:underline">{a.patient_id.slice(0,8)}…</a>
        : <span className="text-xs text-slate-400">unknown</span>
    },
  ];

  return (
    <div className={cn('space-y-6', !claims?.biometricVerified && 'opacity-60')}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <BoltIcon className="h-5 w-5 text-amber-600" /> Emergency Responder
          </h2>
          <p className="text-sm text-slate-500">Active crisis alerts in your jurisdiction. Biometric verification required to access patient crisis plans.</p>
        </div>
      </div>

      {!claims?.biometricVerified && (
        <div className="card card-body border-l-4 border-amber-500 bg-amber-50">
          <div className="flex items-start gap-3">
            <FingerPrintIcon className="h-5 w-5 flex-shrink-0 text-amber-700" />
            <div>
              <div className="font-semibold text-amber-900">Biometric verification required</div>
              <p className="text-sm text-amber-800">
                You can see this queue, but accessing a patient's crisis plan requires
                in-session biometric verification — the 3-second responder access flow.
              </p>
              <a href="/biometric" className="btn-primary mt-2">Verify now</a>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Active alerts (your state)" value={String(alerts.filter(a => a.state_code === claims?.stateCode).length)} tone="danger" />
        <Kpi label="Critical severity"          value={String(alerts.filter(a => a.severity === 'critical').length)} tone="danger" />
        <Kpi label="Dispatched"                 value={String(alerts.filter(a => a.status === 'responder_dispatched').length)} tone="warning" />
      </div>

      <DataTable rows={alerts} columns={columns} loading={loading} errorMessage={error ?? undefined} rowKey={a => a.id} emptyMessage="No active alerts — good news." />

      <div className="card card-body bg-red-50 text-sm text-red-900">
        <div className="flex items-start gap-2">
          <ShieldExclamationIcon className="h-5 w-5 flex-shrink-0 text-red-600" />
          <p>If you are responding in person, the patient's crisis plan (Stanley-Brown safety plan)
          is one biometric scan away. Every access is logged with timestamp + responder identity.</p>
        </div>
      </div>
    </div>
  );
}

export default function ResponderPortal(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['emergency_responder', 'platform_administrator']}>
      <AppShell><ResponderInner /></AppShell>
    </AuthGate>
  );
}
