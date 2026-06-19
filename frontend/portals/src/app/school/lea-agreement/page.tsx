'use client';

import Link from 'next/link';
import { DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

export default function SchoolLeaAgreementPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['school_administrator', 'platform_administrator']}>
      <AppShell>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <DocumentTextIcon className="h-5 w-5" /> LEA interagency agreement
            </h2>
            <Link href="/school" className="text-sm text-brand-700 hover:underline">&larr; School home</Link>
          </div>
          <div className="card card-body space-y-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircleIcon className="h-5 w-5" />
              <span className="font-medium">Active - Wake County Public Schools / NC Medicaid</span>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Effective</dt><dd>2026-01-01</dd></div>
              <div><dt className="text-slate-500">Renewal</dt><dd>2027-06-30</dd></div>
              <div><dt className="text-slate-500">Billing entity</dt><dd>Wake County LEA</dd></div>
              <div><dt className="text-slate-500">MAC routing</dt><dd>Palmetto GBA JM (Part B)</dd></div>
            </dl>
            <p className="text-xs text-slate-500">
              34 CFR 300.154 - Medicaid is payor of last resort; LEA maintains primary responsibility documentation.
            </p>
          </div>
        </div>
      </AppShell>
    </AuthGate>
  );
}