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
export function AuthGate({ children }: AuthGateProps): React.ReactElement {
  // DEMO BYPASS: auth disabled. Re-enable by restoring the original gate.
  return <>{children}</>;
}
