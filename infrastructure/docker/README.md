# MedGuard360 — Docker setup

## Quick start

```bash
# 1. Copy environment template
cp .env.example .env       # then edit if needed

# 2. Bring up infra
docker compose up -d postgres redis kafka minio

# 3. Bootstrap (applies migrations, creates topics + buckets)
docker compose run --rm bootstrap

# 4. Bring up the rest
docker compose up -d
```

After this:
- **Portal**: <http://localhost:3000>
- **API gateway**: <http://localhost/api/v1/...> (via nginx)
- **MinIO console**: <http://localhost:9001> (medguard / from .env)
- **Postgres**: localhost:5432 (medguard / from .env)
- **Kafka external**: localhost:9094

## Files

| File | Purpose |
|------|---------|
| `Dockerfile.node` | Shared builder for all 20 Node services. Pass `SERVICE_NAME` as build-arg. |
| `Dockerfile.python` | Shared builder for all 10 AI engines. Pass `ENGINE_NAME` as build-arg. |
| `Dockerfile.portals` | Next.js portal app. |
| `nginx.dev.conf` | Dev-mode nginx routing `/api/v1/*` to services. No TLS. |
| `bootstrap.sh` | One-shot init: psql migrations + kafka topics + MinIO buckets. Idempotent. |

## Logs

```bash
docker compose logs -f auth-service
docker compose logs -f fraud-engine-service
```

## Tear down

```bash
docker compose down -v   # wipes volumes (Postgres + MinIO data)
```

## Production differences

The `nginx.dev.conf` here is **plain HTTP**. For production use
`infrastructure/nginx/nginx.conf` which has:
- TLS 1.3 only
- Per-zone rate limiting (auth/general/claims)
- Full security headers (HSTS, CSP, etc.)
- TLS certs from Let's Encrypt

Secrets in production come from `/opt/credential-vault/<service>.json`,
**not** environment variables. Each service's config loader checks the vault
path first; this docker-compose setup uses env vars for convenience only.
