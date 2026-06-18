'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DocumentTextIcon, PlusIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DataTable, type Column } from '@/components/DataTable';
import { api } from '@/lib/api-client';
import { formatDateTime } from '@/lib/format';

interface EncounterRow {
  id: string;
  patient_id: string;
  provider_id?: string;
  provider_user_id?: string;
  state_code: string;
  encounter_type?: string;
  service_date?: string;
  started_at?: string;
  created_at?: string;
  status: string;
  signed_at: string | null;
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
      .catch(err => setError(err.message ?? 'Unable to load encounters.'))
      .finally(() => setLoading(false));
  }, []);

  const columns: Column<EncounterRow>[] = [
    { header: 'Encounter',  accessor: e => <Link href={`/provider/encounters/${e.id}`} className="font-mono text-xs text-brand-700 hover:underline">{e.id.slice(0,8)}…</Link> },
    { header: 'Type',       accessor: e => <span className="badge-gray">{e.encounter_type ?? 'visit'}</span> },
    { header: 'Service date', accessor: e => formatDateTime(e.started_at ?? e.service_date ?? e.created_at) },
    { header: 'Status',     accessor: e => <span className={
      e.status === 'signed' ? 'badge-green' :
      e.status === 'transcribing' ? 'badge-yellow' :
      e.status === 'cancelled' ? 'badge-red' : 'badge-blue'
    }>{e.status}</span> },
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
