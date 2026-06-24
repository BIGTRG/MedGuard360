#!/usr/bin/env bash
# Fail if deploy or docker init scripts were saved as UTF-16 (breaks bash/PowerShell).
set -euo pipefail

cd "$(dirname "$0")/.."
bad=0

check_file() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  local hex
  hex="$(head -c 4 "$f" | od -An -t x1 | tr -d ' \n')"
  if [[ "$hex" == fffe* ]] || [[ "$hex" == 2300* ]] || [[ "$hex" == efbbbf2300* ]]; then
    echo "UTF-16 encoding: $f"
    bad=1
  fi
}

while IFS= read -r -d '' f; do check_file "$f"; done < <(find deploy infrastructure/docker -type f \( -name '*.sh' -o -name '*.ps1' \) -print0 2>/dev/null)

if [[ "$bad" -ne 0 ]]; then
  echo "Re-save affected scripts as UTF-8 (see .gitattributes)."
  exit 1
fi

echo "Script encoding check passed."
