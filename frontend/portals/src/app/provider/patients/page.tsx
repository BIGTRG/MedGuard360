'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { DataTable, type Column } from '@/components/DataTable';
import { api } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';
import { formatDate } from '@/lib/format';

interface PatientRow {
  id: string; first_name: string; last_name: string;
  date_of_birth: string; state_code: string; medicaid_id: string | null;
}

function PatientsInner(): React.ReactElement {
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastName, setLastName] = useState('');

  const fetch = (search?: string): void => {
    setLoading(true);
    const claims = getCurrentClaims();
    const params = new URLSearchParams({ limit: '100' });
    if (claims?.stateCode) params.set('stateCode', claims.stateCode);
    if (search) params.set('lastName', search);
    api.get<{ patients: PatientRow[] }>(`/v1/patients?${params}`)
      .then(r => setPatients(r.patients))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => fetch(), []);

  const columns: Column<PatientRow>[] = [
    { header: 'Name',         accessor: p => <Link href={`/provider/patients/${p.id}`} className="font-medium text-brand-700 hover:underline">{p.last_name}, {p.first_name}</Link> },
    { header: 'DOB',          accessor: p => formatDate(p.date_of_birth) },
    { header: 'Medicaid ID',  accessor: p => <span className="font-mono text-xs">{p.medicaid_id ?? '—'}</span> },
    { header: 'State',        accessor: p => <span className="badge-gray">{p.state_code}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Patients</h2>
        <Link href="/provider/patients/new" className="btn-primary"><PlusIcon className="h-4 w-4" /> New patient</Link>
      </div>
      <form className="flex max-w-sm gap-2" onSubmit={e => { e.preventDefault(); fetch(lastName); }}>
        <input className="input" placeholder="Search by last name…" value={lastName} onChange={e => setLastName(e.target.value)} />
        <button className="btn-ghost" type="submit"><MagnifyingGlassIcon className="h-4 w-4" /></button>
      </form>
      <DataTable rows={patients} columns={columns} loading={loading} errorMessage={error ?? undefined} rowKey={p => p.id} />
    </div>
  );
}

export default function PatientsPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['individual_provider', 'facility_provider', 'platform_administrator']}>
      <AppShell><PatientsInner /></AppShell>
    </AuthGate>
  );
}
