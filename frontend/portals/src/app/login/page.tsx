'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import { login } from '@/lib/api-client';
import { homePathForRole, saveTokens, getCurrentClaims } from '@/lib/auth';
import { clerkConfigured } from '@/lib/clerk-exchange';
import type { Tokens } from '@/lib/types';

export default function LoginPage(): React.ReactElement {
  // If Clerk is configured, show a banner pointing to /sign-in (Clerk's
  // built-in route once @clerk/nextjs middleware is wired). The password
  // form below remains as a fallback / admin-bootstrap path.
  const useClerk = clerkConfigured();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const tokens: Tokens = await login(email, password);
      saveTokens(tokens);
      const claims = getCurrentClaims();
      if (!claims) throw new Error('Invalid token returned');
      router.replace(homePathForRole(claims.role));
    } catch (err) {
      setError((err as Error).message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
            <span className="text-xl font-bold">M</span>
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900">Sign in to MedGuard360</h1>
          <p className="text-sm text-slate-500">Unified Medicaid &amp; Medicare platform</p>
        </div>
        {useClerk && (
          <div className="mb-4 rounded-md bg-brand-50 px-4 py-3 text-sm text-brand-900">
            <a href="/sign-in" className="font-medium underline">Sign in with your work account</a> — SSO, MFA, password reset are managed by Clerk.
          </div>
        )}
        <form onSubmit={onSubmit} className="card card-body space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              required
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <button
            type="submit"
            className="btn-primary w-full justify-center"
            disabled={submitting}
          >
            <LockClosedIcon className="h-4 w-4" />
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
