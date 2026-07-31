#!/usr/bin/env bash
# Fixture-based regression tests for deploy/check-script-encoding.sh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_ROOT="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local message="$3"

  case "$haystack" in
    *"$needle"*) return 0 ;;
  esac

  echo "$message"
  echo "Expected to find: $needle"
  echo "Actual output:"
  echo "$haystack"
  exit 1
}

mkdir -p "$TMP_ROOT/deploy" "$TMP_ROOT/infrastructure/docker"
cp "$REPO_ROOT/deploy/check-script-encoding.sh" "$TMP_ROOT/deploy/check-script-encoding.sh"
chmod +x "$TMP_ROOT/deploy/check-script-encoding.sh"

printf '#!/usr/bin/env bash\necho ok\n' > "$TMP_ROOT/deploy/good.sh"
printf 'Write-Host "ok"\n' > "$TMP_ROOT/deploy/good.ps1"

pass_output="$("$TMP_ROOT/deploy/check-script-encoding.sh")"
assert_contains "$pass_output" "Script encoding check passed." "Expected clean UTF-8 fixtures to pass."

printf '\xff\xfe#\x00!\x00\n\x00' > "$TMP_ROOT/deploy/bad-utf16le.sh"

set +e
fail_output="$("$TMP_ROOT/deploy/check-script-encoding.sh" 2>&1)"
fail_status=$?
set -e

if [[ "$fail_status" -eq 0 ]]; then
  echo "Expected UTF-16LE fixture to fail the encoding check."
  exit 1
fi
assert_contains "$fail_output" "UTF-16 encoding: deploy/bad-utf16le.sh" "Expected UTF-16LE fixture to be reported."
assert_contains "$fail_output" "Re-save affected scripts as UTF-8" "Expected remediation guidance for bad fixtures."

printf '\xef\xbb\xbf#\x00!\x00\n\x00' > "$TMP_ROOT/infrastructure/docker/bad-bom.ps1"

set +e
bom_output="$("$TMP_ROOT/deploy/check-script-encoding.sh" 2>&1)"
bom_status=$?
set -e

if [[ "$bom_status" -eq 0 ]]; then
  echo "Expected UTF-8-BOM plus UTF-16-style bytes fixture to fail the encoding check."
  exit 1
fi
assert_contains "$bom_output" "UTF-16 encoding: infrastructure/docker/bad-bom.ps1" "Expected BOM-prefixed UTF-16-style fixture to be reported."

echo "check-script-encoding self-test passed."
