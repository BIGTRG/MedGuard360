'use client';

import {
  AcademicCapIcon, ClipboardDocumentCheckIcon, UsersIcon, DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { Kpi } from '@/components/Kpi';

function SchoolInner(): React.ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
          <AcademicCapIcon className="h-5 w-5" /> School-Based Medicaid
        </h2>
        <p className="text-sm text-slate-500">
          IEP / 504-related Medicaid billing under 34 CFR 300.154 (LEA interagency agreements).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Active student records" value="—" hint="Once state_config flags enabled" />
        <Kpi label="IEP-eligible services" value="—" hint="Speech, OT, PT, psych" />
        <Kpi label="Claims submitted (30d)" value="—" hint="From reporting-service" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ActionCard icon={UsersIcon} title="Eligible students" subtitle="Roster with active IEPs / 504s" href="/school/students" />
        <ActionCard icon={ClipboardDocumentCheckIcon} title="Services log" subtitle="Document delivered services" href="/school/services" />
        <ActionCard icon={DocumentTextIcon} title="LEA agreement" subtitle="Interagency agreement status" href="/school/lea-agreement" />
        <ActionCard icon={AcademicCapIcon} title="Submit claims" subtitle="Batch claims to state Medicaid" href="/school/claims" />
      </div>

      <div className="card card-body bg-brand-50 text-sm text-brand-900">
        Per CLAUDE.md compliance section: school-based Medicaid is enabled per state in
        state_configs.school_based_medicaid_enabled. Phase 1 (NC/SC/GA) defaults to off
        until LEA agreements are confirmed.
      </div>
    </div>
  );
}

function ActionCard({ icon: Icon, title, subtitle, href }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; subtitle: string; href: string;
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

export default function SchoolPortal(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['school_administrator', 'platform_administrator']}>
      <AppShell><SchoolInner /></AppShell>
    </AuthGate>
  );
}
