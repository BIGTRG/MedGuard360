# NCTracks Ramp Certification & Sandbox Go-Live

Use this checklist after GDIT issues TPID, SUBMITTER_ID (TSN), and connectivity credentials.
MedGuard360 adapter: `integrations/nctracks/` (74 automated tests).

## Track A — Trading partner (you)

- [ ] Forward signed TPA to **NCMMIS_EDI_Support@gdit.com**
- [ ] Apply for **NCID** for each portal user
- [ ] Receive **TPID** + **TSN** (ISA06/GS02 submitter ID)
- [ ] Store certs/keys in `/opt/credential-vault/nctracks/` (never commit)

## Track B — Environment

Set `NCTRACKS_MODE=live` plus GDIT-issued URLs, TPID, TSN, mTLS certs, and SFTP key.
See `.env.example` and `sales/NCTRACKS-TPA-PACKET.md` for the full variable list.

Preflight:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\nctracks-sandbox-check.ps1
```

## Edifecs Ramp (certify each transaction type)

| Txn | MedGuard360 surface |
|-----|---------------------|
| 270/271 | eligibility-service |
| 276/277 | POST /api/v1/nctracks/claim-status |
| 837P | POST /api/v1/claims/:id/submit (NC) |
| 999/277CA | poll-acks |
| 835 | poll-remittances |

Ramp portal: https://nctracks.rampmanagement.com

## Prometheus metrics (claims-service /metrics)

- `nctracks_realtime_latency_ms{txn}`
- `nctracks_batch_files_in_total{type}`
- `nctracks_batch_files_out_total{type}`
- `nctracks_ack999_reject_total`

Support: **NCMMIS_EDI_Support@gdit.com**