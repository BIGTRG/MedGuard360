'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DocumentTextIcon, PlusIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DataTable, type Column } from '@/components/DataTable';
import { api } from '@/lib/api-client';
import { formatDateTime, timeSince } from '@/lib/format';

interface EncounterRow {
  id: string; patient_id: string; encounter_type: string; status: string;
  started_at: string; signed_at: string | null;
}

function EncountersInner(): React.ReactElement {
  const [rows, setRows] = useState<EncounterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Currently clinical-doc-service exposes single-encounter reads only; this
    // page expects a GET /encounters list endpoint to be added.
    api.get<{ encounters?: EncounterRow[] }>('/v1/clinical-doc/encounters')
      .then(r => setRows(r.encounters ?? []))
      .catch(err => {
        setError(err.status === 404
          ? 'GET /clinical-doc/encounters list endpoint not yet exposed by clinical-doc-service.'
          : err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const columns: Column<EncounterRow>[] = [
    { header: 'Encounter',  accessor: e => <Link href={`/provider/encounters/${e.id}`} className="font-mono text-xs text-brand-700 hover:underline">{e.id.slice(0,8)}…</Link> },
    { header: 'Type',       accessor: e => <span className="badge-gray">{e.encounter_type}</span> },
    { header: 'Status',     accessor: e => <span className={
      e.status === 'signed' ? 'badge-green' :
      e.status === 'transcribing' ? 'badge-yellow' :
      e.status === 'cancelled' ? 'badge-red' : 'badge-blue'
    }>{e.status}</span> },
    { header: 'Started',    accessor: e => timeSince(e.started_at) },
    { header: 'Signed',     accessor: e => formatDateTime(e.signed_at) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Encounters</h2>
        <Link href="/provider/encounters/new" className="btn-primary">
          <PlusIcon className="h-4 w-4" /> Start encounter
        </Link>
      </div>
      <DataTable
        rows={rows} columns={columns} loading={loading}
        errorMessage={error ?? undefined}
        emptyMessage="No encounters yet — start one to begin clinical documentation."
        rowKey={e => e.id}
      />
      <div className="hidden">{DocumentTextIcon.toString()}</div>
    </div>
  );
}

export default function EncountersPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['individual_provider', 'facility_provider', 'platform_administrator']}>
      <AppShell><EncountersInner /></AppShell>
    </AuthGate>
  );
}
