# MedGuard360 — Claude Code Workspace

**Built by TRG TechLink | Sainté Robinson (Deon)**

---

## What This Is

This workspace contains all code, scripts, and prompts for MedGuard360 —
a unified AI-assisted, human-verified Medicaid and Medicare fraud prevention
and billing platform serving all 50 states.

---

## NC laptop demo (quick start)

**Windows (recommended for DHHS meetings):**

```powershell
cd medguard360
powershell -ExecutionPolicy Bypass -File deploy\demo-up.ps1
# Fast re-check only:  deploy\demo-up.ps1 -VerifyOnly
# Rebuild portals only: deploy\demo-up.ps1 -RebuildPortals -SkipBuild
# Skip full verify:     deploy\demo-up.ps1 -SkipVerify
```

[![CI](https://github.com/BIGTRG/MedGuard360/actions/workflows/ci.yml/badge.svg)](https://github.com/BIGTRG/MedGuard360/actions/workflows/ci.yml)
[![Security scan](https://github.com/BIGTRG/MedGuard360/actions/workflows/security-scan.yml/badge.svg)](https://github.com/BIGTRG/MedGuard360/actions/workflows/security-scan.yml)

Open http://localhost/ — password for all demo users: `demo-Password!1`

| Script | Purpose |
|--------|---------|
| `deploy/demo-up.ps1` | Build, seed, smoke + demo-flow |
| `deploy/demo-preflight.ps1` | Quick pre-meeting health check |
| `deploy/verify-demo.ps1` | Preflight + smoke + demo-flow (`-UnitTests` for CI parity) |
| `deploy/run-service-tests.ps1` | All 20 Node service Jest suites (same list as GitHub CI) |
| `deploy/run-engine-tests.ps1` | Demo AI engine pytest (fraud, PA NLP, denial, crisis) |
| `deploy/smoke-demo.ps1` | Fast HTTP/API/portal checks |
| `deploy/demo-flow.ps1` | Full role workflow verification |

Container images: `ghcr.io/bigtrg/medguard360/*` (tag `v1.0-demo`).  
Release notes: https://github.com/BIGTRG/MedGuard360/releases/tag/v1.0-demo

CI runs unit tests for all 20 Node microservices.

See `sales/NC-DHHS-DEMO-SCRIPT.md` for the 15-minute walkthrough.

---

## Workspace Structure

```
medguard360/
├── README.md                  ← You are here
├── CLAUDE.md                  ← Master prompt for Claude Code (read this first)
├── docs/
│   ├── build_all5.py          ← Generates PDF docs 1–5
│   ├── generate_pdfs.py       ← Original 3-doc generator
│   ├── infra_compare.py       ← Infrastructure comparison PDF (doc 7)
│   └── master_prompt.py       ← Master prompt PDF (doc 6)
├── services/
│   ├── auth-service/          ← JWT + Clerk + biometric auth
│   ├── provider-service/      ← Provider profiles, NPI, taxonomy
│   ├── credentialing-service/ ← 50-state credentialing engine
│   ├── patient-service/       ← Patient records, crisis plans
│   ├── eligibility-service/   ← Real-time Medicaid eligibility
│   ├── prior-auth-service/    ← PA engine + clinical decision AI
│   ├── clinical-doc-service/  ← Real-time documentation + NLP
│   ├── claims-service/        ← EDI 837P/I/835/NCPDP generation
│   ├── fraud-engine-service/  ← ML fraud detection + GNN
│   ├── denial-service/        ← Denial management + appeals
│   ├── pharmacy-service/      ← NCPDP pharmacy claims
│   ├── dme-service/           ← DMEPOS billing
│   ├── nemt-service/          ← Transportation GPS billing
│   ├── crisis-service/        ← Crisis plans + 911 integration
│   ├── hub-service/           ← Statewide 1-800 call hub
│   ├── reporting-service/     ← PERM + compliance reporting
│   ├── notification-service/  ← Email/SMS/push alerts
│   ├── state-config-service/  ← 50-state rules engine
│   ├── audit-log-service/     ← Append-only HIPAA audit log
│   └── hie-service/           ← FHIR R4 HIE integration
├── ai-engines/
│   ├── speech-to-text/        ← Whisper speech transcription
│   ├── clinical-nlp/          ← scispaCy + MedSpaCy coding engine
│   ├── ocr-engine/            ← Tesseract document intelligence
│   ├── fraud-detection/       ← Isolation Forest + XGBoost
│   ├── fraud-ring-gnn/        ← PyTorch GNN fraud ring detection
│   ├── pa-nlp-matcher/        ← BERT PA criteria matching
│   ├── denial-predictor/      ← Gradient Boosted denial engine
│   ├── provider-monitor/      ← Continuous credentialing monitor
│   ├── crisis-detector/       ← Crisis language classifier
│   └── eligibility-intel/     ← Eligibility ML engine
├── frontend/
│   ├── portals/               ← Next.js 14 — all 20 role portals
│   └── mobile/                ← React Native / Expo — all devices
└── infrastructure/
    ├── nginx/                 ← TLS 1.3 reverse proxy configs
    ├── pm2/                   ← PM2 ecosystem configs
    ├── prometheus/            ← Metrics scrape configs
    ├── kafka/                 ← Broker and topic configs
    └── minio/                 ← Object storage configs
```

---

## How to Use in Claude Code

1. Open terminal
2. Navigate to this workspace: `cd medguard360`
3. Start Claude Code: `claude`
4. Claude Code will automatically read `CLAUDE.md` as its system context
5. Start building any component by telling Claude Code what you need

---

## Quick Start Commands in Claude Code

```bash
# Start Claude Code in this workspace
claude

# Then inside Claude Code, examples:
"Build the credentialing-service"
"Build the fraud-engine-service AI model"
"Build the prior-auth clinical decision engine"
"Build the patient mobile app"
"Build the state agency dashboard portal"
"Generate the EDI 837P claim submission engine"
```

---

## Stack Reference

- **Runtime:** Node.js v25.9.0 + Express.js (services), Python 3.10+ FastAPI (AI)
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- **Mobile:** React Native / Expo
- **Database:** PostgreSQL 5432–5434 + Redis 6379–6381
- **Storage:** MinIO (S3-compatible, self-hosted)
- **Queue:** Apache Kafka
- **Auth:** Clerk + JWT
- **Monitoring:** Prometheus + Grafana + AlertManager
- **Logging:** ELK Stack
- **Process:** PM2
- **Security:** nginx TLS 1.3 + iptables + fail2ban + AES-256

---

*MedGuard360 — TRG TechLink Proprietary — 2026*
