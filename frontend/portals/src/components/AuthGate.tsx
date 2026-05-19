'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentClaims } from '@/lib/auth';
import type { AuthClaims, UserRole } from '@/lib/types';

interface AuthGateProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];   // if set, gate the page; otherwise just require login
}

/** Client-side route gate. Redirects to /login when not authenticated or
 *  when the user's role isn't in the allow-list. */
export function AuthGate({ children, allowedRoles }: AuthGateProps): React.ReactElement | null {
  const router = useRouter();
  const [claims, setClaims] = useState<AuthClaims | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const c = getCurrentClaims();
    if (!c) {
      router.replace('/login');
      return;
    }
    if (allowedRoles && !allowedRoles.includes(c.role)) {
      router.replace('/');
      return;
    }
    setClaims(c);
    setReady(true);
  }, [router, allowedRoles]);

  if (!ready || !claims) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    );
  }
  return <>{children}</>;
}
