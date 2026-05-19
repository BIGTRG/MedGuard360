# auth-service

JWT + Clerk + biometric auth + RBAC. Port **3001**. Owns `users`, `sessions`,
`biometric_enrollments`.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/auth/register` | none/admin | Create a user |
| POST | `/api/v1/auth/login` | none | Exchange email+password for tokens |
| POST | `/api/v1/auth/refresh` | none (refresh token) | Rotate refresh, mint new access |
| POST | `/api/v1/auth/logout` | bearer | Revoke session |
| POST | `/api/v1/auth/biometric/verify` | bearer | Verify biometric, flag session |
| GET  | `/api/v1/auth/me` | bearer | Return current user profile |
| GET  | `/health` | none | Liveness |
| GET  | `/ready` | none | Readiness (DB + Kafka) |
| GET  | `/metrics` | none (internal-only via nginx) | Prometheus |

## Events emitted

- `user.created`
- `user.login.succeeded` / `user.login.failed`
- `user.logout`

Plus `audit.event` for every login, logout, register, biometric verify.

## Tables owned

`users`, `sessions`, `biometric_enrollments` — defined in
`infrastructure/postgres/migrations/0001_base_schema.sql`.

## Tokens

- **Access**: 15 min, JWT signed with `JWT_SECRET`. Contains role, state,
  org, biometric flag, session id.
- **Refresh**: 7 days, rotated on every refresh, hashed (SHA-256) in
  `sessions.refresh_token_hash` — server never stores plaintext.

## Biometric flow

1. Client captures sample via Suprema/NEC SDK
2. POST `/auth/biometric/verify` with `samplePayloadBase64`
3. On success, session row gets `biometric_verified_at`
4. Client immediately POSTs `/auth/refresh` to mint new access token with
   `biometricVerified: true` claim
5. High-risk endpoints (claim submission, PHI export) use `requireBiometric`
   middleware in `@medguard360/shared`

## Local dev

```bash
npm install
npm run build
JWT_SECRET=dev-secret-32-chars-min PG_PASSWORD=dev npm start
```
