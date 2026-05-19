'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AuthGate } from '@/components/AuthGate';
import { api, ApiError } from '@/lib/api-client';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import type { Patient } from '@/lib/types';

function PatientsInner(): React.ReactElement {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ patients?: Patient[] }>('/v1/patients')
      .then(d => setPatients(d.patients ?? []))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Failed to load patients'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter(p =>
    `${p.first_name} ${p.last_name} ${p.medicaid_id}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <DashboardLayout title="Patients">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative w-80">
            <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or Medicaid ID…"
              className="input pl-9"
            />
          </div>
          <Button size="sm">
            <PlusIcon className="h-4 w-4" />
            Add Patient
          </Button>
        </div>

        <Card>
          {error ? (
            <p className="py-8 text-center text-sm text-red-700">{error}</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Medicaid ID</th>
                  <th>State</th>
                  <th>Status</th>
                  <th>DOB</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-500">Loading patients…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-500">No patients found.</td></tr>
                )}
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.first_name} {p.last_name}</td>
                    <td className="font-mono text-xs text-slate-600">{p.medicaid_id}</td>
                    <td>{p.state_code}</td>
                    <td>
                      <Badge variant={p.is_active ? 'success' : 'default'}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="text-slate-600">{p.dob}</td>
                    <td>
                      <Link href={`/patient/${p.id}`} className="btn-ghost text-xs">
                        View
                      </Link>
                    </td>
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

export default function PatientsPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={[
      'individual_provider', 'facility_provider', 'credentialing_specialist',
      'billing_manager', 'compliance_officer', 'fraud_investigator',
      'state_medicaid_agency', 'mco_admin', 'federal_cms',
      'prior_auth_specialist', 'platform_administrator',
    ]}>
      <PatientsInner />
    </AuthGate>
  );
}
