'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentClaims } from '@/lib/auth';
import type { AuthClaims, UserRole } from '@/lib/types';

interface AuthGateProps {
  children: React.ReactNode;
  /** If set, only users with one of these roles can view; others bounce to /. */
  allowedRoles?: UserRole[];
}

/**
 * Client-side route gate.
 *
 * Reads the JWT claims from sessionStorage. If missing → redirect to /login.
 * If the user's role isn't in the optional allow-list → redirect to /.
 *
 * The Next.js edge middleware (src/middleware.ts) is the server-side first
 * line; this gate is defense-in-depth for client-only nav.
 */
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
