#!/usr/bin/env bash
# MedGuard360 — apply updates from GitHub to the running server.
#
# Run this on your server (Hetzner console or SSH) whenever you've pushed
# new code to GitHub. It:
#   1. Backs up Postgres + MinIO (safety net in case the update breaks something)
#   2. Pulls the latest code from your git remote
#   3. Rebuilds only the Docker images for services whose code changed
#   4. Applies any new database migrations
#   5. Restarts the stack with zero downtime (rolling restart)
#   6. Verifies the gateway is responding
#
# Usage:
#   cd /opt/medguard360
#   ./deploy/update.sh                # safe — runs full backup first
#   ./deploy/update.sh --no-backup    # skip backup (faster, riskier)
#   ./deploy/update.sh --rollback     # revert to the previous commit

set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE="${COMPOSE:-docker-compose.onprem.yml}"
BACKUP=1
ROLLBACK=0

for arg in "$@"; do
  case "$arg" in
    --no-backup) BACKUP=0 ;;
    --rollback)  ROLLBACK=1 ;;
  esac
done

# ============================================================
# Rollback path
# ============================================================
if (( ROLLBACK )); then
  echo "→ Rolling back to previous commit..."
  git reset --hard HEAD~1
  echo "→ Rebuilding to that commit..."
  docker compose -f "$COMPOSE" up -d --build
  echo "✅ Rolled back. Verify with: docker compose -f $COMPOSE ps"
  exit 0
fi

# ============================================================
# 1. Backup (so we can rollback the DATA too if needed)
# ============================================================
if (( BACKUP )); then
  echo "→ Pre-update backup..."
  ./deploy/backup.sh || {
    echo "⚠  Backup failed but continuing. Re-run with --no-backup if intentional."
    read -p "Continue without backup? (yes/NO): " confirm
    [[ "$confirm" != "yes" ]] && exit 1
  }
fi

# ============================================================
# 2. Pull latest code from git
# ============================================================
echo "→ Pulling latest code from GitHub..."
CURRENT_COMMIT=$(git rev-parse --short HEAD)
git fetch --quiet origin
git pull --rebase origin "$(git branch --show-current)"
NEW_COMMIT=$(git rev-parse --short HEAD)

if [[ "$CURRENT_COMMIT" == "$NEW_COMMIT" ]]; then
  echo "✓ Already up to date ($NEW_COMMIT). Nothing to do."
  exit 0
fi

echo "→ Updating $CURRENT_COMMIT → $NEW_COMMIT"
echo ""
echo "Changes in this update:"
git log --oneline "$CURRENT_COMMIT..$NEW_COMMIT" | head -20
echo ""

# ============================================================
# 3. Figure out which services need rebuilding
# ============================================================
CHANGED=$(git diff --name-only "$CURRENT_COMMIT" "$NEW_COMMIT")
REBUILD_NODE=()
REBUILD_PY=()
REBUILD_FRONTEND=0
REBUILD_SHARED=0

if echo "$CHANGED" | grep -q "^packages/shared/"; then
  REBUILD_SHARED=1
fi
if echo "$CHANGED" | grep -q "^frontend/portals/"; then
  REBUILD_FRONTEND=1
fi
for svc in services/*/; do
  name=$(basename "$svc")
  if echo "$CHANGED" | grep -q "^services/$name/"; then
    REBUILD_NODE+=("$name")
  fi
done
for eng in ai-engines/*/; do
  name=$(basename "$eng")
  if echo "$CHANGED" | grep -q "^ai-engines/$name/"; then
    REBUILD_PY+=("$name")
  fi
done

# If shared changed, every Node service needs rebuilding
if (( REBUILD_SHARED )); then
  echo "→ packages/shared changed; rebuilding ALL Node services"
  REBUILD_NODE=($(ls services))
fi

echo ""
echo "Services to rebuild: ${REBUILD_NODE[*]:-none}"
echo "Engines to rebuild:  ${REBUILD_PY[*]:-none}"
echo "Frontend rebuild:    $( ((REBUILD_FRONTEND)) && echo yes || echo no )"
echo ""

# ============================================================
# 4. Build + recreate only what changed
# ============================================================
TO_REBUILD=("${REBUILD_NODE[@]}" "${REBUILD_PY[@]}")
(( REBUILD_FRONTEND )) && TO_REBUILD+=("portals")

if (( ${#TO_REBUILD[@]} > 0 )); then
  echo "→ Building changed containers..."
  docker compose -f "$COMPOSE" build "${TO_REBUILD[@]}"

  echo "→ Recreating changed containers (rolling, no downtime)..."
  docker compose -f "$COMPOSE" up -d --no-deps "${TO_REBUILD[@]}"
else
  echo "→ No service images need rebuilding (only docs/config changes)."
fi

# ============================================================
# 5. Apply any new migrations
# ============================================================
NEW_MIGRATIONS=$(echo "$CHANGED" | grep "^infrastructure/postgres/migrations/" || true)
if [[ -n "$NEW_MIGRATIONS" ]]; then
  echo ""
  echo "→ New migrations detected:"
  echo "$NEW_MIGRATIONS"
  for m in $NEW_MIGRATIONS; do
    name=$(basename "$m")
    echo "  Applying $name..."
    docker compose -f "$COMPOSE" exec -T postgres \
      psql -U "${PG_USER:-medguard}" -d "${PG_DATABASE:-medguard360}" -1 -f "/work/$m" \
      2>/dev/null || \
    docker compose -f "$COMPOSE" exec -T postgres \
      psql -U "${PG_USER:-medguard}" -d "${PG_DATABASE:-medguard360}" -1 < "$m"
  done
fi

# ============================================================
# 6. Verify
# ============================================================
echo ""
echo "→ Waiting for services to settle..."
sleep 5

GATEWAY_PORT="${MEDGUARD_GATEWAY_PORT:-8090}"
if curl -fsS "http://127.0.0.1:$GATEWAY_PORT/" >/dev/null 2>&1; then
  echo "✅ Gateway responding on :$GATEWAY_PORT"
else
  echo "⚠  Gateway not responding yet — check logs:"
  echo "   docker compose -f $COMPOSE logs -f nginx portals"
fi

cat <<EOF

================================================================
  ✅ Update complete: $CURRENT_COMMIT → $NEW_COMMIT

  If something looks wrong: ./deploy/update.sh --rollback
  Logs:                     docker compose -f $COMPOSE logs -f <service>
================================================================
EOF
