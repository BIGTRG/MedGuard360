'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PlayIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';

function NewEncounterInner(): React.ReactElement {
  const router = useRouter();
  const claims = getCurrentClaims();
  const [patientId, setPatientId] = useState('');
  const [encounterType, setEncounterType] = useState<'office'|'telehealth'|'home'|'school'|'crisis'|'emergency'>('office');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      const resp = await api.post<{ encounter?: { id: string }; id?: string }>('/v1/clinical-doc/encounters', {
        patientId,
        stateCode: claims?.stateCode ?? 'NC',
        serviceDate: new Date().toISOString().slice(0, 10),
      });
      const encId = resp.encounter?.id ?? resp.id;
      if (!encId) throw new Error('Encounter id missing from response');
      router.push(`/provider/encounters/${encId}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Start an encounter</h2>
      <form onSubmit={submit} className="card card-body space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Patient UUID</span>
          <input className="input" required value={patientId} onChange={e => setPatientId(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Encounter type</span>
          <select className="input" value={encounterType} onChange={e => setEncounterType(e.target.value as typeof encounterType)}>
            <option value="office">Office</option>
            <option value="telehealth">Telehealth</option>
            <option value="home">Home visit</option>
            <option value="school">School-based</option>
            <option value="crisis">Crisis</option>
            <option value="emergency">Emergency</option>
          </select>
        </label>
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <button type="submit" className="btn-primary" disabled={submitting}>
          <PlayIcon className="h-4 w-4" /> {submitting ? 'Starting…' : 'Start encounter'}
        </button>
      </form>
    </div>
  );
}

export default function NewEncounterPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['individual_provider','facility_provider','platform_administrator']}>
      <AppShell><NewEncounterInner /></AppShell>
    </AuthGate>
  );
}
