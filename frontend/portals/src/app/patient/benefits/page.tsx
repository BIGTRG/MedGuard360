'use client';
import { useEffect, useState } from 'react';
import { IdentificationIcon, HeartIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';

interface Coverage {
  active: boolean; plan_name: string; payer_id: string;
  effective_from: string; effective_to: string | null;
}
interface Patient {
  id: string; first_name: string; last_name: string; medicaid_id: string;
  medicare_beneficiary_id?: string;
  dual_eligible?: boolean; dual_eligible_category?: string;
  dsnp_plan_payer_id?: string; integrated_member_id?: string;
}

function Inner(): React.ReactElement {
  const [pat, setPat] = useState<Patient | null>(null);
  const [coverages, setCoverages] = useState<Coverage[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Patient>('/v1/patient/me'),
      api.get<{ coverages: Coverage[] }>('/v1/patient/me/coverages'),
    ])
    .then(([p, c]) => { setPat(p); setCoverages(c.coverages ?? []); })
    .catch(e => setErr(e.message));
  }, []);

  if (err) return <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-900">{err}</div>;
  if (!pat) return <div className="text-sm text-slate-500">Loading…</div>;

  // Unified D-SNP view for dual-eligible members; otherwise show separate tabs.
  if (pat.dual_eligible) {
    return (
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><IdentificationIcon className="h-5 w-5"/> My Benefits — D-SNP</h2>

        <div className="rounded-lg bg-gradient-to-br from-brand-700 to-brand-900 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase opacity-70">MedGuard360 Integrated Member Card</div>
              <div className="text-2xl font-bold mt-1">{pat.first_name} {pat.last_name}</div>
              <div className="text-sm opacity-90 mt-2">Member ID: <span className="font-mono">{pat.integrated_member_id ?? `MG-${pat.id.slice(0,8)}`}</span></div>
              <div className="text-xs opacity-70 mt-1">Medicare + Medicaid — Dual Special Needs Plan</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase opacity-70">Status</div>
              <div className="text-sm mt-1">{pat.dual_eligible_category ?? 'FBDE'}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card title="Medicaid coverage">
            <Row label="Plan" v={coverages.find(c => c.payer_id?.includes('MEDICAID'))?.plan_name ?? '—'} />
            <Row label="Effective" v={coverages.find(c => c.payer_id?.includes('MEDICAID'))?.effective_from ?? '—'} />
          </Card>
          <Card title="Medicare coverage">
            <Row label="Plan" v={pat.dsnp_plan_payer_id ?? '—'} />
            <Row label="Beneficiary ID" v={pat.medicare_beneficiary_id ?? '—'} mono />
          </Card>
        </div>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <strong>Unified benefits.</strong> As a dual-eligible member, your Medicare and Medicaid
          benefits show in one place — no separate logins. Your single integrated Health Risk
          Assessment covers both payers' required domains.
        </div>
      </div>
    );
  }

  // Standard non-dual benefits page
  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><HeartIcon className="h-5 w-5"/> My Benefits</h2>
      <ul className="space-y-2">
        {coverages.map((c, i) => (
          <li key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="font-semibold">{c.plan_name}</div>
            <div className="text-xs text-slate-500 mt-1">{c.payer_id} · effective {c.effective_from}{c.effective_to ? ` — ${c.effective_to}` : ''}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold mb-2">{title}</h3>{children}</div>;
}
function Row({ label, v, mono }: { label: string; v: string; mono?: boolean }) {
  return <div className="flex justify-between text-xs py-1"><span className="text-slate-500">{label}</span><span className={'font-medium ' + (mono ? 'font-mono' : '')}>{v}</span></div>;
}

export default function BenefitsPage(): React.ReactElement {
  return <AuthGate><AppShell><Inner /></AppShell></AuthGate>;
}
