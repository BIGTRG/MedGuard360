# hie-service

FHIR R4 HIE gateway. Port **3020**. Owns `hie_referrals`, `hie_consents`.

CMS Interoperability Final Rule compliance: provides FHIR R4 resources for
ServiceRequest, Consent, and Patient. Real HIEs and payer ecosystems will
read/write these.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST   | `/api/v1/hie/referrals`               | Create FHIR ServiceRequest + persist |
| GET    | `/api/v1/hie/referrals/:id`           | Read referral |
| POST   | `/api/v1/hie/consents`                | Record FHIR Consent (42 CFR Part 2 / HIPAA) |
| POST   | `/api/v1/hie/consents/:id/revoke`     | Patient revokes consent |
| GET    | `/api/v1/hie/patients/:id/consents`   | Active consents for a patient |

## FHIR builders (`src/fhir.ts`)

- `buildServiceRequest()` — referral with priority, requester, subject
- `buildConsent()` — patient privacy consent with scope + period + actor
- `buildPatient()` — Patient resource with identifiers/telecom/birthDate

## Events emitted

- `hie.referral.created`
- `hie.consent.granted` / `hie.consent.revoked`

## What's left for full FHIR compliance

- CapabilityStatement at `/fhir/metadata`
- SMART-on-FHIR OAuth scopes (separate from internal Clerk JWTs)
- Patient $everything operation for the Interoperability rule
- ETag + If-Match versioning headers
- Subscription support for HIE push
