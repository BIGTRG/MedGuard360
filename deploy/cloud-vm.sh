#!/usr/bin/env bash
# MedGuard360 — cloud VM bootstrap.
#
# Provisions a fresh Ubuntu 22.04 or 24.04 box with everything needed to
# serve a shareable demo URL with HTTPS.
#
# Tested on: Hetzner CPX21+, DigitalOcean droplets, AWS EC2 t3.large+.
# Minimum: 4 GB RAM, 2 vCPU, 40 GB disk (demo subset).
# Recommended: 8 GB RAM (full stack).
#
# Usage (on the VM, as root):
#   DOMAIN=demo.medguard360.com EMAIL=you@example.com \
#     bash <(curl -fsSL https://raw.githubusercontent.com/<your-org>/medguard360/main/deploy/cloud-vm.sh)
#
# Or, if you've already SCP'd the repo:
#   DOMAIN=demo.medguard360.com EMAIL=you@example.com ./deploy/cloud-vm.sh

set -euo pipefail

: "${DOMAIN:?DOMAIN env var required, e.g. demo.medguard360.com}"
: "${EMAIL:?EMAIL env var required for Let's Encrypt cert registration}"

REPO_URL="${REPO_URL:-https://github.com/medguard360/medguard360.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/medguard360}"
COMPOSE="${COMPOSE:-docker-compose.demo.yml}"   # or docker-compose.yml for full stack

if [[ $EUID -ne 0 ]]; then
  echo "❌ Run as root (or with sudo)."
  exit 1
fi

echo "→ Pre-flight"
echo "  DOMAIN:       $DOMAIN"
echo "  EMAIL:        $EMAIL"
echo "  COMPOSE:      $COMPOSE"
echo "  INSTALL_DIR:  $INSTALL_DIR"

# ============================================================
# 1. System packages
# ============================================================
echo ""
echo "→ Installing system packages..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  ca-certificates curl gnupg lsb-release ufw git

# Docker
if ! command -v docker >/dev/null 2>&1; then
  echo "→ Installing Docker..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

# Caddy (auto-TLS reverse proxy)
if ! command -v caddy >/dev/null 2>&1; then
  echo "→ Installing Caddy..."
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -qq && apt-get install -y -qq caddy
fi

# ============================================================
# 2. Firewall — only 22, 80, 443 from the outside
# ============================================================
echo ""
echo "→ Configuring UFW..."
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP (Caddy redirects to HTTPS)'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

# ============================================================
# 3. Clone or update repo
# ============================================================
echo ""
echo "→ Cloning repo to $INSTALL_DIR..."
if [[ -d "$INSTALL_DIR" ]]; then
  git -C "$INSTALL_DIR" pull --rebase
else
  git clone "$REPO_URL" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"

# ============================================================
# 4. .env (production-shaped)
# ============================================================
echo ""
if [[ ! -f .env ]]; then
  echo "→ Generating production .env..."
  JWT=$(openssl rand -base64 48 | tr -d '\n=' | head -c 48)
  PG=$(openssl rand -base64 24 | tr -d '\n=/+' | head -c 24)
  MINIO_SK=$(openssl rand -base64 24 | tr -d '\n=/+' | head -c 24)
  cp .env.example .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$JWT|" .env
  sed -i "s|^PG_PASSWORD=.*|PG_PASSWORD=$PG|" .env
  sed -i "s|^MINIO_SECRET_KEY=.*|MINIO_SECRET_KEY=$MINIO_SK|" .env
  echo "  ✓ secrets rotated. .env preserved at $INSTALL_DIR/.env"
fi

# ============================================================
# 5. Caddyfile — auto-TLS in front of nginx:80
# ============================================================
echo ""
echo "→ Writing Caddyfile..."
cat > /etc/caddy/Caddyfile <<EOF
{
  email $EMAIL
}

$DOMAIN {
  encode gzip zstd
  header {
    Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    X-Content-Type-Options nosniff
    Referrer-Policy strict-origin-when-cross-origin
    -Server
  }
  reverse_proxy 127.0.0.1:80
}
EOF
systemctl restart caddy

# ============================================================
# 6. Boot the stack
# ============================================================
echo ""
echo "→ Starting MedGuard360 stack ($COMPOSE)..."
docker compose -f "$COMPOSE" up -d postgres redis kafka minio

echo "→ Waiting for Postgres..."
until docker compose -f "$COMPOSE" exec -T postgres pg_isready -U medguard -d medguard360 >/dev/null 2>&1; do
  printf '.'; sleep 1
done
echo " ready."

echo "→ Bootstrap (migrations + topics + buckets + demo seed)..."
docker compose -f "$COMPOSE" run --rm bootstrap

echo "→ Starting services..."
docker compose -f "$COMPOSE" up -d

# ============================================================
# 7. Wait for portal + readiness
# ============================================================
echo "→ Waiting for portal to come up..."
for i in {1..120}; do
  if curl -fsS http://localhost:3000 >/dev/null 2>&1; then break; fi
  printf '.'
  sleep 2
done

# Caddy needs a sec to provision the cert on first request
echo ""
echo "→ Triggering Caddy TLS provisioning (this is the first HTTPS request)..."
curl -fsS "https://$DOMAIN/" -o /dev/null --max-time 60 || true

cat <<EOF

================================================================
  🎉 MedGuard360 deployed

  Public URL:      https://$DOMAIN
  Admin email:     admin@demo.medguard360.com
  Password:        demo-Password!1   (rotate this before sharing!)

  Server commands (SSH back in):
    docker compose -f $COMPOSE logs -f <service>
    docker compose -f $COMPOSE ps
    docker compose -f $COMPOSE restart <service>

  Tear down:
    docker compose -f $COMPOSE down -v
    rm -rf $INSTALL_DIR
================================================================
EOF
