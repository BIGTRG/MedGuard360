'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getCurrentClaims } from '@/lib/auth';

export default function DashboardGroupLayout({ children }: { children: React.ReactNode }): React.ReactElement | null {
  const router = useRouter();

  useEffect(() => {
    const claims = getCurrentClaims();
    if (!claims) router.replace('/login');
  }, [router]);

  return <>{children}</>;
}
