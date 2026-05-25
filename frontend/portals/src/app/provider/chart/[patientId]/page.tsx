'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ClipboardDocumentListIcon, BeakerIcon, ExclamationTriangleIcon,
  HeartIcon, ShieldCheckIcon, ChartBarSquareIcon, SparklesIcon, FireIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';

interface Chart {
  patientId: string;
  activeProblems: { icd10_code: string; problem_text: string; severity: string | null }[];
  activeMedications: { drug_name: string; dosage: string | null; frequency: string | null }[];
  activeAllergies:   { allergen_text: string; reaction_severity: string | null; reaction_text: string | null }[];
  immunizations:     { cvx_code: string; vaccine_name: string; administered_date: string }[];
  latestVitals: {
    recorded_at: string; systolic_bp: number | null; diastolic_bp: number | null;
    heart_rate: number | null; temperature_f: number | null; bmi: number | null;
    o2_saturation_pct: number | null;
  } | null;
  criticalLabs: { loinc_code: string; test_name: string; result_value: string | null; result_unit: string | null; abnormal_flag: string | null }[];
  labs:         { loinc_code: string; test_name: string; result_value: string | null; result_unit: string | null; resulted_at: string; abnormal_flag: string | null }[];
  imaging:      { modality: string; body_region: string; impression: string; study_date: string; critical_finding: boolean }[];
  carePlans:    { title: string; condition_icd10: string | null; status: string; next_review_date: string | null }[];
  smokingStatus: { status: string; recorded_at: string } | null;
}

interface CdsFiring {
  ruleKey: string; category: string; severity: 'info'|'warning'|'critical';
  ruleText: string; reason: string; source: string | null;
}

