'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  MapIcon, BuildingOffice2Icon, CircleStackIcon, ChartBarIcon,
  CheckCircleIcon, XCircleIcon, ClockIcon, ShieldCheckIcon,
  ServerStackIcon, DocumentTextIcon, BookOpenIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { api } from '@/lib/api-client';

// ─────────────────────────────────────────────────────────────────────────────
// Types — match GET /api/v1/state-config/plans
// ─────────────────────────────────────────────────────────────────────────────

interface Plan {
  state_code: string;
  mco_name: string;
  plan_type: string | null;
  payer_id: string;
  launch_date: string | null;
  sunset_date: string | null;
  notes: string | null;
  active: boolean;
}

interface StateRow {
  state_code: string;
  state_name: string;
  mac_part_a_b: string | null;
  mac_dmepos: string | null;
  hie_name: string | null;
  hie_vendor: string | null;
  expansion_status: string | null;
  hub_phone_number: string | null;
  plans: Plan[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Static structural data — sourced from integrations/nc-enterprise/README.md
// ─────────────────────────────────────────────────────────────────────────────

interface Division {
  acronym: string;
  name: string;
  role: string;
  intersect: string;
}

const DIVISIONS: Division[] = [
  { acronym: 'DHB',      name: 'Division of Health Benefits',                role: 'Operates NC Medicaid + NC Health Choice (~3.1M)',                intersect: 'Primary integration target' },
  { acronym: 'DMHDDSUS', name: 'Mental Health / DD / SU Services',           role: 'Policy + LME/MCO oversight; Tailored Plan governance',           intersect: 'Tailored Plan engine; 42 CFR Part 2 consent' },
  { acronym: 'DPH',      name: 'Division of Public Health',                  role: 'Communicable disease, WIC, immunizations, vital records',         intersect: 'ELR / eCR feeds; death-match suppression' },
  { acronym: 'DCFW',     name: 'Child and Family Well-Being',                role: 'Birth-to-3 (CDSA), school BH, child Medicaid',                    intersect: 'EI / birth-to-3 billing; CFSP coordination' },
  { acronym: 'DSS',      name: 'Division of Social Services',                role: 'Medicaid eligibility intake, foster care, NEMT eligibility',      intersect: 'Eligibility verification; foster-care linkage' },
  { acronym: 'DHSR',     name: 'Health Service Regulation',                  role: 'Licenses all hospitals / NF / SNF / ACH / hospice / home health', intersect: 'Facility license verification (nc-dhsr connector)' },
  { acronym: 'OCPI',     name: 'Office of Compliance & Program Integrity (under DHB)', role: 'Pre/post-pay reviews, RAC, data analytics',          intersect: '⭐ Downstream consumer of fraud-engine alerts' },
  { acronym: 'NCID',     name: 'NC Identity (under DHHS-OCIO)',              role: 'Provider / staff identity federation',                            intersect: 'NCID SAML / OIDC into auth-service' },
  { acronym: 'OIA',      name: 'Office of Internal Audit',                   role: 'Department-level audit',                                          intersect: 'Audit findings feed fraud-engine retraining' },
];

const NCTRACKS_DOES: string[] = [
  'FFS claim adjudication (NC Medicaid Direct: ABD, duals, transitions)',
  'Encounter data ingestion (EPS) from all PHPs + PIHPs — 30-day SLA',
  'Provider Enrollment (PES) — required for FFS *and* managed-care providers (42 CFR 438.602(b))',
  'Pharmacy POS — NCPDP D.0 via OptumRx; Medicaid Drug Rebate',
  '270/271 eligibility verification — single source-of-truth, returns plan assignment',
  'NPI / taxonomy registry for the state',
  'EVV (Electronic Visit Verification) aggregation for HHCS + PCS (21st Century Cures)',
  'Cost-settlement for FQHC / RHC / LEA / public health departments',
];

const NCTRACKS_NOT: string[] = [
  'Managed-care PA workflows (each PHP/Tailored Plan runs its own UM — Carelon, NIA, AIM…)',
  'Managed-care claim adjudication (PHP pays provider; encounter follows within 30 days)',
  'Plan-specific provider directories / network adequacy attestations',
  'Member appeals / grievances at plan level (Medicaid Ombudsman is escalation)',
  'Medicare Advantage / Part D — out of scope entirely',
];

interface Connector {
  id: number;
  name: string;
  direction: 'in' | 'out' | 'both';
  transport: string;
  identity: string;
  status: 'live' | 'partial' | 'stub';
  spec: string;
}

const CONNECTORS: Connector[] = [
  { id: 1,  name: 'NCTracks — FFS claims',                  direction: 'both', transport: 'X12 837P/I/D, 835, 277CA via SFTP', identity: 'TPID + PGP',           status: 'stub',    spec: 'integrations/nctracks/' },
  { id: 2,  name: 'NCTracks — eligibility',                  direction: 'out',  transport: 'X12 270/271 + FHIR Coverage',         identity: 'mTLS + OAuth2',        status: 'stub',    spec: 'integrations/nctracks/' },
  { id: 3,  name: 'NCTracks — prior auth',                   direction: 'out',  transport: 'X12 278 + FHIR PAS',                  identity: 'OAuth2',               status: 'stub',    spec: 'integrations/nctracks/' },
  { id: 4,  name: 'NCTracks — PES (provider enrollment)',    direction: 'out',  transport: 'REST + SFTP roster',                  identity: 'API key + mTLS',       status: 'stub',    spec: 'integrations/nctracks/' },
  { id: 5,  name: 'NCTracks — encounters (EPS)',             direction: 'out',  transport: 'X12 837 EPS',                          identity: 'SFTP + PGP',           status: 'stub',    spec: 'integrations/nctracks/' },
  { id: 6,  name: 'Standard Plans (5 PHPs)',                 direction: 'both', transport: 'FHIR R4 + X12',                       identity: 'OAuth2 (per-plan)',     status: 'stub',    spec: 'integrations/nc-enterprise/' },
  { id: 7,  name: 'Tailored Plans (4 LME/MCOs)',             direction: 'both', transport: 'FHIR R4 + X12 + 42 CFR Part 2',       identity: 'OAuth2 + SMART',        status: 'stub',    spec: 'integrations/nc-enterprise/' },
  { id: 8,  name: 'CFSP — Healthy Blue Care Together',       direction: 'both', transport: 'FHIR R4 + X12',                       identity: 'OAuth2',                status: 'stub',    spec: 'integrations/nc-enterprise/' },
  { id: 9,  name: 'EBCI Tribal Option',                       direction: 'both', transport: 'FHIR R4 + X12',                       identity: 'OAuth2',                status: 'stub',    spec: 'integrations/nc-enterprise/' },
  { id: 10, name: 'Palmetto GBA JM (Medicare A/B)',           direction: 'out',  transport: 'X12 837 via EDI Gateway',             identity: 'Submitter ID + cert',   status: 'stub',    spec: 'integrations/cms/' },
  { id: 11, name: 'CGS JC (Medicare DMEPOS MAC)',             direction: 'out',  transport: 'X12 837P + CMN',                      identity: 'Submitter ID',          status: 'stub',    spec: 'integrations/cms/' },
  { id: 12, name: 'OptumRx (NC Medicaid PBM)',                direction: 'out',  transport: 'NCPDP D.0',                           identity: 'NCPDP BIN/PCN',         status: 'stub',    spec: 'integrations/nctracks/' },
  { id: 13, name: 'NC HealthConnex / NC HIEA',                direction: 'both', transport: 'FHIR R4 (Bulk), C-CDA, ADT HL7v2',   identity: 'OAuth2 + SMART',        status: 'stub',    spec: 'integrations/nc-enterprise/' },
  { id: 14, name: 'Acentra NC LIFTSS (CAP/C, CAP/DA)',        direction: 'both', transport: 'REST + flat-file',                    identity: 'API key',               status: 'stub',    spec: 'integrations/nc-enterprise/' },
  { id: 15, name: 'NEMT brokers (ModivCare / MTM)',           direction: 'both', transport: 'REST + 837P',                         identity: 'OAuth2',                status: 'stub',    spec: 'integrations/nemt-brokers/' },
  { id: 16, name: 'NC DHSR — facility licensure',             direction: 'in',   transport: 'CSV / REST',                           identity: 'API key',               status: 'stub',    spec: 'integrations/nc-dhsr/' },
  { id: 17, name: 'NC HIEA — ENS (ADT subscription)',         direction: 'in',   transport: 'HL7v2 ADT',                            identity: 'mTLS',                  status: 'stub',    spec: 'integrations/nc-enterprise/' },
  { id: 18, name: 'T-MSIS extract',                            direction: 'out',  transport: 'flat-file via state',                 identity: 'state-level',           status: 'stub',    spec: 'integrations/cms/' },
  { id: 19, name: 'OCPI fraud-alert forwarding',               direction: 'out',  transport: 'REST webhook + secure email',         identity: 'mTLS + OAuth2',         status: 'stub',    spec: 'integrations/nc-enterprise/' },
  { id: 20, name: 'NCID — provider / staff SSO',               direction: 'in',   transport: 'SAML 2.0 + OIDC',                     identity: 'federation',            status: 'stub',    spec: 'integrations/nc-enterprise/' },
  { id: 21, name: 'CMS Interop APIs (CMS-0057-F)',             direction: 'both', transport: 'FHIR R4 (4 APIs)',                    identity: 'SMART-on-FHIR',         status: 'stub',    spec: 'integrations/cms/' },
  { id: 22, name: 'NC SCHS — vital records (death match)',     direction: 'in',   transport: 'flat-file',                           identity: 'SFTP + PGP',            status: 'stub',    spec: 'integrations/nc-enterprise/' },
  { id: 23, name: 'Biometric device gateway',                  direction: 'in',   transport: 'proprietary + REST',                  identity: 'device cert + mTLS',    status: 'partial', spec: 'integrations/nc-enterprise/' },
];

type ReadinessStatus = 'done' | 'in_progress' | 'todo';

interface ReadinessItem {
  category: 'BAA' | 'Cert' | 'Security' | 'Connector';
  item: string;
  status: ReadinessStatus;
  notes?: string;
}

const READINESS: ReadinessItem[] = [
  // Contracts / BAAs
  { category: 'BAA', item: 'NC DHHS / DHB',                                       status: 'todo' },
  { category: 'BAA', item: 'Gainwell (NCTracks operator)',                        status: 'todo' },
  { category: 'BAA', item: 'Optum (PDM/CVO incoming 2026)',                       status: 'todo' },
  { category: 'BAA', item: 'Standard Plans (5) — AmeriHealth, CCH, Healthy Blue, UHC, WellCare', status: 'todo' },
  { category: 'BAA', item: 'Tailored Plans (4) — Alliance, Partners, Trillium, Vaya',            status: 'todo' },
  { category: 'BAA', item: 'CFSP — Healthy Blue Care Together',                                  status: 'todo' },
  { category: 'BAA', item: 'EBCI Tribal Option (with IHCIA carve-outs)',                          status: 'todo' },
  { category: 'BAA', item: 'OptumRx',                                                              status: 'todo' },
  { category: 'BAA', item: 'NC HIEA — participation agreement',                                   status: 'todo' },
  { category: 'BAA', item: 'NEMT brokers (ModivCare, MTM)',                                       status: 'todo' },
  { category: 'BAA', item: '42 CFR Part 2 QSOA — SUD data handling',                              status: 'todo' },
  // Certifications
  { category: 'Cert', item: 'HITRUST CSF r2',                                                      status: 'todo', notes: 'Preferred over SOC 2 alone for state Medicaid procurements' },
  { category: 'Cert', item: 'SOC 2 Type II (annual)',                                              status: 'todo' },
  { category: 'Cert', item: 'NIST 800-53 Rev 5 — Moderate baseline (High for federal CMS data)',  status: 'todo' },
  { category: 'Cert', item: 'StateRAMP (Moderate)',                                                status: 'todo' },
  { category: 'Cert', item: 'FedRAMP Moderate — required if hosting federal data',                 status: 'todo' },
  { category: 'Cert', item: 'CMS MARS-E 2.2 — FTI handling',                                       status: 'todo' },
  { category: 'Cert', item: 'CMS MITA 3.0 self-assessment (Level 3+)',                              status: 'todo' },
  { category: 'Cert', item: 'CMS Streamlined Modular Certification (SMC) — MMIS modules',          status: 'todo' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function expansionBadge(s: string | null): React.ReactElement {
  if (s === 'expanded')      return <span className="badge-green">Expanded (Dec 2023)</span>;
  if (s === 'partial')        return <span className="badge-yellow">Partial</span>;
  if (s === 'non_expanded')   return <span className="badge-gray">Non-expansion</span>;
  return <span className="badge-gray">{s ?? 'unknown'}</span>;
}

function connectorBadge(s: Connector['status']): React.ReactElement {
  if (s === 'live')    return <span className="badge-green">live</span>;
  if (s === 'partial') return <span className="badge-yellow">partial</span>;
  return <span className="badge-gray">stub</span>;
}

function directionLabel(d: Connector['direction']): string {
  return d === 'both' ? '↔' : d === 'out' ? '→' : '←';
}

function readinessIcon(s: ReadinessStatus): React.ReactElement {
  if (s === 'done')        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
  if (s === 'in_progress') return <ClockIcon       className="h-4 w-4 text-amber-600" />;
  return <XCircleIcon className="h-4 w-4 text-slate-300" />;
}

function groupPlans(plans: Plan[]): { standard: Plan[]; tailored: Plan[]; specialty: Plan[] } {
  const standard:  Plan[] = [];
  const tailored:  Plan[] = [];
  const specialty: Plan[] = [];
  for (const p of plans) {
    const t = (p.plan_type ?? '').toLowerCase();
    if (t === 'standard' || t === 'php')        standard.push(p);
    else if (t === 'tailored' || t === 'lme')   tailored.push(p);
    else                                          specialty.push(p);
  }
  return { standard, tailored, specialty };
}

function PlanStatusChip({ p }: { p: Plan }): React.ReactElement {
  if (!p.active && p.sunset_date && new Date(p.sunset_date) < new Date()) {
    return <span className="badge-gray">sunset {p.sunset_date.slice(0, 7)}</span>;
  }
  if (p.launch_date && new Date(p.launch_date) > new Date()) {
    return <span className="badge-yellow">launching {p.launch_date.slice(0, 7)}</span>;
  }
  return <span className="badge-green">active</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Header(): React.ReactElement {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <MapIcon className="h-5 w-5" /> NC Enterprise Landscape
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Phase-1 primary pilot state. Detailed reference in{' '}
          <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">integrations/nc-enterprise/README.md</code>.
        </p>
      </div>
      <span className="text-xs text-slate-500">Last verified: 2026-05-22</span>
    </div>
  );
}

function KpiStrip({ nc }: { nc: StateRow | null }): React.ReactElement {
  const planCount = nc?.plans.length ?? 0;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <KpiTile label="Total enrollment"            value="~3.1M"      sub="incl. ~600K expansion" />
      <KpiTile label="Expansion status"             value="Yes"        sub="effective 2023-12-01" />
      <KpiTile label="Managed-care plans seeded"    value={String(planCount)} sub="Std + Tailored + CFSP + EBCI" />
      <KpiTile label="Enrolled providers"           value="~114K"      sub="FY2025 OCPI report" />
    </div>
  );
}

function KpiTile({ label, value, sub }: { label: string; value: string; sub?: string }): React.ReactElement {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-2xl font-semibold text-slate-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function StateDetailsCard({ nc }: { nc: StateRow }): React.ReactElement {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-900">{nc.state_name} ({nc.state_code})</h3>
        {expansionBadge(nc.expansion_status)}
      </div>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-xs">
        <Fact label="Medicare A/B MAC" value={nc.mac_part_a_b} />
        <Fact label="DMEPOS MAC"        value={nc.mac_dmepos} />
        <Fact label="HIE"               value={nc.hie_name} />
        <Fact label="HIE vendor"        value={nc.hie_vendor} />
        <Fact label="Hub phone"         value={nc.hub_phone_number} />
        <Fact label="Statutory root"    value="NCGS Ch. 108A" />
        <Fact label="MMIS operator"     value="Gainwell (Optum 2026)" />
        <Fact label="MFCU"              value="NC DOJ MID" />
      </dl>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string | null }): React.ReactElement {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value ?? '—'}</dd>
    </div>
  );
}

function DivisionsSection(): React.ReactElement {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-3">
        <BuildingOffice2Icon className="h-5 w-5" /> Operationally relevant NC DHHS divisions
      </h3>
      <p className="text-xs text-slate-500 mb-3">
        NC DHHS publishes 33 divisions/offices across 6 service areas. This is the operational subset
        MedGuard360 touches. Full org chart:{' '}
        <a className="text-brand-700 hover:underline" href="https://www.ncdhhs.gov/dhhs-orgchart" target="_blank" rel="noreferrer">ncdhhs.gov/dhhs-orgchart</a>.
      </p>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2 px-3 w-1/12">Code</th>
            <th className="py-2 px-3 w-1/4">Name</th>
            <th className="py-2 px-3 w-2/5">Role</th>
            <th className="py-2 px-3 w-1/3">MedGuard360 intersection</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {DIVISIONS.map(d => (
            <tr key={d.acronym} className="hover:bg-slate-50">
              <td className="py-2 px-3 font-mono text-xs font-semibold text-slate-800">{d.acronym}</td>
              <td className="py-2 px-3 text-slate-900">{d.name}</td>
              <td className="py-2 px-3 text-slate-700">{d.role}</td>
              <td className="py-2 px-3 text-slate-700">{d.intersect}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HealthPlans({ nc }: { nc: StateRow }): React.ReactElement {
  const groups = useMemo(() => groupPlans(nc.plans), [nc.plans]);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-3">
        <ChartBarIcon className="h-5 w-5" /> Health Plans (live)
      </h3>
      <p className="text-xs text-slate-500 mb-3">
        From <code>mco_registry</code>. NC Managed Care launched 2021-07-01 (Standard Plans);
        Tailored Plans launched 2024-07-01.
      </p>
      <PlanGroupTable title="Standard Plans (PHP)" rows={groups.standard} emptyMsg="No Standard Plans seeded." />
      <PlanGroupTable title="Tailored Plans (LME/MCO)" rows={groups.tailored} emptyMsg="No Tailored Plans seeded." />
      <PlanGroupTable title="Specialty / Other" rows={groups.specialty} emptyMsg="No specialty plans seeded." />
    </div>
  );
}

function PlanGroupTable({ title, rows, emptyMsg }: { title: string; rows: Plan[]; emptyMsg: string }): React.ReactElement {
  return (
    <div className="mt-4 first:mt-0">
      <div className="text-xs font-semibold uppercase text-slate-500 mb-1">{title} <span className="text-slate-400 font-normal">· {rows.length}</span></div>
      {rows.length === 0 ? (
        <div className="text-xs text-slate-400 italic px-3 py-2">{emptyMsg}</div>
      ) : (
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left uppercase text-slate-500">
            <tr>
              <th className="py-2 px-3 w-2/5">Plan</th>
              <th className="py-2 px-3 w-1/6">Payer ID</th>
              <th className="py-2 px-3 w-1/6">Status</th>
              <th className="py-2 px-3 w-1/3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(p => (
              <tr key={p.payer_id} className="hover:bg-slate-50">
                <td className="py-2 px-3 font-medium text-slate-900">{p.mco_name}</td>
                <td className="py-2 px-3 font-mono text-slate-700">{p.payer_id}</td>
                <td className="py-2 px-3"><PlanStatusChip p={p} /></td>
                <td className="py-2 px-3 text-slate-600">{p.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function NcTracksScope(): React.ReactElement {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-3">
        <ServerStackIcon className="h-5 w-5" /> NCTracks scope
      </h3>
      <p className="text-xs text-slate-500 mb-3">
        Operator: Gainwell. Provider Data Management / CVO replacement awarded to Optum
        (launch anticipated 2026). What the MMIS handles vs. what each managed-care plan owns:
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-green-200 bg-green-50/50 p-3">
          <div className="text-xs font-semibold uppercase text-green-800 mb-2 flex items-center gap-1">
            <CheckCircleIcon className="h-4 w-4" /> NCTracks DOES handle
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700">
            {NCTRACKS_DOES.map(s => <li key={s} className="flex gap-2"><span className="text-green-600">✓</span><span>{s}</span></li>)}
          </ul>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50/50 p-3">
          <div className="text-xs font-semibold uppercase text-slate-700 mb-2 flex items-center gap-1">
            <XCircleIcon className="h-4 w-4" /> NCTracks DOES NOT handle
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700">
            {NCTRACKS_NOT.map(s => <li key={s} className="flex gap-2"><span className="text-slate-400">✗</span><span>{s}</span></li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ConnectorInventory(): React.ReactElement {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 mb-3">
        <CircleStackIcon className="h-5 w-5" /> NC connector inventory <span className="text-slate-400 text-sm font-normal">· {CONNECTORS.length}</span>
      </h3>
      <p className="text-xs text-slate-500 mb-3">
        Counterparties this state-pilot touches. Click any row for direction. All currently in stub mode
        — flip to live by setting the per-adapter <code>*_MODE</code> env var on the relevant service.
      </p>
      <table className="w-full text-sm table-fixed">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2 px-3 w-8 text-center">#</th>
            <th className="py-2 px-3 w-2/5">Counterparty</th>
            <th className="py-2 px-3 w-1/4">Transport</th>
            <th className="py-2 px-3 w-1/6">Identity</th>
            <th className="py-2 px-3 w-1/12">Status</th>
            <th className="py-2 px-3 w-12 text-center" title="Direction">Dir</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {CONNECTORS.map(c => (
            <Fragment key={c.id}>
              <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                <td className="py-2 px-3 text-center text-xs text-slate-400 font-mono">{c.id}</td>
                <td className="py-2 px-3 font-medium text-slate-900">{c.name}</td>
                <td className="py-2 px-3 text-slate-700">{c.transport}</td>
                <td className="py-2 px-3 text-slate-700">{c.identity}</td>
                <td className="py-2 px-3">{connectorBadge(c.status)}</td>
                <td className="py-2 px-3 text-center text-base text-slate-500">{directionLabel(c.direction)}</td>
              </tr>
              {expanded === c.id && (
                <tr className="bg-slate-50">
                  <td colSpan={6} className="py-2 px-6">
                    <div className="text-xs text-slate-600">
                      Direction: <strong>{c.direction === 'both' ? 'bidirectional' : c.direction === 'out' ? 'outbound (MedGuard → counterparty)' : 'inbound (counterparty → MedGuard)'}</strong>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Spec lives at <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">{c.spec}</code>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PilotReadiness(): React.ReactElement {
  const grouped: Record<ReadinessItem['category'], ReadinessItem[]> = {
    BAA: [], Cert: [], Security: [], Connector: [],
  };
  for (const r of READINESS) grouped[r.category].push(r);
  const totalDone = READINESS.filter(r => r.status === 'done').length;
  const totalInProgress = READINESS.filter(r => r.status === 'in_progress').length;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <ShieldCheckIcon className="h-5 w-5" /> NC pilot readiness
        </h3>
        <div className="text-xs text-slate-500">
          {totalDone} done · {totalInProgress} in progress · {READINESS.length - totalDone - totalInProgress} pending
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Production-grade statewide rollout requires every box checked. Source:{' '}
        <code className="text-xs">integrations/nc-enterprise/README.md §12</code>.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <ReadinessColumn title="Contracts / BAAs" items={grouped.BAA} />
        <ReadinessColumn title="Certifications" items={grouped.Cert} />
      </div>
    </div>
  );
}

function ReadinessColumn({ title, items }: { title: string; items: ReadinessItem[] }): React.ReactElement {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-slate-500 mb-2">{title}</div>
      <ul className="space-y-1.5">
        {items.map(r => (
          <li key={r.item} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5 flex-shrink-0">{readinessIcon(r.status)}</span>
            <span className="flex-1">
              <span className={r.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-800'}>{r.item}</span>
              {r.notes && <span className="block text-slate-500 italic">{r.notes}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuickLinks(): React.ReactElement {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
      <div className="flex items-center gap-2 font-semibold text-slate-800 mb-2">
        <BookOpenIcon className="h-4 w-4" /> Source documents
      </div>
      <ul className="space-y-1">
        <li>• <code className="font-mono">integrations/nc-enterprise/README.md</code> — full enterprise landscape</li>
        <li>• <code className="font-mono">integrations/nctracks/README.md</code> + <code className="font-mono">spec.md</code> — adapter spec</li>
        <li>• <code className="font-mono">integrations/nc-dhsr/</code> — facility licensure</li>
        <li>• <code className="font-mono">integrations/nemt-brokers/</code> — ModivCare / MTM adapters</li>
        <li>• <code className="font-mono">integrations/cms/</code> — CMS Interop + NPPES + LEIE + SAM</li>
        <li>• <code className="font-mono">integrations/PILOT-STATES-COMPARISON.md</code> — NC vs SC vs GA delta</li>
      </ul>
    </div>
  );
}

function ErrorPane({ msg }: { msg: string }): React.ReactElement {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-900">{msg}</div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

function NcEnterpriseInner(): React.ReactElement {
  const [nc, setNc] = useState<StateRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ states: StateRow[] }>('/v1/state-config/plans')
      .then(r => {
        const found = r.states.find(s => s.state_code === 'NC');
        if (!found) {
          setErr('NC not found in state_configs. Has the database been seeded? (See deploy/seed-e2e.sql)');
        } else {
          setNc(found);
        }
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <Header />
      <KpiStrip nc={nc} />
      {err && <ErrorPane msg={err} />}
      {loading && !err && <div className="text-sm text-slate-500">Loading state config…</div>}
      {nc && <StateDetailsCard nc={nc} />}
      <DivisionsSection />
      {nc && <HealthPlans nc={nc} />}
      <NcTracksScope />
      <ConnectorInventory />
      <PilotReadiness />
      <QuickLinks />
    </div>
  );
}

export default function NcEnterprisePage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['platform_administrator']}>
      <AppShell>
        <NcEnterpriseInner />
      </AppShell>
    </AuthGate>
  );
}

// Heroicon import-tree linter pacifier
void DocumentTextIcon;
