#!/usr/bin/env bash
# MedGuard360 — on-prem deployment to an existing server.
#
# Assumes the box already has Docker installed and some reverse proxy in
# front (nginx/Caddy/Traefik). Does NOT install Docker, NOT install Caddy,
# NOT touch the firewall, NOT seed demo data.
#
# What it does:
#   1. Checks for Docker + Docker Compose v2
#   2. Pre-flight port check (warns about conflicts with your existing services)
#   3. Generates production .env with rotated secrets (if .env doesn't exist)
#   4. Creates data/ directories with bind mounts (instead of Docker volumes)
#   5. Builds + boots the stack on docker-compose.onprem.yml
#   6. Applies migrations + creates Kafka topics + MinIO buckets
#   7. Prints the local gateway port and reverse-proxy snippet to paste
#
# Usage:
#   ./deploy/onprem.sh             # boot the stack
#   ./deploy/onprem.sh --seed-demo # ALSO seed demo data (use for pilots/POCs)
#   ./deploy/onprem.sh --teardown  # stop services (data preserved in ./data)
#   ./deploy/onprem.sh --wipe      # stop AND wipe data/ (destructive)

set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="docker-compose.onprem.yml"
GATEWAY_PORT="${MEDGUARD_GATEWAY_PORT:-8090}"
DATA_DIR="${MEDGUARD_DATA_DIR:-$(pwd)/data}"

case "${1:-}" in
  --teardown)
    echo "→ Stopping stack (data preserved in ./data)..."
    docker compose -f "$COMPOSE" down
    exit 0
    ;;
  --wipe)
    echo "⚠  This will DELETE all data in $DATA_DIR. Type 'yes' to continue:"
    read -r confirm
    if [[ "$confirm" != "yes" ]]; then echo "Cancelled."; exit 1; fi
    docker compose -f "$COMPOSE" down
    sudo rm -rf "$DATA_DIR"
    echo "✅ Wiped."
    exit 0
    ;;
esac

SEED_DEMO=0
[[ "${1:-}" == "--seed-demo" ]] && SEED_DEMO=1

# ============================================================
# Pre-flight
# ============================================================
echo "→ Pre-flight checks"

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker not installed. Install: https://docs.docker.com/engine/install/ubuntu/"
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "❌ Docker Compose v2 not available."
  exit 1
fi
echo "  ✓ Docker $(docker --version | awk '{print $3}' | tr -d ,)"
echo "  ✓ Compose $(docker compose version | awk '{print $4}')"

# Port check
echo "→ Checking host port :$GATEWAY_PORT (only port we'll bind)..."
if ss -tlnp 2>/dev/null | grep -q ":$GATEWAY_PORT "; then
  echo "❌ Port $GATEWAY_PORT is already in use. Set MEDGUARD_GATEWAY_PORT to a free port."
  echo "   Current listeners on $GATEWAY_PORT:"
  ss -tlnp | grep ":$GATEWAY_PORT " | head -3
  exit 1
fi
echo "  ✓ Port $GATEWAY_PORT free"

# RAM check
TOTAL_MB=$(free -m | awk 'NR==2{print $2}')
AVAIL_MB=$(free -m | awk 'NR==2{print $7}')
echo "  → RAM: ${AVAIL_MB} MB available of ${TOTAL_MB} MB total"
if (( AVAIL_MB < 8000 )); then
  echo "  ⚠  Less than 8 GB available. Stack needs ~10 GB. Consider"
  echo "     'docker-compose.demo.yml' (slim subset) instead."
fi

# ============================================================
# .env
# ============================================================
echo ""
if [[ ! -f .env ]]; then
  echo "→ Generating production .env with rotated secrets..."
  JWT=$(openssl rand -base64 48 | tr -d '\n=' | head -c 48)
  PG=$(openssl rand -base64 24 | tr -d '\n=/+' | head -c 24)
  MINIO_SK=$(openssl rand -base64 24 | tr -d '\n=/+' | head -c 24)
  cp .env.example .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT|" .env
  sed -i "s|^PG_PASSWORD=.*|PG_PASSWORD=$PG|" .env
  sed -i "s|^MINIO_SECRET_KEY=.*|MINIO_SECRET_KEY=$MINIO_SK|" .env

  # Add on-prem-specific bind paths
  cat >> .env <<EOF

# On-prem deployment (genius-eye-main style)
MEDGUARD_GATEWAY_PORT=$GATEWAY_PORT
PG_DATA_DIR=$DATA_DIR/postgres
REDIS_DATA_DIR=$DATA_DIR/redis
KAFKA_DATA_DIR=$DATA_DIR/kafka
MINIO_DATA_DIR=$DATA_DIR/minio
EOF
  echo "  ✓ Secrets rotated. Save these and back up .env."
  echo "  ⚠  .env is on disk in plain text. Set 0600 perms:"
  chmod 600 .env
  echo "    chmod 600 .env  (done)"
else
  echo "→ .env already exists, leaving alone"
fi

# ============================================================
# Data directories (bind mounts — visible to the host)
# ============================================================
echo "→ Creating data directories in $DATA_DIR..."
mkdir -p "$DATA_DIR"/{postgres,redis,kafka,minio}

# ============================================================
# Build + boot
# ============================================================
echo ""
echo "→ Building images (~5-10 min first time)..."
docker compose -f "$COMPOSE" build --quiet

echo ""
echo "→ Starting infrastructure..."
docker compose -f "$COMPOSE" up -d postgres redis kafka minio

echo "→ Waiting for Postgres..."
until docker compose -f "$COMPOSE" exec -T postgres pg_isready -U medguard -d medguard360 >/dev/null 2>&1; do
  printf '.'; sleep 1
done
echo " ready."

echo ""
echo "→ Running bootstrap (migrations + Kafka topics + MinIO buckets)..."
docker compose -f "$COMPOSE" run --rm bootstrap

if (( SEED_DEMO )); then
  echo ""
  echo "→ Seeding demo data..."
  docker compose -f "$COMPOSE" exec -T postgres \
    psql -U medguard -d medguard360 < deploy/seed-demo.sql
fi

echo ""
echo "→ Starting services..."
docker compose -f "$COMPOSE" up -d

echo "→ Waiting for gateway..."
for i in {1..60}; do
  if curl -fsS "http://localhost:$GATEWAY_PORT/api/v1/auth/login" -X POST -d '{}' \
       -H 'content-type: application/json' >/dev/null 2>&1; then
    break
  fi
  printf '.'
  sleep 2
done
echo ""

# ============================================================
# Output
# ============================================================
cat <<EOF

================================================================
  🎉 MedGuard360 stack is running on $HOSTNAME

  Local gateway:   http://127.0.0.1:$GATEWAY_PORT
  Portal app:      http://127.0.0.1:$GATEWAY_PORT/
  API:             http://127.0.0.1:$GATEWAY_PORT/api/v1/

  No public ports were opened. Your reverse proxy fronts this.
  See infrastructure/docker/reverse-proxy-snippets/ for nginx + Caddy
  configs to drop into your existing setup.

  Data lives in: $DATA_DIR
    - postgres/   — back this up daily
    - minio/      — PHI documents
    - kafka/      — message log (incl. audit.event, infinite retention)
    - redis/      — cache

  Demo data?       $( ((SEED_DEMO)) && echo 'Yes (demo users created)' || echo 'No — production-shaped' )
  Compose file:    $COMPOSE

  Tail logs:       docker compose -f $COMPOSE logs -f <service>
  Tear down:       ./deploy/onprem.sh --teardown
================================================================
EOF
