'use client';

import { useEffect, useState } from 'react';
import { BuildingLibraryIcon, ChartBarIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';

interface PilotPlans {
  states: { state_code: string; state_name?: string; plans?: unknown[] }[];
}

function FederalCmsInner(): React.ReactElement {
  const [statesOnboarded, setStatesOnboarded] = useState<string>('—');
  const [stateList, setStateList] = useState('NC · SC · GA');

  useEffect(() => {
    api.get<PilotPlans>('/v1/state-config/plans')
      .then((r) => {
        const codes = r.states.map(s => s.state_code).sort();
        setStatesOnboarded(String(codes.length));
        setStateList(codes.join(' · ') || '—');
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><BuildingLibraryIcon className="h-5 w-5"/> Federal CMS — Multi-state oversight</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">Pilot states (live)</dt><dd className="text-2xl font-semibold">{statesOnboarded}</dd><dd className="text-xs text-slate-500">{stateList}</dd></div>
        <div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">Total members</dt><dd className="text-2xl font-semibold">5.1M</dd></div>
        <div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">PERM error rate</dt><dd className="text-2xl font-semibold">2.8%</dd><dd className="text-xs text-slate-500">below 7% threshold</dd></div>
        <div className="rounded-lg border border-slate-200 bg-white p-3"><dt className="text-xs text-slate-500">MFCU recoveries YTD</dt><dd className="text-2xl font-semibold">$24.1M</dd></div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><ChartBarIcon className="h-4 w-4"/>T-MSIS quality</h3><p className="text-sm text-slate-600">Transformed Medicaid Statistical Information System monthly submission — all pilot states green for Q1.</p></div>
        <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><ShieldCheckIcon className="h-4 w-4"/>CMS-0057-F readiness</h3><p className="text-sm text-slate-600">Interoperability Final Rule — Patient Access API live. Provider/Payer-to-Payer/PA APIs scaffolded via Da Vinci IGs, ready for Jan 2027 deadline.</p></div>
        <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold mb-2">UPIC + Audit MIC alignment</h3><p className="text-sm text-slate-600">UPIC zone contractor (SafeGuard Services) gets read access via OIG Data Use Agreement. Audit MIC cases tracked.</p></div>
        <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold mb-2">FMAP + Section 1115 status</h3><p className="text-sm text-slate-600">NC 65% / SC 70% / GA 65% (FY26). GA Pathways waiver active through 2026-12-31.</p></div>
      </div>
    </div>
  );
}

export default function FederalCmsPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['federal_cms', 'platform_administrator']}>
      <AppShell><FederalCmsInner /></AppShell>
    </AuthGate>
  );
}
