/**
 * Clerk-powered sign-in route.
 *
 * Once @clerk/nextjs is wrapped around the app with ClerkProvider + the
 * authMiddleware, this page renders Clerk's built-in <SignIn /> component.
 *
 * After a successful Clerk sign-in, we have to call our /auth/clerk/exchange
 * endpoint with the Clerk session token to get a MedGuard360 JWT — the one
 * with role/state/biometric claims that all our APIs expect.
 *
 * The post-sign-in hook below handles that exchange.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { exchangeClerkSession, clerkConfigured } from '@/lib/clerk-exchange';
import { getCurrentClaims, homePathForRole } from '@/lib/auth';

declare global {
  interface Window {
    Clerk?: { session?: { getToken: () => Promise<string | null> } };
  }
}

export default function SignInPage(): React.ReactElement {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const exchange = async (): Promise<void> => {
      const token = await window.Clerk?.session?.getToken();
      if (!token) return;
      try {
        await exchangeClerkSession(token);
        const claims = getCurrentClaims();
        if (!cancelled && claims) router.replace(homePathForRole(claims.role));
      } catch (err) {
        console.error('Clerk → MedGuard JWT exchange failed:', err);
      }
    };

    // Poll briefly for Clerk to finish initializing
    const interval = setInterval(exchange, 500);
    setTimeout(() => clearInterval(interval), 10_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [router]);

  if (!clerkConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card card-body max-w-md text-center">
          <h1 className="mb-2 text-lg font-semibold">Clerk not configured</h1>
          <p className="text-sm text-slate-600">
            Set <code className="font-mono">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{' '}
            <code className="font-mono">CLERK_SECRET_KEY</code> to enable single-sign-on.
          </p>
          <a href="/login" className="btn-primary mt-4 justify-center">Use password sign-in instead</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/*
          When @clerk/nextjs is installed and ClerkProvider wraps the app,
          replace this div with:
              import { SignIn } from '@clerk/nextjs';
              <SignIn afterSignInUrl="/sign-in" />
          The component handles email/password, SSO buttons, MFA prompts, etc.
          The post-sign-in callback above will exchange the Clerk session
          for a MedGuard360 JWT and route the user to their role's home page.
        */}
        <div className="card card-body text-center">
          <h1 className="text-lg font-semibold">Signing you in…</h1>
          <p className="mt-1 text-sm text-slate-500">
            Clerk SignIn component renders here when the package is installed.
          </p>
        </div>
      </div>
    </div>
  );
}
