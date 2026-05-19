# pharmacy-service

NCPDP D.0 pharmacy claims + formulary checks. Port **3011**.
Owns `pharmacy_claims`, `formulary_entries`.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST   | `/api/v1/pharmacy/claims`                       | pharmacy + biometric | Submit a pharmacy claim |
| GET    | `/api/v1/pharmacy/claims/:id`                   | RLS-scoped | Read claim |
| GET    | `/api/v1/pharmacy/formulary/:state/:payer/:ndc` | any | Formulary lookup |

## Flow

1. Formulary lookup: is the NDC on the payer's formulary? PA required?
   Step-therapy required? Quantity limit?
2. NCPDP D.0 validation: NDC format, NPI format, quantity, days supply
3. Generate NCPDP D.0 payload (`src/ncpdp.ts`)
4. Persist claim, emit `claim.submitted` (with `claimKind: pharmacy` so
   fraud-engine handles it uniformly)

## NCPDP D.0

Minimal but well-formed: BIN/PCN/VER header, insurance/patient/pharmacy/
claim/pricing segments. Production wiring runs through a clearinghouse or
direct payer NCPDP gateway.
