#!/usr/bin/env bash
# MedGuard360 — one-command laptop demo.
# Boots a slim subset of the platform on your machine, applies migrations,
# seeds demo users + data, and tells you where to log in.
#
# Usage:
#   ./deploy/laptop.sh           # demo subset (12 services, ~6 GB RAM)
#   ./deploy/laptop.sh --full    # the whole platform (~12 GB RAM)
#   ./deploy/laptop.sh --teardown

set -euo pipefail

cd "$(dirname "$0")/.."

# Pick which compose file
COMPOSE="docker-compose.demo.yml"
if [[ "${1:-}" == "--full" ]]; then
  COMPOSE="docker-compose.yml"
  echo "→ Full stack mode (all 30 services + 10 AI engines)"
elif [[ "${1:-}" == "--teardown" ]]; then
  echo "→ Tearing down both demo + full stacks (volumes wiped)..."
  docker compose -f docker-compose.demo.yml down -v 2>/dev/null || true
  docker compose -f docker-compose.yml      down -v 2>/dev/null || true
  echo "✅ Clean."
  exit 0
else
  echo "→ Demo subset mode (20 services + AI engines, docker-compose.demo.yml)"
fi

# .env
if [[ ! -f .env ]]; then
  echo "→ Copying .env.example → .env (edit if you want to set real secrets)"
  cp .env.example .env
fi

# Check Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker not installed."
  echo "   Install Docker Desktop: https://docs.docker.com/desktop/"
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "❌ Docker Compose v2 not available. Update Docker Desktop."
  exit 1
fi

echo ""
echo "→ Pulling base images + building service images (~3-5 min first time)..."
docker compose -f "$COMPOSE" build --quiet 2>&1 | tail -20

echo ""
echo "→ Starting infrastructure (Postgres, Redis, Kafka, MinIO)..."
docker compose -f "$COMPOSE" up -d postgres redis kafka minio

echo "→ Waiting for Postgres to be ready..."
until docker compose -f "$COMPOSE" exec -T postgres pg_isready -U medguard -d medguard360 >/dev/null 2>&1; do
  printf '.'
  sleep 1
done
echo " ready."

echo ""
echo "→ Running bootstrap (migrations + Kafka topics + MinIO buckets + demo seed)..."
docker compose -f "$COMPOSE" run --rm bootstrap

echo ""
echo "→ Starting services..."
docker compose -f "$COMPOSE" up -d
docker compose -f "$COMPOSE" run --rm kafka-init >/dev/null 2>&1 || true
docker compose -f "$COMPOSE" up -d --force-recreate nginx

echo ""
echo "→ Waiting for portal to come up..."
for i in {1..60}; do
  if curl -fsS http://localhost/ >/dev/null 2>&1; then break; fi
  printf '.'
  sleep 2
done
echo ""

cat <<'EOF'

================================================================
  🎉 MedGuard360 is running

  Portal:        http://localhost/  (or http://localhost:3080/ direct)
  API gateway:   http://localhost/api/v1
  MinIO console: http://localhost:9001 (medguard / medguard-demo-password)

  Demo logins (password for all: demo-Password!1):
    admin@demo.medguard360.com         — platform admin
    state@demo.medguard360.com         — state Medicaid dashboard
    provider@demo.medguard360.com      — provider portal + EHR chart
    patient@demo.medguard360.com       — member portal
    pa@demo.medguard360.com            — PA evidence matcher
    fraud@demo.medguard360.com         — fraud investigator queue
    compliance@demo.medguard360.com    — compliance / audit / notifications
    billing@demo.medguard360.com       — revenue cycle / claims
    denial@demo.medguard360.com        — denials + AI appeal draft
    credentialing@demo.medguard360.com — provider credentialing
    dme@demo.medguard360.com           — DMEPOS orders
    nemt@demo.medguard360.com          — NEMT trips
    pharmacy@demo.medguard360.com      — formulary + drug PA
    hie@demo.medguard360.com           — NC HealthConnex consents
    school@demo.medguard360.com        — school-based Medicaid
    responder@demo.medguard360.com     — crisis responder (biometric-gated)

  Verify (Windows):  powershell -ExecutionPolicy Bypass -File deploy\demo-up.ps1
  Preflight:         powershell -ExecutionPolicy Bypass -File deploy\demo-preflight.ps1
  Verify (scripts):  ./deploy/smoke-demo.ps1  &&  ./deploy/demo-flow.ps1
  Stop:    ./deploy/laptop.sh --teardown
================================================================
EOF
