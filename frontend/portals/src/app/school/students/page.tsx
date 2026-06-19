'use client';

import Link from 'next/link';
import { AcademicCapIcon, UsersIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

const DEMO_STUDENTS = [
  { name: 'Jordan Lee', grade: '9', iep: true, medicaid: 'NCMD00100005' },
  { name: 'Sam Rivera', grade: '11', iep: true, medicaid: 'NCMD00100005' },
  { name: 'Taylor Brooks', grade: '7', iep: false, medicaid: 'NCMD00100005' },
];

export default function SchoolStudentsPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['school_administrator', 'platform_administrator']}>
      <AppShell>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <UsersIcon className="h-5 w-5" /> Eligible students
            </h2>
            <Link href="/school" className="text-sm text-brand-700 hover:underline">&larr; School home</Link>
          </div>
          <p className="text-sm text-slate-500">Wake County LEA - IEP/504 roster for school-based Medicaid billing.</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {DEMO_STUDENTS.map(s => (
              <li key={s.name} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-medium text-slate-800">{s.name}</div>
                  <div className="text-xs text-slate-500">Grade {s.grade} | Medicaid {s.medicaid}</div>
                </div>
                <span className={s.iep ? 'badge-green' : 'badge-gray'}>{s.iep ? 'Active IEP' : '504 plan'}</span>
              </li>
            ))}
          </ul>
          <div className="card card-body bg-brand-50 text-sm text-brand-900 flex gap-2">
            <AcademicCapIcon className="h-5 w-5 flex-shrink-0" />
            <p>Seeded demo roster - live MMIS enrollment sync ships with NCTracks LEA adapter.</p>
          </div>
        </div>
      </AppShell>
    </AuthGate>
  );
}