function Inner(): React.ReactElement {
  const { patientId } = useParams() as { patientId: string };
  const [chart, setChart] = useState<Chart | null>(null);
  const [firings, setFirings] = useState<CdsFiring[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api.get<Chart>(`/v1/clinical-doc/ehr/${patientId}`)
      .then(c => {
        setChart(c);
        return api.post<{ firings: CdsFiring[] }>(`/v1/clinical-doc/ehr/${patientId}/cds-fire`, {});
      })
      .then(r => setFirings(r.firings ?? []))
      .catch(e => setErr(e.message));
  }, [patientId]);

  if (err)   return <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-900">{err}</div>;
  if (!chart) return <div className="text-sm text-slate-500">Loading chart…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Patient Chart</h2>
        <p className="text-xs text-slate-500 font-mono mt-0.5">{patientId}</p>
      </div>

      {firings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 mb-2 font-semibold text-amber-900">
            <SparklesIcon className="h-5 w-5"/> Clinical Decision Support alerts ({firings.length})
          </div>
          <ul className="space-y-2 text-xs">
            {firings.map(f => (
              <li key={f.ruleKey} className="flex items-start gap-2">
                <span className={
                  f.severity === 'critical' ? 'badge-red' : f.severity === 'warning' ? 'badge-yellow' : 'badge-gray'
                }>{f.severity}</span>
                <div className="flex-1">
                  <div className="font-medium">{f.ruleText}</div>
                  <div className="text-amber-900 mt-0.5">{f.reason}</div>
                  {f.source && <div className="text-amber-700 text-[10px] mt-0.5">Source: {f.source}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card title="Active Problems" icon={ClipboardDocumentListIcon} n={chart.activeProblems.length}>
          {chart.activeProblems.length === 0 ? <Empty/> : (
            <ul className="text-xs space-y-1">
              {chart.activeProblems.map((p, i) => (
                <li key={i}><span className="font-mono text-slate-500">{p.icd10_code}</span> {p.problem_text} {p.severity && <span className="badge-gray text-[9px]">{p.severity}</span>}</li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Active Medications" icon={BeakerIcon} n={chart.activeMedications.length}>
          {chart.activeMedications.length === 0 ? <Empty/> : (
            <ul className="text-xs space-y-1">
              {chart.activeMedications.map((m, i) => (
                <li key={i}><strong>{m.drug_name}</strong>{m.dosage ? ` · ${m.dosage}` : ''}{m.frequency ? ` · ${m.frequency}` : ''}</li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Allergies" icon={ExclamationTriangleIcon} n={chart.activeAllergies.length}>
          {chart.activeAllergies.length === 0 ? <span className="text-xs text-slate-500">NKDA</span> : (
            <ul className="text-xs space-y-1">
              {chart.activeAllergies.map((a, i) => (
                <li key={i}><span className="font-medium">{a.allergen_text}</span>{a.reaction_text ? ` — ${a.reaction_text}` : ''} {a.reaction_severity && <span className="badge-red text-[9px]">{a.reaction_severity}</span>}</li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Latest Vitals" icon={HeartIcon}>
          {!chart.latestVitals ? <Empty/> : (
            <dl className="text-xs grid grid-cols-3 gap-y-1">
              {chart.latestVitals.systolic_bp && <Vital label="BP" v={`${chart.latestVitals.systolic_bp}/${chart.latestVitals.diastolic_bp}`}/>}
              {chart.latestVitals.heart_rate && <Vital label="HR" v={`${chart.latestVitals.heart_rate}`}/>}
              {chart.latestVitals.temperature_f && <Vital label="Temp" v={`${chart.latestVitals.temperature_f}°F`}/>}
              {chart.latestVitals.bmi && <Vital label="BMI" v={`${chart.latestVitals.bmi}`}/>}
              {chart.latestVitals.o2_saturation_pct && <Vital label="O₂" v={`${chart.latestVitals.o2_saturation_pct}%`}/>}
            </dl>
          )}
        </Card>

        <Card title="Critical Labs" icon={FireIcon} n={chart.criticalLabs.length}>
          {chart.criticalLabs.length === 0 ? <span className="text-xs text-slate-500">No critical values.</span> : (
            <ul className="text-xs space-y-1">
              {chart.criticalLabs.map((l, i) => (
                <li key={i}><strong>{l.test_name}</strong>: {l.result_value} {l.result_unit} <span className="badge-red text-[9px]">{l.abnormal_flag}</span></li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Immunizations" icon={ShieldCheckIcon} n={chart.immunizations.length}>
          {chart.immunizations.length === 0 ? <Empty/> : (
            <ul className="text-xs space-y-1">
              {chart.immunizations.slice(0, 8).map((v, i) => (
                <li key={i}><span className="font-mono text-slate-500">{v.cvx_code}</span> {v.vaccine_name} <span className="text-slate-500">{v.administered_date}</span></li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent Imaging" icon={ChartBarSquareIcon} n={chart.imaging.length}>
          {chart.imaging.length === 0 ? <Empty/> : (
            <ul className="text-xs space-y-1">
              {chart.imaging.slice(0, 6).map((i, idx) => (
                <li key={idx}><strong>{i.modality} {i.body_region}</strong> ({i.study_date.slice(0,10)}): {i.impression.slice(0, 80)}{i.critical_finding ? ' ⚠️' : ''}</li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Care Plans" icon={ClipboardDocumentListIcon} n={chart.carePlans.length}>
          {chart.carePlans.length === 0 ? <Empty/> : (
            <ul className="text-xs space-y-1">
              {chart.carePlans.map((p, i) => (
                <li key={i}><strong>{p.title}</strong>{p.condition_icd10 ? ` · ${p.condition_icd10}` : ''} <span className="badge-gray text-[9px]">{p.status}</span></li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <strong>EHR scope (ONC 2015 Cures Update):</strong> This chart view + the underlying
        endpoints (problems, medications, allergies, immunizations, vitals, labs, imaging,
        CDS) cover the <strong>core USCDI v3 data classes</strong>. Behavioral health
        assessments, OASIS-E (home health), IEP service logs (school-based), CCDA generation,
        FHIR R4 patient-access API, and CQM auto-calculation are scaffolded (see migrations
        0028/0029 + clinical-doc-service modules) but full ONC certification requires further
        completion + vendor cert testing.
      </div>
    </div>
  );
}

function Card({ title, icon: Icon, n, children }: { title: string; icon: typeof BeakerIcon; n?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Icon className="h-4 w-4"/>{title}</h3>
        {typeof n === 'number' && <span className="badge-gray text-[10px]">{n}</span>}
      </div>
      {children}
    </div>
  );
}
function Vital({ label, v }: { label: string; v: string }) {
  return <div><dt className="text-slate-500 text-[10px]">{label}</dt><dd className="font-medium">{v}</dd></div>;
}
function Empty() { return <span className="text-xs text-slate-500 italic">No records on file.</span>; }

export default function ChartPage(): React.ReactElement {
  return <AuthGate><AppShell><Inner /></AppShell></AuthGate>;
}
