/**
 * Next.js Edge Middleware - server-side auth check before the page even ships.
 *
 * Runs on every request. Verifies the JWT cookie (or `Authorization` header),
 * and 302s to /login if missing/expired. The client-side <AuthGate> stays as
 * defense-in-depth.
 *
 * The middleware runs at the Edge (no Node APIs) - we verify with jose,
 * which works in V8 isolates.
 *
 * Set MEDGUARD_JWT_SECRET in the runtime env (same value as backend JWT_SECRET).
 */

import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = new Set(['/login', '/biometric', '/', '/landing']);
const PUBLIC_PREFIXES = ['/api', '/_next', '/favicon', '/assets', '/public', '/sign-in'];

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const path = req.nextUrl.pathname;
  if (PUBLIC_PATHS.has(path)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some(p => path.startsWith(p))) return NextResponse.next();

  // Token: prefer Authorization header; fall back to cookie for browser page loads.
  const auth = req.headers.get('authorization');
  const cookie = req.cookies.get('mg_access')?.value;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : cookie;

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const secret = process.env.MEDGUARD_JWT_SECRET;
  if (!secret) {
    // No secret in this environment -> fall back to client-side gate (dev mode).
    return NextResponse.next();
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: 'medguard360',
      audience: 'medguard360-platform',
    });
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
