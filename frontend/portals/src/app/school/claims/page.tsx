'use client';

import Link from 'next/link';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';

const BATCH = [
  { id: 'SB-2026-06-001', period: '2026-06-01 to 2026-06-15', lines: 42, amount: '$18,240.00', status: 'submitted' },
  { id: 'SB-2026-05-002', period: '2026-05-16 to 2026-05-31', lines: 38, amount: '$16,880.00', status: 'paid' },
];

export default function SchoolClaimsPage(): React.ReactElement {
  return (
    <AuthGate allowedRoles={['school_administrator', 'platform_administrator']}>
      <AppShell>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <CurrencyDollarIcon className="h-5 w-5" /> Submit claims
            </h2>
            <Link href="/school" className="text-sm text-brand-700 hover:underline">&larr; School home</Link>
          </div>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {BATCH.map(b => (
              <li key={b.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <div className="font-mono font-medium text-slate-800">{b.id}</div>
                  <div className="text-xs text-slate-500">{b.period} | {b.lines} service lines</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{b.amount}</div>
                  <span className={b.status === 'paid' ? 'badge-green' : 'badge-yellow'}>{b.status}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </AppShell>
    </AuthGate>
  );
}