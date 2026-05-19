'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/format';
import {
  HomeIcon,
  UsersIcon,
  DocumentTextIcon,
  ShieldExclamationIcon,
  ClipboardDocumentCheckIcon,
  ChartBarIcon,
  CogIcon,
  UserGroupIcon,
  TruckIcon,
  PhoneIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',    icon: HomeIcon },
  { href: '/patients',     label: 'Patients',     icon: UsersIcon },
  { href: '/providers',    label: 'Providers',    icon: UserGroupIcon },
  { href: '/claims',       label: 'Claims',       icon: DocumentTextIcon },
  { href: '/prior-auth',   label: 'Prior Auth',   icon: ClipboardDocumentCheckIcon },
  { href: '/credentialing',label: 'Credentialing',icon: BuildingOfficeIcon },
  { href: '/fraud',        label: 'Fraud Review', icon: ShieldExclamationIcon },
  { href: '/reporting',    label: 'Reports',      icon: ChartBarIcon },
  { href: '/hub',          label: 'Hub Calls',    icon: PhoneIcon },
  { href: '/nemt',         label: 'NEMT Trips',   icon: TruckIcon },
];

export function Sidebar(): React.ReactElement {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
          <span className="font-bold text-sm">MG</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-900">MedGuard360</span>
          <span className="text-xs text-slate-500">Fraud Prevention</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-700 hover:bg-slate-100',
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-3 py-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
        >
          <CogIcon className="h-5 w-5" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
