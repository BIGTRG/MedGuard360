# MedGuard360 — Production Hardening Checklist

Pieces that need real deployment work (not new code) before going live.

## 1. TLS

- Production nginx config (`infrastructure/nginx/nginx.conf`) is already TLS-1.3-only
- Let's Encrypt cert renewal: `infrastructure/nginx/renew-certs.sh` runs nightly via cron
- Domains to provision certs for:
  - `api.medguard360.com`
  - `portal.medguard360.com`
  - `hub.medguard360.com`
- Internal service-to-service: use an internal CA (smallstep or Hashicorp Vault PKI)

## 2. PgBouncer

- Config: `infrastructure/pgbouncer/pgbouncer.ini`
- Transaction-pool mode (compatible with `withRlsContext()` `SET LOCAL`)
- Two databases: primary (writes) and `_ro` against replica-1
- Each Node service env: change `PG_HOST=postgres` → `PG_HOST=pgbouncer` and `PG_PORT=5432` → `PG_PORT=6432`
- userlist.txt generated from `/opt/credential-vault/pgbouncer-users.json` at bootstrap

## 3. AlertManager

- Config: `infrastructure/alertmanager/alertmanager.yml`
- Routes:
  - `severity=critical` + `compliance=hipaa` → **immediate page** (PagerDuty) + email to info@geniuseye.ai
  - `severity=critical` → page + email
  - `severity=warning` → email batched every 15 min
- Inhibit: if `ServiceDown` for a service, suppress that service's other warnings
- Prometheus alert rules already include the HIPAA audit-log-gap alarm (Session 1)

## 4. Edge auth middleware

- `frontend/portals/src/middleware.ts` (already added) verifies JWT at the Edge
  before the page ships
- Set `MEDGUARD_JWT_SECRET` to match the backend's `JWT_SECRET`
- The client-side `AuthGate` stays as defense-in-depth

## 5. shadcn/ui

- `components.json` (already added) defines the install target
- Add components on demand:
  ```bash
  cd frontend/portals
  npx shadcn-ui@latest add dialog combobox toast popover tabs
  ```
- Existing utility classes (`.card`, `.btn-primary`) in `globals.css` keep
  working — shadcn drops in alongside, no migration needed

## 6. Other production essentials (not adapter-pattern fixable)

- **Secrets in `/opt/credential-vault/`** — populate per-service JSON files
  with real credentials (Clerk, Twilio, SES, biometric, payer mTLS certs)
- **ELK Stack deployment** — Logstash config to ingest PM2 logs + nginx JSON logs
- **Backups** — `pg_dump` of Postgres to MinIO `system-backups` daily,
  retention per state contract
- **Disaster recovery** — quarterly DR drill, RTO/RPO defined in service-level
  agreement with state partners
- **Pen testing** — annual third-party penetration test for HIPAA SRA
- **SOC 2 Type II** — Drata or Vanta to automate evidence collection

## 7. CI/CD

Not yet built. Recommended stack:
- GitHub Actions: lint, typecheck, unit tests, build Docker images
- Image push to private registry (ECR / Harbor)
- Argo CD or Flux for GitOps deploy to k8s
- Canary deploys + automated rollback on `HighErrorRate` alarm
