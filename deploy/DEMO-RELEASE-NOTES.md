# MedGuard360 v1.0-demo

NC DHHS laptop demo release. Container images: `ghcr.io/bigtrg/medguard360/*`.

## What is included

- **20 Node microservices** (auth, claims, PA, fraud, denial, EHR, HIE, school Medicaid, etc.)
- **5 demo AI engines**: fraud-detection (8004), fraud-ring-gnn (8005), pa-nlp-matcher (8006), denial-predictor (8007), crisis-detector (8009)
- **Next.js portals** behind nginx on port 80
- **Seeded NC demo data** with 16 role logins

## Quick start (Windows)

```powershell
powershell -ExecutionPolicy Bypass -File deploy\demo-up.ps1
```

Portal: http://localhost/ — password for all demo users: `demo-Password!1`

## Verify before a meeting

```powershell
deploy\meeting-day.ps1
deploy\meeting-day.ps1 -Full
deploy\verify-demo.ps1 -UnitTests -EngineTests
```

macOS/Linux:
```bash
./deploy/laptop.sh --meeting
./deploy/laptop.sh --meeting --full
./deploy/laptop.sh --verify
```

## Walkthrough

See `sales/NC-DHHS-DEMO-SCRIPT.md` for the 15-minute NC DHHS presentation path.