'use client';

import { useState } from 'react';
import { BeakerIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { Kpi } from '@/components/Kpi';
import { api } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';
import { cn } from '@/lib/format';

interface FormularyResult {
  ndc: string; drug_name: string; tier: number;
  pa_required: boolean; step_therapy: boolean; quantity_limit: number | null;
}

function PharmacyInner(): React.ReactElement {
  const [ndc, setNdc] = useState('');
  const [payer, setPayer] = useState('');
  const [result, setResult] = useState<FormularyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const claims = getCurrentClaims();
    if (!claims?.stateCode) { setError('No state on session.'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await api.get<FormularyResult>(`/v1/pharmacy/formulary/${claims.stateCode}/${payer}/${ndc}`);
      setResult(r);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <BeakerIcon className="h-5 w-5" /> Pharmacy
        </h2>
        <p className="text-sm text-slate-500">NCPDP D.0 claim submission + per-payer formulary lookup.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Submit a claim" value="↗" hint="POST /pharmacy/claims (biometric required)" />
        <Kpi label="Check formulary" value="↓" hint="Use the lookup form below" />
        <Kpi label="MTM workflows" value="—" hint="Med therapy management — coming next" />
      </div>

      <div className="card card-body space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Formulary lookup</h3>
        <form className="flex flex-wrap gap-2" onSubmit={lookup}>
          <input className="input max-w-[160px]" placeholder="Payer ID" required value={payer} onChange={e => setPayer(e.target.value)} />
          <input className="input max-w-[200px]" placeholder="NDC (11 digits)" required pattern="\d{11}" value={ndc} onChange={e => setNdc(e.target.value)} />
          <button className="btn-primary" type="submit" disabled={loading}>
            <MagnifyingGlassIcon className="h-4 w-4" /> {loading ? 'Looking up…' : 'Lookup'}
          </button>
        </form>
        {error && <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>}
        {result && (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-slate-800">{result.drug_name}</span>
              <span className="font-mono text-xs">{result.ndc}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className={cn('badge', `bg-slate-200 text-slate-700`)}>Tier {result.tier}</span>
              {result.pa_required  && <span className="badge-yellow">Prior auth required</span>}
              {result.step_therapy && <span className="badge-yellow">Step therapy required</span>}
              {result.quantity_limit != null && <span className="badge-gray">Qty cap {result.quantity_limit}/mo</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PharmacyPortal(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['pharmacy', 'billing_manager', 'platform_administrator']}>
      <AppShell><PharmacyInner /></AppShell>
    </AuthGate>
  );
}
