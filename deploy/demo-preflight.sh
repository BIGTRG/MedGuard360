#!/usr/bin/env bash
# MedGuard360 - quick pre-meeting checks (does not rebuild or reseed).
set -uo pipefail

cd "$(dirname "$0")/.."
COMPOSE="docker-compose.demo.yml"
failures=0

ok() {
  if [[ "$1" == "1" ]]; then
    echo "[OK] $2"
  else
    echo "[FAIL] $2"
    failures=$((failures + 1))
  fi
}

echo "MedGuard360 demo preflight"
head="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
tag="$(git rev-parse --short v1.0-demo 2>/dev/null || echo unknown)"
echo "Tag: v1.0-demo @ $head"
if [[ "$tag" != "unknown" && "$head" != "unknown" && "$tag" != "$head" ]]; then
  echo "[WARN] v1.0-demo tag ($tag) differs from HEAD ($head)"
fi

command -v docker >/dev/null 2>&1 && ok 1 "docker available" || ok 0 "docker available"

running="$(docker compose -f "$COMPOSE" ps --services --filter status=running 2>/dev/null || true)"
running_count="$(printf '%s\n' "$running" | sed '/^$/d' | wc -l | tr -d ' ')"
[[ "$running_count" -ge 5 ]] && ok 1 "demo stack running" || ok 0 "demo stack running"
printf '%s\n' "$running" | grep -qx postgres && ok 1 "postgres healthy" || ok 0 "postgres healthy"
printf '%s\n' "$running" | grep -qx nginx && ok 1 "nginx running" || ok 0 "nginx running"
printf '%s\n' "$running" | grep -qx portals && ok 1 "portals running" || ok 0 "portals running"
printf '%s\n' "$running" | grep -qx fraud-detection && ok 1 "fraud-detection running" || ok 0 "fraud-detection running"
printf '%s\n' "$running" | grep -qx fraud-ring-gnn && ok 1 "fraud-ring-gnn running" || ok 0 "fraud-ring-gnn running"
printf '%s\n' "$running" | grep -qx pa-nlp-matcher && ok 1 "pa-nlp-matcher running" || ok 0 "pa-nlp-matcher running"
printf '%s\n' "$running" | grep -qx denial-predictor && ok 1 "denial-predictor running" || ok 0 "denial-predictor running"
printf '%s\n' "$running" | grep -qx crisis-detector && ok 1 "crisis-detector running" || ok 0 "crisis-detector running"
printf '%s\n' "$running" | grep -qx crisis-service && ok 1 "crisis-service running" || ok 0 "crisis-service running"

curl -fsS http://localhost:8007/health 2>/dev/null | grep -q '"status":"ok"' && ok 1 "denial-predictor health" || ok 0 "denial-predictor health"
curl -fsS http://localhost:8009/health 2>/dev/null | grep -q '"status":"ok"' && ok 1 "crisis-detector health" || ok 0 "crisis-detector health"
curl -fsS http://localhost:8006/health 2>/dev/null | grep -q '"status":"ok"' && ok 1 "pa-nlp-matcher health" || ok 0 "pa-nlp-matcher health"
curl -fsS http://localhost:8004/health 2>/dev/null | grep -q '"status":"ok"' && ok 1 "fraud-detection health" || ok 0 "fraud-detection health"
curl -fsS http://localhost:8005/health 2>/dev/null | grep -q '"status":"ok"' && ok 1 "fraud-ring-gnn health" || ok 0 "fraud-ring-gnn health"

curl -fsS http://localhost/ >/dev/null 2>&1 && ok 1 "portal HTTP 200" || ok 0 "portal HTTP 200"

login="$(curl -fsS -X POST http://localhost/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.medguard360.com","password":"demo-Password!1"}' 2>/dev/null || true)"
[[ "$login" == *accessToken* ]] && ok 1 "auth login" || ok 0 "auth login"

echo ""
if [[ "$failures" -eq 0 ]]; then
  echo "Preflight passed - run deploy/smoke-demo.ps1 or ./deploy/verify-demo.sh for full checks."
  exit 0
fi
echo "$failures preflight failure(s). Run: ./deploy/laptop.sh"
exit 1
