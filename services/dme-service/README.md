# dme-service

DMEPOS (Durable Medical Equipment) orders + HCPCS validation. Port **3012**.
Owns `dme_orders`.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST   | `/api/v1/dme/orders`              | supplier/provider | Create order, validate HCPCS rules |
| POST   | `/api/v1/dme/orders/:id/status`   | supplier/admin/billing | Lifecycle state change |
| GET    | `/api/v1/dme/orders/:id`          | RLS-scoped | Read |

## HCPCS validation (`src/hcpcs.ts`)

Per-code rules: PA required, Certificate of Medical Necessity required,
rental-eligible, monthly quantity cap.

Seed rules cover E0601 (CPAP), E0470 (BiPAP), E1390 (oxygen concentrator),
K0001 (wheelchair), A4253 (test strips), A4259 (lancets). Production loads
the full DMEPOS fee schedule from CMS.

## Status lifecycle

`pending` → `approved` → `delivered` → `billed` (creates claim) →
`paid`/`denied`/`cancelled`

## Events emitted

- `dme.order.created`
- `dme.order.status.changed`
