# MedGuard360 — How to deploy this so you can demo it

You've got three reasonable paths. Honest comparison below — pick one, then
run the commands at the bottom of its section.

---

## Side-by-side

| | **A. Laptop** | **B. Cloud VM** | **C. Free-tier managed** |
|---|---|---|---|
| Time to first portal load | 10 min | 30 min | 60+ min |
| Cost | $0 | $20–$48/mo | $0 if idle-sleeping (slower wake) |
| RAM needed | 6 GB (demo subset) / 12 GB (full) | 4 GB ($24 droplet) – 8 GB ($48) | n/a |
| Shareable URL | ❌ only on your machine | ✅ `https://demo.medguard360.com` | ✅ Vercel + Render URLs |
| TLS / HTTPS | ❌ HTTP only | ✅ auto via Caddy | ✅ auto (Vercel) |
| Survives reboot | until you `docker compose down` | yes | yes |
| Easy to break / experiment | ✅ | ✅ | ⚠️ harder, more pieces |
| Real demo to a state agency | ⚠️ ngrok or screen-share | ✅ | ✅ |

**Recommendation for "just me, to poke around":** Path A (laptop) — 100%.
You can move to B or C later when you want to share a URL.

---

## A. Laptop (docker-compose) — fastest

**You'll get:** the NC DHHS demo flow running locally. Portal at
http://localhost/ (nginx), API at http://localhost/api/v1/...

