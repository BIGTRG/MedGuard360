'use client';

import Link from 'next/link';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

const LOG = [
  { date: '2026-06-10', student: 'Jordan Lee', service: 'Speech therapy', minutes: 30, provider: 'Wake Speech LLC' },
  { date: '2026-06-11', student: 'Sam Rivera', service: 'Occupational therapy', minutes: 45, provider: 'Triangle OT' },
  { date: '2026-06-12', student: 'Jordan Lee', service: 'Psychological counseling', minutes: 60, provider: 'Dr. Demo Provider, MD' },
];

export default function SchoolServicesPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['school_administrator', 'platform_administrator']}>
      <AppShell>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <ClipboardDocumentCheckIcon className="h-5 w-5" /> Services log
            </h2>
            <Link href="/school" className="text-sm text-brand-700 hover:underline">&larr; School home</Link>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="px-3 py-2">Date</th><th>Student</th><th>Service</th><th>Minutes</th><th>Provider</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {LOG.map(row => (
                  <tr key={`${row.date}-${row.student}`} className="hover:bg-slate-50">
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
      </AppShell>
    </AuthGate>
  );
}