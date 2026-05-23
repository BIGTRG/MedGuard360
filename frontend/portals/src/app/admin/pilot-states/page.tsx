'use client';

import { useEffect, useState } from 'react';
import { MapIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';

interface Plan {
  state_code: string; mco_name: string; plan_type: string | null;
  payer_id: string; launch_date: string | null; sunset_date: string | null;
  notes: string | null; active: boolean;
}
interface StateRow {
  state_code: string; state_name: string;
  mac_part_a_b: string | null; mac_dmepos: string | null;
  hie_name: string | null; hie_vendor: string | null;
  expansion_status: string | null; hub_phone_number: string | null;
  plans: Plan[];
}

function PlanBadge({ p }: { p: Plan }): React.ReactElement {
  if (!p.active && p.sunset_date) return <span className="badge-gray">sunset {p.sunset_date.slice(0,7)}</span>;
  if (p.launch_date && new Date(p.launch_date) > new Date()) return <span className="badge-yellow">launching {p.launch_date.slice(0,7)}</span>;
  return <span className="badge-green">active</span>;
}

function PilotStatesInner(): React.ReactElement {
  const [rows, setRows] = useState<StateRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ states: StateRow[] }>('/v1/state-config/plans')
      .then(r => setRows(r.states))
      .catch(e => setErr(e.message));
  }, []);

  if (err) return <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-900">{err}</div>;
  if (!rows.length) return <div className="text-sm text-slate-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <MapIcon className="h-5 w-5" /> Pilot States — NC / SC / GA
        </h2>
        <p className="text-sm text-slate-600 mt-1">Live from <code>state_configs</code> + <code>mco_registry</code>.</p>
      </div>

      {rows.map(s => (
        <div key={s.state_code} className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900">{s.state_name} ({s.state_code})</h3>
            <span className={'badge-' + (s.expansion_status === 'expanded' ? 'green' : s.expansion_status === 'partial' ? 'yellow' : 'gray')}>
              Expansion: {s.expansion_status ?? 'unknown'}
            </span>
          </div>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-xs mb-4">
            <div><dt className="text-slate-500">Medicare A/B MAC</dt><dd className="font-medium text-slate-900">{s.mac_part_a_b ?? '—'}</dd></div>
            <div><dt className="text-slate-500">DMEPOS MAC</dt><dd className="font-medium text-slate-900">{s.mac_dmepos ?? '—'}</dd></div>
            <div><dt className="text-slate-500">HIE</dt><dd className="font-medium text-slate-900">{s.hie_name ?? '—'}</dd></div>
            <div><dt className="text-slate-500">HIE vendor</dt><dd className="font-medium text-slate-900">{s.hie_vendor ?? '—'}</dd></div>
            <div><dt className="text-slate-500">Hub phone</dt><dd className="font-medium text-slate-900">{s.hub_phone_number ?? '—'}</dd></div>
            <div><dt className="text-slate-500">Plans seeded</dt><dd className="font-medium text-slate-900">{s.plans.length}</dd></div>
          </dl>
          <table className="w-full table-fixed text-xs">
            <thead className="bg-slate-50 text-left uppercase text-slate-500">
              <tr>
                <th className="py-2 px-3 w-2/5">Plan</th>
                <th className="py-2 px-3 w-1/6">Type</th>
                <th className="py-2 px-3 w-1/6">Payer ID</th>
                <th className="py-2 px-3 w-1/6">Status</th>
                <th className="py-2 px-3 w-1/3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {s.plans.map(p => (
                <tr key={p.payer_id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-medium text-slate-900"><BuildingOffice2Icon className="inline h-3.5 w-3.5 mr-1 text-slate-400"/>{p.mco_name}</td>
                  <td className="py-2 px-3"><span className="badge-gray">{p.plan_type ?? '—'}</span></td>
                  <td className="py-2 px-3 font-mono text-slate-700">{p.payer_id}</td>
                  <td className="py-2 px-3"><PlanBadge p={p} /></td>
                  <td className="py-2 px-3 text-slate-600">{p.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default function PilotStatesPage(): React.ReactElement {
  return (
    <AuthGate>
      <AppShell>
        <PilotStatesInner />
      </AppShell>
    </AuthGate>
  );
}