**You need:**
- Docker Desktop ([macOS](https://docs.docker.com/desktop/install/mac-install/) /
  [Windows](https://docs.docker.com/desktop/install/windows-install/) /
  [Linux](https://docs.docker.com/desktop/install/linux/))
- ~6 GB free RAM for the demo subset (`docker-compose.demo.yml`)

**Run (Windows):**
```powershell
cd medguard360
powershell -ExecutionPolicy Bypass -File deploy\demo-up.ps1
# Pre-meeting (30 sec):  deploy\meeting-day.ps1
# Full verify (~2 min):   deploy\meeting-day.ps1 -Full
# Full completion gate:   deploy\complete-demo.ps1   # ~25 min, CI parity
```

**Run (macOS / Linux):**
```bash
cd medguard360
cp .env.example .env   # first time only
./deploy/laptop.sh
# Pre-meeting (30 sec):  ./deploy/laptop.sh --meeting
# Full verify (~2 min):   ./deploy/laptop.sh --meeting --full
# Full completion gate:   ./deploy/laptop.sh --complete
```

The script:
1. Boots Postgres + Redis + Kafka + MinIO
2. Applies migrations + seeds demo users, patients, claims, PA requests
3. Applies idempotent demo patches for older volumes
4. Starts services + 5 AI engines + portal (nginx on port 80)
5. Prints demo logins (password for all: `demo-Password!1`)

When done, open http://localhost/ and sign in at `/login`.

**Tear down:** `./deploy/laptop.sh --teardown` or `docker compose -f docker-compose.demo.yml down -v`

---

## B. Cloud VM — shareable URL, real-domain demo

**You'll get:** `https://demo.medguard360.com` (or whatever subdomain you pick)
with proper HTTPS, accessible from anywhere.

**You need:**
- A cloud VM. Cheapest acceptable options:
  - **Hetzner CPX31** — €15/mo (~$16) — 4 vCPU, 8 GB RAM, 160 GB. Best price.
  - **DigitalOcean Premium AMD 8GB** — $48/mo — 4 vCPU, 8 GB RAM
  - **Hetzner CPX21** — €9/mo (~$10) — 3 vCPU, 4 GB RAM. Just barely enough for the demo subset.
- A domain pointed at the VM's IP (Route53, Cloudflare, Namecheap, whatever)
- ~15 minutes of patience

**Run:**
```bash
# 1. Spin up the VM. SSH in as root.
# 2. Run the bootstrap (this clones the repo + installs Docker + Caddy + boots):
curl -fsSL https://raw.githubusercontent.com/<your-org>/medguard360/main/deploy/cloud-vm.sh | \
  DOMAIN=demo.medguard360.com EMAIL=you@example.com bash
```

The script:
1. `apt update && apt install -y docker.io docker-compose-v2 git caddy`
2. Clones your repo to `/opt/medguard360`
3. Writes a `Caddyfile` that fronts the stack with TLS
4. Boots the demo subset
5. Seeds demo data
6. Caddy provisions Let's Encrypt cert automatically

When done, open `https://your-domain` and sign in.

**Tear down:** destroy the VM. The data is gone with it (intentional — demo box).

---

## C. Free-tier managed — production-realistic

**You'll get:** A real production-ish setup using free tiers across 3 providers.
This is the most work but gives you the closest thing to a "we could ship this"
demo.

**You need:**
- Vercel account (frontend)
- Render or Railway account (backend services)
- Neon, Supabase, or Aiven account (Postgres)
- Upstash (Redis + serverless Kafka)
- ~60+ minutes

**Limitations of free tiers:**
- Render free services sleep after 15 min idle (~30 s cold start)
- Neon free tier: 0.5 GB storage, suspended after 5 min idle
- Upstash Kafka free: 10k messages/day
- **Can't realistically run all 30 services on free tiers**

**Practical strategy:** deploy only the demo subset (`docker-compose.demo.yml` —
20 Node services + 5 AI engines). I'll write the Render `render.yaml` and Vercel
config if you go this route — ask me when you're ready.

---

## Three things you should know before you pick

1. **All paths use the same code.** No demo-only forks. The only difference is
   how the containers run and where Postgres lives.

2. **The full stack needs ~12 GB RAM.** The demo subset trims down to 20
   services + 5 AI engines (~6 GB), enough to demonstrate:
   - login + biometric
   - patient browse + record
   - PA submission → AI evaluation → specialist decision
   - claim creation → 837P generation → fraud score
   - audit trail
   - state agency dashboard

3. **Demo data is seeded automatically.** You'll get pre-created users for
   every role with a known password. No need to register manually.

## Demo login credentials (after seed)

| Role | Email | Password |
|------|-------|----------|
| Provider | `provider@demo.medguard360.com` | `demo-Password!1` |
| Patient | `patient@demo.medguard360.com` | `demo-Password!1` |
| PA specialist | `pa@demo.medguard360.com` | `demo-Password!1` |
| Fraud investigator | `fraud@demo.medguard360.com` | `demo-Password!1` |
| State Medicaid | `state@demo.medguard360.com` | `demo-Password!1` |
| Platform admin | `admin@demo.medguard360.com` | `demo-Password!1` |

All passwords are the same for demo convenience. **Never use these creds in
production** — they're hardcoded in `deploy/seed-demo.sql` and shipped in
the repo.

## Demo walkthrough (5 minutes)

Once you're in:

1. **Sign in as `admin@demo.medguard360.com`** — land on platform admin
2. **Click "Audit"** — see the append-only HIPAA log filling up with your own login event
3. **Sign out, sign in as `state@demo.medguard360.com`** — see the state agency dashboard with pre-loaded KPIs and trend charts
4. **Click into `/state/fraud`** — see the fraud trend lines
5. **Sign in as `fraud@demo.medguard360.com`** — see the fraud-case queue with pre-seeded cases
6. **Open a case** — see the AI score, flags, plain-language explanation. Resolve it.
7. **Sign in as `pa@demo.medguard360.com`** — see the PA queue
8. **Open a pending PA** — see the **flagship screen**: criterion-by-criterion BERT match results with evidence excerpts and approve/deny/needs-more-info actions
9. **Sign in as `provider@demo.medguard360.com`** — see your patients, encounters, claims
10. **Open a claim** — see the EDI 837P preview, fraud score, status

Most-impressive screens to lead with: **#8 (PA criterion match)** and **#6 (fraud case)**. These are the parts of CLAUDE.md that don't exist anywhere else in the market.
