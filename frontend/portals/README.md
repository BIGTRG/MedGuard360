# @medguard360/portals

Unified Next.js 14 portal app — **all 20 role portals run inside this one
app**, with role-based routing. After login, users land at the page their
role calls home (`homePathForRole` in `src/lib/auth.ts`).

## Stack

- Next.js 14 (App Router) + TypeScript strict
- Tailwind CSS (custom palette + utility classes in `src/app/globals.css`)
- Heroicons for icons
- Recharts for charts
- Talks to the platform via the nginx gateway at `/api/v1/...`

## What's built so far

| Route | Audience | Status |
|-------|----------|--------|
| `/login` | everyone | ✅ |
| `/biometric` | anyone with valid session | ✅ |
| `/` | redirects to role's home | ✅ |
| `/state` | state_medicaid_agency / mco_admin / federal_cms | ✅ Executive dashboard with KPIs + 4 trend charts |
| `/fraud` | fraud_investigator | ✅ Queue sorted by score |
| `/fraud/[id]` | fraud_investigator | ✅ Case detail + resolve actions |
| `/provider` | individual_provider / facility_provider | ✅ Overview with 4 KPI tiles + 4 cards |
| `/pa-queue` | prior_auth_specialist | ✅ Queue with SLA-aware sorting |
| `/pa-queue/[id]` | prior_auth_specialist | ✅ **Flagship**: criterion-by-criterion AI explanation + decision UI |

## What's NOT built yet (placeholder routes)

Sub-pages for each portal: `/provider/patients`, `/provider/encounters`,
`/provider/claims`, `/provider/pa`, `/state/perm`, `/state/fraud`, etc.
The auth + AppShell + AuthGate already work for these — each page just needs
its own data fetching + table/form components.

Other portal entry points (still 404):
`/patient`, `/pharmacy`, `/dme`, `/nemt`, `/credentialing`, `/denials`, `/audit`,
`/responder`, `/school`, `/hie`, `/admin`. Each one follows the same pattern:
wrap in `<AuthGate allowedRoles={...}><AppShell>...</AppShell></AuthGate>`.

## Local dev

```bash
cd frontend/portals
npm install
NEXT_PUBLIC_API_BASE=/api MEDGUARD_API_BASE=http://localhost npm run dev
```

Visit `http://localhost:3000` (Next dev server). For the **NC laptop demo**, use
`deploy/demo-up.ps1` or `./deploy/laptop.sh` instead — portal at http://localhost/
via nginx with all role pages live.

## Architecture decisions

1. **Single app, role-based routing** instead of monorepo with 20 apps —
   easier to deploy (one nginx upstream), shared layout, users with multiple
   roles can switch context without re-auth.
2. **Tokens in storage**, not cookies — access in sessionStorage (tab-scoped),
   refresh in localStorage (survives tab close, but server-side hash means
   no plaintext exposure on the server).
3. **API client auto-refreshes** on 401 with a single in-flight refresh promise.
4. **`AuthGate` is client-side** for now. For production, add an Edge Middleware
   that decodes the JWT and 302s before the page even ships.
5. **No shadcn/ui CLI** yet — Tailwind utility classes live in `globals.css`
   as `.card`, `.btn-primary`, etc. Easy to drop shadcn in later when we want
   richer components (Dialog, Combobox, etc.).
