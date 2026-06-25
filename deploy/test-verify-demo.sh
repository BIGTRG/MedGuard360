#!/usr/bin/env bash
# Regression tests for verify-demo.sh control flow.
set -euo pipefail

cd "$(dirname "$0")/.."

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

repo_dir="$tmp_dir/repo"
bin_dir="$tmp_dir/bin"
log_file="$tmp_dir/calls.log"

mkdir -p "$repo_dir/deploy" "$bin_dir"
cp deploy/verify-demo.sh "$repo_dir/deploy/verify-demo.sh"

ln -s "$(command -v bash)" "$bin_dir/bash"
ln -s "$(command -v dirname)" "$bin_dir/dirname"

write_stub_script() {
  local name="$1"
  local exit_code="${2:-0}"
  cat > "$repo_dir/deploy/$name" <<EOF
#!/usr/bin/env bash
printf '%s\n' '$name' >> '$log_file'
exit $exit_code
EOF
  chmod +x "$repo_dir/deploy/$name"
}

write_pwsh_stub() {
  cat > "$bin_dir/pwsh" <<EOF
#!/usr/bin/env bash
file=""
while [ "\$#" -gt 0 ]; do
  if [ "\$1" = "-File" ]; then
    shift
    file="\$1"
    break
  fi
  shift
done
printf 'pwsh:%s\n' "\${file##*/}" >> '$log_file'
exit 0
EOF
  chmod +x "$bin_dir/pwsh"
}

write_python_stub() {
  cat > "$bin_dir/python3.11" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
  chmod +x "$bin_dir/python3.11"
}

reset_stubs() {
  : > "$log_file"
  rm -f "$bin_dir/python3.11"
  write_stub_script "run-engine-tests.sh"
  write_stub_script "run-engine-tests-docker.sh"
  write_stub_script "demo-preflight.sh"
  write_pwsh_stub
}

assert_log_equals() {
  local expected="$1"
  local actual
  actual="$(<"$log_file")"
  if [ "$actual" != "$expected" ]; then
    echo "Unexpected verify-demo.sh call sequence."
    echo "Expected:"
    printf '%s\n' "$expected"
    echo "Actual:"
    printf '%s\n' "$actual"
    exit 1
  fi
}

reset_stubs
write_python_stub
PATH="$bin_dir" bash "$repo_dir/deploy/verify-demo.sh" --engine-tests >/dev/null
assert_log_equals "run-engine-tests.sh
demo-preflight.sh
pwsh:smoke-demo.ps1
pwsh:demo-flow.ps1"

reset_stubs
PATH="$bin_dir" bash "$repo_dir/deploy/verify-demo.sh" --engine-tests >/dev/null
assert_log_equals "run-engine-tests-docker.sh
demo-preflight.sh
pwsh:smoke-demo.ps1
pwsh:demo-flow.ps1"

echo "verify-demo.sh fallback tests passed."
