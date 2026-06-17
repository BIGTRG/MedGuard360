'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import { AppShell } from '@/components/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { login } from '@/lib/api-client';
import { homePathForRole, saveTokens, getCurrentClaims } from '@/lib/auth';
import { DEMO_PASSWORD, DEMO_USERS } from '@/lib/demo-users';

export default function AdminUsersPage(): React.ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const signInAs = async (email: string): Promise<void> => {
    setBusy(email);
    try {
      const tokens = await login(email, DEMO_PASSWORD);
      saveTokens(tokens);
      const claims = getCurrentClaims();
      if (!claims) throw new Error('Invalid token');
      router.replace(homePathForRole(claims.role));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AuthGate allowedRoles={['platform_administrator']}>
      <AppShell>
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <UserGroupIcon className="h-5 w-5" /> Demo users
          </h2>
          <p className="text-sm text-slate-600">
            Seeded accounts for the NC DHHS laptop demo. Password for all: <code>{DEMO_PASSWORD}</code>
          </p>
          <table className="w-full text-sm card overflow-hidden">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Demo area</th>
                <th className="px-4 py-2 text-left" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DEMO_USERS.map((u) => (
                <tr key={u.email}>
                  <td className="px-4 py-2 font-mono text-xs">{u.email}</td>
                  <td className="px-4 py-2">{u.role}</td>
                  <td className="px-4 py-2 text-slate-600">{u.area}</td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      className="btn-ghost text-xs"
                      disabled={busy === u.email}
                      onClick={() => void signInAs(u.email)}
                    >
                      {busy === u.email ? 'Signing in…' : 'Sign in as'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AppShell>
    </AuthGate>
  );
}
