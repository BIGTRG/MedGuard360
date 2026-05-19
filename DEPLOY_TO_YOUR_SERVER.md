# Deploy MedGuard360 to genius-eye-main — step by step

Total time: **~20 minutes** (most of it waiting for Docker to build images).

You'll do this from your **own computer's terminal**. Most commands run on
the server after you SSH in. The whole deployment is two phases:

1. **From your desktop** — open a terminal, copy the code to the server.
2. **On the server (over SSH)** — boot the stack, set up your reverse proxy.

---

## Before you start — what you need

- Your server: `178.105.21.227` (genius-eye-main), Ubuntu 22.04 ✅
- SSH access to it (you have this — that's how you got the spec info)
- Docker installed on the server (if not, I'll tell you how to install)
- A subdomain pointed at `178.105.21.227`. Suggested: `medguard.geniuseye.ai`.
  If you don't have DNS set up yet you can still test by IP first.

---

## Step 1 — Open your terminal

You're on Windows. **Press `Win + X` and pick "Terminal"** (or "Windows PowerShell").

A blue/black window with a `PS C:\Users\saint>` prompt opens. That's your
local terminal. Everything below gets typed here.

> If you're on macOS instead, press `Cmd + Space`, type "Terminal", press Enter.

---

## Step 2 — SSH into your server

Type:

```powershell
ssh root@178.105.21.227
```

(If your server user isn't `root`, use that name instead. e.g. `ssh ubuntu@...`)

**What you'll see** (something like):

```
root@178.105.21.227's password: ____
```

…or, if you use SSH keys, it'll just log you in. Type your password.

**You'll know you're in** when the prompt changes to something like:

```
root@genius-eye-main:~#
```

From here, every command runs **on the server**, not your desktop.

> **If SSH fails with "permission denied"**: your key isn't set up yet, or
> the password is wrong. Easiest fix: ask whoever provisioned the box for
> the root password, or set up an SSH key with `ssh-keygen` then `ssh-copy-id
> root@178.105.21.227` from PowerShell.

---

## Step 3 — Verify Docker is installed

On the server, type:

```bash
docker --version && docker compose version
```

**Expected output:**
```
Docker version 24.x.x, build ...
Docker Compose version v2.x.x
```

**If you get "command not found"**, install Docker:

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

…then re-run the version check.

---

## Step 4 — Get the code onto the server

You have two ways. **Pick A if you've already pushed to a Git host** (GitHub /
GitLab / Bitbucket). **Pick B if the code only lives on your laptop**.

### A) From a Git remote (preferred)

On the server:

```bash
cd /opt
git clone https://github.com/YOUR-USERNAME/medguard360.git
cd medguard360
```

(Replace `YOUR-USERNAME` with your real GitHub username.)

> **Private repo?** Generate a personal access token at
> https://github.com/settings/tokens (scope: `repo`) and clone with
> `https://USERNAME:TOKEN@github.com/USERNAME/medguard360.git`.

### B) Upload from your laptop (no Git needed)

This is two steps: zip it on your desktop, then upload.

**On your desktop** (open a *second* Terminal window, don't disturb the SSH one):

```powershell
# Compress the folder
cd C:\Users\saint\Downloads\MedGuard360_Claude_Cowork_Workspace
tar -cz --exclude=node_modules --exclude=.next --exclude=__pycache__ `
    -f medguard360.tar.gz medguard360

# Upload to server (will ask for the same password as SSH)
scp medguard360.tar.gz root@178.105.21.227:/opt/
```

The compressed file should be a few MB.

**Back in the SSH window** (Step 2), extract it:

```bash
cd /opt
tar -xzf medguard360.tar.gz
cd medguard360
```

---

## Step 5 — Pre-flight: check the gateway port is free

Still on the server:

```bash
./deploy/check-ports.sh
```

**Expected:**
```
✅ 8090  free

Summary: 1 free, 0 conflicts of 1 required

✅ All clear. Run: ./deploy/onprem.sh
```

**If port 8090 is taken**, pick another:
```bash
export MEDGUARD_GATEWAY_PORT=8095
./deploy/check-ports.sh
```

Pick any number 8000–9000 that comes back free.

---

## Step 6 — Boot the stack

```bash
./deploy/onprem.sh --seed-demo
```

(`--seed-demo` adds the demo users and sample data. Skip the flag if you
want a blank slate.)

**What you'll see** (over ~10 minutes):

```
→ Pre-flight checks
  ✓ Docker 24.x.x
  ✓ Compose v2.x.x
  ✓ Port 8090 free
  → RAM: 10240 MB available of 15360 MB total
→ Generating production .env with rotated secrets...
  ✓ Secrets rotated.
→ Creating data directories in /opt/medguard360/data...
→ Building images (~5-10 min first time)...

[lots of docker build output — go grab coffee]

→ Starting infrastructure...
→ Waiting for Postgres... ready.
→ Running bootstrap (migrations + Kafka topics + MinIO buckets)...
  ✓ Migrations applied
  ✓ Kafka topics ready
  ✓ MinIO buckets ready
→ Seeding demo data...
→ Starting services...
→ Waiting for gateway...

================================================================
  🎉 MedGuard360 stack is running on genius-eye-main

  Local gateway:   http://127.0.0.1:8090
  ...
================================================================
```

**Time check**: first run takes 8–12 minutes (building 31 Docker images).
Subsequent restarts take 30 seconds.

---

## Step 7 — Test it locally on the server (before exposing publicly)

```bash
curl http://127.0.0.1:8090/api/v1/auth/login -X POST \
  -H "content-type: application/json" \
  -d '{"email":"admin@demo.medguard360.com","password":"demo-Password!1"}'
```

**Expected**: a JSON blob with `accessToken`, `refreshToken`, etc.

If you get that back, **the platform is alive on your server**. Now we make
it reachable from the public internet.

---

## Step 8 — Wire up your reverse proxy

This step depends on what reverse proxy you're already running. Quickly find
out which:

```bash
systemctl status nginx caddy traefik haproxy 2>&1 | grep -E "active|loaded"
```

You'll see exactly one of them as `active (running)`. Now:

### If nginx is running

```bash
# Copy our template into the right place
cp infrastructure/docker/reverse-proxy-snippets/nginx.conf \
   /etc/nginx/sites-available/medguard360.conf

# Edit it — change the hostname to yours
nano /etc/nginx/sites-available/medguard360.conf
# Replace `medguard360.geniuseye.ai` (3 places) with your subdomain
# Save with Ctrl+O, Enter, Ctrl+X

# Enable it
ln -s /etc/nginx/sites-available/medguard360.conf /etc/nginx/sites-enabled/

# Test and reload
nginx -t && systemctl reload nginx
```

**For HTTPS** — if you don't have certs yet:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d medguard360.geniuseye.ai --agree-tos -m you@example.com
```

certbot edits your nginx config to add the TLS cert. Reload nginx and you're done.

### If Caddy is running

```bash
# Caddy is simpler — just append a block
cat infrastructure/docker/reverse-proxy-snippets/Caddyfile >> /etc/caddy/Caddyfile

# Edit it — change hostname
nano /etc/caddy/Caddyfile
# Find the medguard360 block, change the domain on the first line

systemctl reload caddy
```

Caddy auto-provisions Let's Encrypt — no separate certbot step.

### If something else

Look at `infrastructure/docker/reverse-proxy-snippets/README.md` — there are
snippets for Traefik (Docker labels) and HAProxy. If it's something else,
tell me what it is and I'll write the snippet.

---

## Step 9 — Point your domain at the server

In your DNS provider (Cloudflare / Namecheap / Route53 / whoever holds
geniuseye.ai), add an **A record**:

| Type | Name | Value |
|------|------|-------|
| A | medguard | 178.105.21.227 |

(or whatever subdomain you picked)

Wait 1–5 minutes for DNS to propagate. Verify:

```bash
# On your laptop (back in PowerShell):
nslookup medguard.geniuseye.ai
```

Should resolve to `178.105.21.227`.

---

## Step 10 — Open the portal

**On your laptop**, open a browser to:

```
https://medguard.geniuseye.ai
```

You'll see the MedGuard360 login screen. Sign in:

| To see this | Use this login |
|-------------|---------------|
| PA criterion-match flagship screen | `pa@demo.medguard360.com` |
| Fraud investigator queue | `fraud@demo.medguard360.com` |
| State agency dashboard | `state@demo.medguard360.com` |
| Provider portal | `provider@demo.medguard360.com` |
| Platform admin | `admin@demo.medguard360.com` |

All passwords: **`demo-Password!1`**

---

## After it's running

### Tail logs (server-side)
```bash
docker compose -f docker-compose.onprem.yml logs -f auth-service
docker compose -f docker-compose.onprem.yml logs -f fraud-engine-service
```

### Restart a single service
```bash
docker compose -f docker-compose.onprem.yml restart prior-auth-service
```

### Tear down
```bash
./deploy/onprem.sh --teardown        # stops, keeps data in ./data
./deploy/onprem.sh --wipe            # stops AND deletes data
```

### Update the code later
```bash
cd /opt/medguard360
git pull                              # if using git
docker compose -f docker-compose.onprem.yml up -d --build
```

---

## If something goes wrong

**Docker build fails** — check disk space with `df -h`. Each image is
100–500 MB; full build needs ~10 GB free.

**Portal returns 502** — gateway is up but a service isn't ready. Check:
```bash
docker compose -f docker-compose.onprem.yml ps
```
Look for any service not in `running`/`healthy` state, then:
```bash
docker compose -f docker-compose.onprem.yml logs <service-name>
```

**Login fails with "Invalid credentials"** — the seed didn't run. Re-run:
```bash
docker compose -f docker-compose.onprem.yml exec -T postgres \
  psql -U medguard -d medguard360 < deploy/seed-demo.sql
```

**`docker: permission denied`** — your user isn't in the docker group:
```bash
usermod -aG docker $USER
# log out and back in
```

**Out of RAM** — switch to the demo subset:
```bash
./deploy/onprem.sh --teardown
# edit deploy/onprem.sh, change COMPOSE to docker-compose.demo.yml
./deploy/onprem.sh --seed-demo
```

---

## Cheat-sheet — the whole thing in 5 commands

If you've already cloned the code to the server:

```bash
ssh root@178.105.21.227
cd /opt/medguard360
./deploy/check-ports.sh
./deploy/onprem.sh --seed-demo
# Then: configure nginx/Caddy in front, point DNS at the box, open browser.
```

Done.
