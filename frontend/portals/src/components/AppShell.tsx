'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArrowRightOnRectangleIcon, FingerPrintIcon, BellAlertIcon,
} from '@heroicons/react/24/outline';
import { logout } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';
import { cn } from '@/lib/format';
import { PORTAL_TITLE, navForRole } from '@/lib/nav-config';
import type { AuthClaims } from '@/lib/types';

export function AppShell({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const [claims, setClaims] = useState<AuthClaims | null>(null);

  useEffect(() => { setClaims(getCurrentClaims()); }, [pathname]);

  if (!claims) {
    return <div className="flex h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
  }

  const title = PORTAL_TITLE[claims.role];
  const items = navForRole(claims.role);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <span className="font-bold">M</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">MedGuard360</span>
            <span className="text-xs text-slate-500">{title}</span>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href} href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
                  active ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100',
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <button
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={async () => { await logout(); router.push('/login'); }}
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <h1 className="text-base font-semibold text-slate-900">{title}</h1>
          <div className="flex items-center gap-3">
            {!claims.biometricVerified && (
              <Link href="/biometric" className="badge-yellow">
                <FingerPrintIcon className="mr-1 h-3.5 w-3.5" />
                Biometric required
              </Link>
            )}
            <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100" title="Alerts">
              <BellAlertIcon className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-xs">
              <span className="font-medium text-slate-700">{claims.email}</span>
              {claims.stateCode && <span className="badge-gray">{claims.stateCode}</span>}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-slate-50 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
