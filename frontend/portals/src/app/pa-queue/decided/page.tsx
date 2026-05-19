'use client';

import { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DataTable, type Column } from '@/components/DataTable';
import { api } from '@/lib/api-client';
import { formatDateTime, timeSince } from '@/lib/format';
import type { PaRequestRow } from '@/lib/types';

function DecidedInner(): React.ReactElement {
  const [rows, setRows] = useState<PaRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Backend filter not yet exposed; queue endpoint returns active items only.
    // The "decided" filter is a clear next addition to prior-auth-service routes.
    setError('GET /prior-auth/pa-requests/decided endpoint not yet exposed. ' +
             'Add a route with status filter to surface approved/denied/expired requests.');
    setLoading(false);
  }, []);

  const statusIcon = (s: PaRequestRow['status']): React.ReactElement => {
    if (s === 'approved')        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
    if (s === 'denied')          return <XCircleIcon className="h-4 w-4 text-red-600" />;
    return <QuestionMarkCircleIcon className="h-4 w-4 text-amber-600" />;
  };

  const columns: Column<PaRequestRow>[] = [
    { header: '',         accessor: p => statusIcon(p.status) },
    { header: 'Service',  accessor: p => <span className="font-mono text-xs">{p.service_code}</span> },
    { header: 'Decision', accessor: p => <span className="capitalize">{p.status.replace('_',' ')}</span> },
    { header: 'Decided',  accessor: p => formatDateTime(p.due_at) },
    { header: 'Age',      accessor: p => timeSince(p.created_at) },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">PA Decisions — history</h2>
      <DataTable
        rows={rows} columns={columns} loading={loading}
        errorMessage={error ?? undefined}
        emptyMessage="No decided PA requests."
        rowKey={p => p.id}
      />
    </div>
  );
}

export default function PaDecidedPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['prior_auth_specialist', 'platform_administrator', 'compliance_officer']}>
      <AppShell><DecidedInner /></AppShell>
    </AuthGate>
  );
}
