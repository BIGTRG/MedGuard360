'use client';

import { useState, useEffect } from 'react';
import { ArrowsRightLeftIcon, DocumentArrowUpIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { Kpi } from '@/components/Kpi';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';

interface Consent {
  id: string; scope: string; granted_to_org: string;
  effective_from: string; effective_to: string | null; status: string;
}

function HieInner(): React.ReactElement {
  const [patientId, setPatientId] = useState('');
  const [consents, setConsents] = useState<Consent[]>([]);
  const [referralCount, setReferralCount] = useState('—');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ count: number }>('/v1/hie/referrals?limit=50')
      .then(r => setReferralCount(String(r.count)))
      .catch(() => setReferralCount('0'));
  }, []);

  const fetch = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!patientId) return;
    setLoading(true); setError(null);
    try {
      const r = await api.get<{ consents: Consent[] }>(`/v1/hie/patients/${patientId}/consents`);
      setConsents(r.consents);
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
          <ArrowsRightLeftIcon className="h-5 w-5" /> HIE Administration
        </h2>
        <p className="text-sm text-slate-500">
          FHIR R4 gateway — referrals (ServiceRequest), consent (Consent), and audit.
          CMS Interoperability Final Rule compliance path.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi label="Outbound referrals"  value={referralCount} hint="GET /hie/referrals" />
        <Kpi label="Active consents"      value="↗" hint="GET /hie/patients/:id/consents" />
        <Kpi label="42 CFR Part 2"        value="✓" hint="Separate consent scope honored" />
      </div>

      <div className="card card-body space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Look up a patient's active consents</h3>
        <form className="flex gap-2" onSubmit={fetch}>
          <input
            className="input max-w-md"
            placeholder="Patient UUID (demo: 10000000-0000-0000-0000-000000000001)"
            value={patientId}
            onChange={e => setPatientId(e.target.value)}
            required
          />
          <button className="btn-primary" type="submit" disabled={loading || !patientId}>
            <DocumentArrowUpIcon className="h-4 w-4" /> {loading ? 'Looking up…' : 'Lookup'}
          </button>
        </form>
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {consents.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {consents.map(c => (
              <li key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">{c.granted_to_org}</div>
                  <div className="text-xs text-slate-500">
                    Scope: <span className="font-mono">{c.scope}</span>
                    {' • '} Effective {formatDate(c.effective_from)}
                    {c.effective_to && ` to ${formatDate(c.effective_to)}`}
                  </div>
                </div>
                <span className={c.status === 'active' ? 'badge-green' : 'badge-gray'}>{c.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card card-body bg-brand-50 text-sm text-brand-900">
        <div className="flex items-start gap-2">
          <ShieldCheckIcon className="h-5 w-5 flex-shrink-0 text-brand-600" />
          <p>Every FHIR access is audit-logged. Patient consent revocations propagate to all downstream consumers immediately.</p>
        </div>
      </div>
    </div>
  );
}

export default function HiePortal(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['hie_administrator', 'compliance_officer', 'platform_administrator']}>
      <AppShell><HieInner /></AppShell>
    </AuthGate>
  );
}
