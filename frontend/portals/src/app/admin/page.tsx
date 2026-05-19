'use client';

import {
  ServerStackIcon, CpuChipIcon, UserGroupIcon, ShieldCheckIcon, MapIcon, Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

const SERVICES = [
  { name: 'auth-service',         port: 3001 },
  { name: 'provider-service',     port: 3002 },
  { name: 'credentialing-service',port: 3003 },
  { name: 'patient-service',      port: 3004 },
  { name: 'eligibility-service',  port: 3005 },
  { name: 'prior-auth-service',   port: 3006 },
  { name: 'clinical-doc-service', port: 3007 },
  { name: 'claims-service',       port: 3008 },
  { name: 'fraud-engine-service', port: 3009 },
  { name: 'denial-service',       port: 3010 },
  { name: 'pharmacy-service',     port: 3011 },
  { name: 'dme-service',          port: 3012 },
  { name: 'nemt-service',         port: 3013 },
  { name: 'crisis-service',       port: 3014 },
  { name: 'hub-service',          port: 3015 },
  { name: 'reporting-service',    port: 3016 },
  { name: 'notification-service', port: 3017 },
  { name: 'state-config-service', port: 3018 },
  { name: 'audit-log-service',    port: 3019 },
  { name: 'hie-service',          port: 3020 },
];
const ENGINES = [
  { name: 'speech-to-text',  port: 8001 },
  { name: 'clinical-nlp',    port: 8002 },
  { name: 'ocr-engine',      port: 8003 },
  { name: 'fraud-detection', port: 8004 },
  { name: 'fraud-ring-gnn',  port: 8005 },
  { name: 'pa-nlp-matcher',  port: 8006 },
  { name: 'denial-predictor',port: 8007 },
  { name: 'provider-monitor',port: 8008 },
  { name: 'crisis-detector', port: 8009 },
  { name: 'eligibility-intel',port:8010 },
];

function AdminInner(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Cog6ToothIcon className="h-5 w-5" /> Platform Administration
        </h2>
        <p className="text-sm text-slate-500">Cross-platform admin surface for the MedGuard360 stack.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SectionCard icon={UserGroupIcon} title="Users & Roles" subtitle="20 role types • RLS-scoped" href="/admin/users" />
        <SectionCard icon={MapIcon}       title="State Config"  subtitle="MMIS, MCOs, PA rules per state" href="/admin/state-config" />
        <SectionCard icon={ShieldCheckIcon} title="Audit Log"   subtitle="Append-only HIPAA event log" href="/admin/audit" />
      </div>

      <div className="card">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
          <ServerStackIcon className="h-4 w-4 text-slate-500" /> Services (20)
        </div>
        <div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(s => (
            <div key={s.name} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-xs">
              <span className="font-mono text-slate-700">{s.name}</span>
              <span className="text-slate-500">:{s.port}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700">
          <CpuChipIcon className="h-4 w-4 text-slate-500" /> AI Engines (10)
        </div>
        <div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-5">
          {ENGINES.map(e => (
            <div key={e.name} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-xs">
              <span className="font-mono text-slate-700">{e.name}</span>
              <span className="text-slate-500">:{e.port}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ icon: Icon, title, subtitle, href }: {
  icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string; href: string;
}): React.ReactElement {
  return (
    <a href={href} className="card card-body flex items-center gap-3 hover:border-brand-300 hover:shadow-md">
      <div className="rounded-lg bg-brand-50 p-2"><Icon className="h-5 w-5 text-brand-600" /></div>
      <div>
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="text-xs text-slate-500">{subtitle}</div>
      </div>
    </a>
  );
}

export default function AdminPortal(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['platform_administrator']}>
      <AppShell><AdminInner /></AppShell>
    </AuthGate>
  );
}
