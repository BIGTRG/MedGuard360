/**
 * Playwright e2e for auth-service.
 *
 * Assumes:
 *   - The service is running on http://localhost:3001
 *   - A throwaway test database is migrated and seeded (see tests-e2e/setup/)
 *
 * Run: BASE_URL=http://localhost:3001 npx playwright test
 */

import { test, expect, request } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:3001';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@demo.medguard360.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'demo-Password!1';

test('liveness + readiness', async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const health = await ctx.get('/health');
  expect(health.status()).toBe(200);
  const ready = await ctx.get('/ready');
  expect([200, 503]).toContain(ready.status());
});

test('register → login → me → logout', async () => {
  const ctx = await request.newContext({ baseURL: BASE });
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'TestPasswordSecure!1';

  const adminLogin = await ctx.post('/api/v1/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(adminLogin.ok()).toBeTruthy();
  const adminTokens = await adminLogin.json();
  expect(adminTokens.accessToken).toBeTruthy();

  const reg = await ctx.post('/api/v1/auth/register', {
    headers: { authorization: `Bearer ${adminTokens.accessToken}` },
    data: { email, password, role: 'compliance_officer', stateCode: 'NC' },
  });
  expect(reg.status()).toBe(201);

  const login = await ctx.post('/api/v1/auth/login', { data: { email, password } });
  expect(login.ok()).toBeTruthy();
  const tokens = await login.json();
  expect(tokens.accessToken).toBeTruthy();
  expect(tokens.refreshToken).toBeTruthy();

  const me = await ctx.get('/api/v1/auth/me', {
    headers: { authorization: `Bearer ${tokens.accessToken}` },
  });
  const body = await me.json();
  expect(body.email).toBe(email);
  expect(body.role).toBe('compliance_officer');

  const logout = await ctx.post('/api/v1/auth/logout', {
    headers: { authorization: `Bearer ${tokens.accessToken}` },
    data: { refreshToken: tokens.refreshToken },
  });
  expect(logout.status()).toBe(204);
});
