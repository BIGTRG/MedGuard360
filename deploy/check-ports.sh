#!/usr/bin/env bash
# MedGuard360 — pre-flight port-conflict scanner.
#
# Your box has many services already running. This script shows you which
# ports the various deploy variants would need, and flags any conflicts
# with what's already listening.
#
# Usage:
#   ./deploy/check-ports.sh                      # check on-prem variant (1 port)
#   ./deploy/check-ports.sh --full               # check full compose (35+ ports)
#   ./deploy/check-ports.sh --demo               # check demo compose (15+ ports)

set -euo pipefail

GATEWAY_PORT="${MEDGUARD_GATEWAY_PORT:-8090}"

case "${1:-}" in
  --full)  PORTS=(80 5432 6379 9092 9094 9000 9001 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3015 3016 3017 3018 3019 3020 8001 8002 8003 8004 8005 8006 8007 8008 8009 8010) ;;
  --demo)  PORTS=(80 3000 3001 3002 3004 3006 3008 3009 3010 3014 3016 3017 3018 3019 8004 8006 5432 6379 9092 9000 9001) ;;
  *)       PORTS=("$GATEWAY_PORT") ;;
esac

echo "==================================================="
echo "MedGuard360 port-conflict scan"
echo "==================================================="
echo "Variant:   ${1:-on-prem (single port)}"
echo "Hostname:  $(hostname)"
echo ""

CONFLICT=0
SAFE=0
for p in "${PORTS[@]}"; do
  if ss -tlnp 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$p\$"; then
    proc=$(ss -tlnp 2>/dev/null | awk -v p=":$p$" '$4 ~ p {print $NF}' | head -1)
    printf '  ❌ %5d  IN USE   %s\n' "$p" "$proc"
    CONFLICT=$((CONFLICT + 1))
  else
    printf '  ✅ %5d  free\n' "$p"
    SAFE=$((SAFE + 1))
  fi
done

echo ""
echo "Summary: $SAFE free, $CONFLICT conflicts of ${#PORTS[@]} required"
echo ""

if (( CONFLICT > 0 )); then
  case "${1:-}" in
    --full|--demo)
      cat <<EOF
⚠  Use ./docker-compose.onprem.yml instead — it binds only :$GATEWAY_PORT.
   The other ports stay inside the Docker network and don't conflict.
EOF
      ;;
    *)
      cat <<EOF
⚠  Port $GATEWAY_PORT is taken. Set a different one before deploying:
   export MEDGUARD_GATEWAY_PORT=8091    # or any free port
   ./deploy/onprem.sh
EOF
      ;;
  esac
  exit 1
fi

echo "✅ All clear. Run: ./deploy/onprem.sh"
