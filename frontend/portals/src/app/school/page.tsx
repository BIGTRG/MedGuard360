'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AcademicCapIcon, ClipboardDocumentCheckIcon, CurrencyDollarIcon,
  DocumentTextIcon, CheckCircleIcon, UsersIcon,
} from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { Kpi } from '@/components/Kpi';

const STUDENTS = [
  { name: 'Jordan Lee', grade: '9', iep: true, medicaid: 'NCMD00100005' },
  { name: 'Sam Rivera', grade: '11', iep: true, medicaid: 'NCMD00100005' },
  { name: 'Taylor Brooks', grade: '7', iep: false, medicaid: 'NCMD00100005' },
];

const SERVICES = [
  { date: '2026-06-10', student: 'Jordan Lee', service: 'Speech therapy', minutes: 30, provider: 'Wake Speech LLC' },
  { date: '2026-06-11', student: 'Sam Rivera', service: 'Occupational therapy', minutes: 45, provider: 'Triangle OT' },
  { date: '2026-06-12', student: 'Jordan Lee', service: 'Psychological counseling', minutes: 60, provider: 'Dr. Demo Provider, MD' },
];

const CLAIMS = [
  { id: 'SB-2026-06-001', period: '2026-06-01 to 2026-06-15', lines: 42, amount: '$18,240.00', status: 'submitted' },
  { id: 'SB-2026-05-002', period: '2026-05-16 to 2026-05-31', lines: 38, amount: '$16,880.00', status: 'paid' },
];

function SectionHome(): React.ReactElement {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Active student records" value="3" hint="Wake County LEA demo roster" />
        <Kpi label="IEP-eligible services" value="3" hint="Speech, OT, psych" />
        <Kpi label="Claims submitted (30d)" value="2" hint="School-based Medicaid batches" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ActionCard icon={UsersIcon} title="Eligible students" subtitle="Roster with active IEPs / 504s" href="/school/students" />
        <ActionCard icon={ClipboardDocumentCheckIcon} title="Services log" subtitle="Document delivered services" href="/school/services" />
        <ActionCard icon={DocumentTextIcon} title="LEA agreement" subtitle="Interagency agreement status" href="/school/lea-agreement" />
        <ActionCard icon={AcademicCapIcon} title="Submit claims" subtitle="Batch claims to state Medicaid" href="/school/claims" />
      </div>
    </>
  );
}

function SchoolInner(): React.ReactElement {
  const section = useSearchParams().get('section');

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

      {section === 'students' && (
        <div className="space-y-4">
          <BackHome title="Eligible students" icon={UsersIcon} />
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {STUDENTS.map(s => (
              <li key={s.name} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-medium text-slate-800">{s.name}</div>
                  <div className="text-xs text-slate-500">Grade {s.grade} | Medicaid {s.medicaid}</div>
                </div>
                <span className={s.iep ? 'badge-green' : 'badge-gray'}>{s.iep ? 'Active IEP' : '504 plan'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {section === 'services' && (
        <div className="space-y-4">
          <BackHome title="Services log" icon={ClipboardDocumentCheckIcon} />
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="px-3 py-2">Date</th><th>Student</th><th>Service</th><th>Minutes</th><th>Provider</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SERVICES.map(row => (
                  <tr key={`${row.date}-${row.student}`}>
                    <td className="px-3 py-2">{row.date}</td>
                    <td>{row.student}</td>
                    <td>{row.service}</td>
                    <td>{row.minutes}</td>
                    <td>{row.provider}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'lea-agreement' && (
        <div className="space-y-4">
          <BackHome title="LEA interagency agreement" icon={DocumentTextIcon} />
          <div className="card card-body space-y-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircleIcon className="h-5 w-5" />
              <span className="font-medium">Active - Wake County Public Schools / NC Medicaid</span>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Effective</dt><dd>2026-01-01</dd></div>
              <div><dt className="text-slate-500">Renewal</dt><dd>2027-06-30</dd></div>
            </dl>
          </div>
        </div>
      )}

      {section === 'claims' && (
        <div className="space-y-4">
          <BackHome title="Submit claims" icon={CurrencyDollarIcon} />
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {CLAIMS.map(b => (
              <li key={b.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-mono font-medium">{b.id}</div>
                  <div className="text-xs text-slate-500">{b.period} | {b.lines} lines</div>
                </div>
                <span className={b.status === 'paid' ? 'badge-green' : 'badge-yellow'}>{b.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!section && <SectionHome />}

      <div className="card card-body bg-brand-50 text-sm text-brand-900">
        Wake County LEA demo data. Live NCTracks LEA adapter ships with pilot credential rotation.
      </div>
    </div>
  );
}

function BackHome({ title, icon: Icon }: { title: string; icon: React.ComponentType<{ className?: string }> }): React.ReactElement {
  return (
    <div className="flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <Icon className="h-5 w-5" /> {title}
      </h3>
      <Link href="/school" className="text-sm text-brand-700 hover:underline">&larr; School home</Link>
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
