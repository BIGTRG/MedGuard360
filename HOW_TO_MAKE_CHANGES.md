# How to make changes to MedGuard360

You don't need to be a developer to iterate on this. The workflow below is
how you'll make every future change to your live server.

---

## The new picture

```
   ┌───────────────────┐         ┌─────────────────┐         ┌──────────────────┐
   │  You + Claude     │  push   │     GitHub      │  pull   │  genius-eye-main │
   │  (Cowork mode     ├────────►│  your repo      ├────────►│  (your server)   │
   │   on your Mac)    │         │                 │         │                  │
   └───────────────────┘         └─────────────────┘         └──────────────────┘
        write code               version control              live demo / pilot
```

You talk to me, I write code into your Mac's workspace folder, you push it
to GitHub, the server pulls and rebuilds. **One command per side.**

---

## To make any change — the whole loop

### 1. Tell me what you want changed

In a new Cowork chat, describe the change. Examples that work well:

- *"Add a 'discharge summary' field to the patient detail page."*
- *"The fraud queue should also show the provider's NPI in a column."*
- *"When a PA is denied, send the provider an SMS with the reason."*
- *"I want a new role called 'social_worker' that can see patients and crisis plans but not claims."*

I'll write the code into your workspace folder (the same one we've been
working in — `~/Downloads/MedGuard360_Claude_Cowork_Workspace/medguard360/`
on your Mac).

### 2. Push the changes to GitHub (on your Mac)

In the terminal on your Mac:

```bash
cd ~/Downloads/MedGuard360_Claude_Cowork_Workspace/medguard360
git add .
git commit -m "Add discharge summary to patient detail"   # short description of what changed
git push
```

That's it. 3 commands. Always the same.

### 3. Pull the changes onto the server

In your Hetzner web console (or via SSH once we fix that):

```bash
cd /opt/medguard360
./deploy/update.sh
```

The update script handles everything:
- Backs up your database first (safety net)
- Pulls the latest code from GitHub
- Rebuilds **only the containers that actually changed** (fast — usually 30 seconds)
- Applies any new database migrations
- Recreates the changed services with zero downtime
- Verifies the gateway still responds
- Tells you exactly what changed

### 4. If something broke

```bash
./deploy/update.sh --rollback
```

Reverts to the previous commit and rebuilds. You're back to where you were
in 30 seconds. The pre-update backup is sitting in `/opt/medguard360/backups/`
if the rollback needs to also restore data.

---

## Daily-life command cheat sheet

### On the server (Hetzner web console)

```bash
# Apply latest changes from GitHub
./deploy/update.sh

# See what's running
docker compose -f docker-compose.onprem.yml ps

# Tail a service's logs (great for "why did X happen")
docker compose -f docker-compose.onprem.yml logs -f auth-service

# Restart a single service without touching others
docker compose -f docker-compose.onprem.yml restart prior-auth-service

# Stop everything (data preserved in ./data/)
./deploy/onprem.sh --teardown

# Backup right now (also runs automatically before each ./deploy/update.sh)
./deploy/backup.sh

# List recent backups
ls -lah backups/
```

### On the Mac (Terminal)

```bash
# Pull your own changes from GitHub (e.g. if you edited via the web on a different machine)
git pull

# Push changes after working with Claude
git add . && git commit -m "what you changed" && git push

# See what files have changed since last commit
git status

# See the actual differences
git diff
```

---

## How big a change can I make at once?

Honestly, big. The whole project is 25,000+ lines and every session we've
done has touched many files at once. The update script handles partial
rebuilds — if you change `auth-service`, only that container rebuilds and
restarts (~30 seconds), while the other 29 services keep running untouched.

Some practical guidelines:

| Type of change | How |
|----------------|-----|
| New portal page / UI tweak | Just describe what you want |
| New API endpoint on a service | Describe what it should do |
| Schema change (new table, new column) | Describe what you want stored — I'll write a new migration file; update.sh applies it automatically |
| New service entirely | Describe the service's job — I'll generate it the same way I generated the existing 20 |
| New AI engine | Describe the model + endpoint — I'll scaffold it the same way I did the 10 existing ones |
| Change a vendor (e.g. switch SES → SendGrid for email) | Tell me; I'll add a new adapter alongside the existing one + env var to toggle |

---

## Auto-deploy (set up later, optional)

There's a GitHub Action in `.github/workflows/auto-deploy.yml` that *would*
SSH to your server and run `update.sh` automatically every time you push to
GitHub. Once your SSH access is working again (fail2ban fixed), you can
enable it by:

1. In GitHub: **Settings → Secrets and variables → Actions**
2. Add three secrets: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`
3. Push to `main` → the server updates itself

Until then, just run `./deploy/update.sh` manually after each push. It's a
single command and takes 30 seconds for routine changes.

---

## Database changes — the one thing to know

A typical webapp's "schema change" is scary because it can break production.
MedGuard360's setup makes it safe:

- Schema changes go in **new** migration files (`infrastructure/postgres/migrations/00XX_*.sql`) — never edit existing ones.
- `update.sh` detects new migrations and applies them in order, automatically.
- Migrations are wrapped in `BEGIN; ... COMMIT;` — a syntax error aborts the whole file and your data is untouched.
- The pre-update `backup.sh` runs first, so if a migration succeeds but breaks the app, you can rollback both code AND data.

When you ask me for a schema change, I'll **always** write a new numbered
migration file — never edit an old one. That's how Postgres stays sane
across multiple deploys.

---

## When you want to go back to working with Claude

You don't need to do anything special. Just start a new Cowork chat in this
workspace folder. I'll already see all the code you have — every file is in
the folder I have access to. Tell me what you want changed.

If a future session is a different Claude (different conversation), point
them at `SESSION_NOTES.md` in the repo. It has the complete history of
everything we've built across 14 sessions and will get them up to speed in
under a minute.

---

## The one-page summary

| Task | Where | Command |
|------|-------|---------|
| Describe a change | Cowork chat on Mac | (just chat) |
| Save your changes | Mac terminal | `git add . && git commit -m "..." && git push` |
| Apply to server | Hetzner console | `./deploy/update.sh` |
| Something broke? | Hetzner console | `./deploy/update.sh --rollback` |
| See it live | Browser | `https://your-domain` |

That's the whole loop. Every change goes through these five rows.
