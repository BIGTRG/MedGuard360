'use client';

import { useRouter } from 'next/navigation';
import { BellAlertIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { logout } from '@/lib/api-client';
import { getCurrentClaims } from '@/lib/auth';

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps): React.ReactElement {
  const router = useRouter();
  const claims = getCurrentClaims();

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-base font-semibold text-slate-900">{title}</h1>
      <div className="flex items-center gap-3">
        <button
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 transition"
          title="Alerts"
        >
          <BellAlertIcon className="h-5 w-5" />
        </button>
        {claims && (
          <div className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-xs">
            <span className="font-medium text-slate-700">{claims.email}</span>
            {claims.stateCode && (
              <span className="badge-gray">{claims.stateCode}</span>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-md p-2 text-slate-500 hover:bg-slate-100 transition"
          title="Sign out"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
