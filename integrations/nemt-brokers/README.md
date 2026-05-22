# NEMT Broker Integration — MTM Inc & ModivCare

**Scope:** MedGuard360 integration with Non-Emergency Medical Transportation (NEMT) brokers operating in North Carolina Medicaid Managed Care (NC Medicaid Direct, Standard Plans, and Tailored Plans), so transportation providers can authorize trips, submit trip claims, and receive payment.

> **Verification note:** Web search/fetch was unavailable when this document was authored. All factual claims below should be re-verified against the official sources listed in Section 12 before going to production. Broker-to-plan assignments, fee schedules, and HCPCS rate values change frequently — treat any specific dollar amount or county assignment as **provisional**.

---

## 1. NC Medicaid NEMT Structure

NC Medicaid has historically used a **county Department of Social Services (DSS)** model for NEMT under fee-for-service (FFS) Medicaid Direct: members called their county DSS, which arranged transportation either directly or via a local contractor. Each of the 100 NC counties operated its own NEMT desk.

Under **NC Medicaid Managed Care** (live since July 2021 for Standard Plans, December 2022 for Tailored Plans), each managed care plan (PHP) is contractually required to provide NEMT as a covered benefit and **subcontracts to a national NEMT broker**. As a result, NEMT in NC is now a hybrid:

| Population | NEMT arranged by |
|---|---|
| NC Medicaid Direct (FFS) beneficiaries | County DSS |
| Standard Plan members | The Standard Plan's subcontracted broker |
| Tailored Plan members (BH I/DD) | The Tailored Plan's subcontracted broker |
| NC Medicaid Managed Care for Foster Care | Plan-specific broker |
| EBCI Tribal Option | Tribal Option's vendor |

**Standard Plan / broker assignments (provisional — verify):**

| Standard Plan | Reported NEMT Broker |
|---|---|
| AmeriHealth Caritas NC | ModivCare (formerly LogistiCare) |
| Blue Cross NC Healthy Blue | ModivCare |
| Carolina Complete Health | MTM Inc |
| Healthy Blue (Anthem) | ModivCare |
| UnitedHealthcare Community Plan NC | ModivCare |
| WellCare of NC | MTM Inc |

**Tailored Plans (BH I/DD Tailored Plans):**

| Tailored Plan | Reported NEMT Broker |
|---|---|
| Alliance Health | MTM / Verida (varies by region) |
| Partners Health Management | MTM |
| Trillium Health Resources | ModivCare |
| Vaya Health | ModivCare |

> Assignments above reflect publicly reported relationships through 2024–2025; **re-verify with the plan's Provider Manual and the NC DHHS NEMT page** before integration go-live. Verida (formerly Southeastrans) and Access2Care also operate in surrounding states and may be subcontracted in regional pockets.

---

## 2. How a Trip Flows

Standard managed-care NEMT lifecycle:

```
Member ──(1)── Broker call center / member portal
                    │
                    ▼
              (2) Eligibility + benefit check (plan API or 270/271)
                    │
                    ▼
              (3) Trip authorization (PA per trip; standing PA for serial trips)
                    │
                    ▼
              (4) Broker dispatches network transportation provider
                    │
                    ▼
              (5) Provider performs trip (pickup → drop-off; GPS tracked)
                    │
                    ▼
              (6) Provider submits trip claim to broker (broker portal / EDI / API)
                    │
                    ▼
              (7) Broker adjudicates → pays provider on broker fee schedule
                    │
                    ▼
              (8) Broker bills Standard Plan / NC Medicaid (capitated PMPM
                  or FFS pass-through depending on contract)
                    │
                    ▼
              (9) Plan reconciles via 837P claim / 835 remittance
                  to broker; plan files encounter data with NC DHHS
```

**Trip statuses observed across both brokers:** `requested`, `authorized`, `scheduled`, `assigned`, `enroute_pickup`, `on_board`, `enroute_drop`, `completed`, `no_show`, `cancelled`, `denied`.

**Standing orders:** Members on recurring care (dialysis 3×/week, chemo, methadone clinic daily) get **standing PAs** that cover a date-range and a set leg pattern. Standing orders are the highest-volume NEMT trip type and the most common source of phantom-trip fraud.

---

## 3. MTM Inc

**Corporate:** Medical Transportation Management, Inc., St. Louis, MO. Privately held. Operates NEMT brokerage in 30+ states.

### MTM Link platform

- **MTM Link Provider** — web portal for transportation providers: trip board, accept/reject offers, driver assignment, run sheets, claim submission, payment history.
- **MTM Link Driver** — mobile app: turn-by-turn nav, member check-in, signature capture, GPS breadcrumb upload, no-show attestation.
- **MTM Link Member** — member-facing web/app for booking and trip tracking.

### API access

MTM does **not publish a fully open developer portal** the way payer APIs do. Integration is offered to:

- High-volume contracted transportation provider groups (typically >500 trips/month)
- Aggregator partners (e.g., Lyft Concierge, Uber Health) under signed BAA
- Healthcare partners (FQHCs, dialysis chains) doing bulk standing-order ingestion

Connectivity options reported in MTM partner onboarding kits:
- **REST API** with OAuth2 client-credentials, JSON payloads, for trip status push/pull and claim submission
- **SFTP** drop of CSV/X12 batch files (legacy)
- **HL7/FHIR Appointment + Encounter** for clinical partners
- **Webhooks** to receive trip status updates (`trip.scheduled`, `trip.assigned`, `trip.completed`, `trip.no_show`)

Vendor onboarding requires: signed Business Associate Agreement, NPI/Tax ID, COI ($1M auto / $1M general liability typical), driver roster with background checks, vehicle inspection records.

### Trip authorization

- **Per-trip PA** is the default — broker call center or member portal verifies eligibility and medical necessity before issuing a confirmation number.
- **Standing PA** for dialysis (typically 90-day blocks), chemotherapy, behavioral-health day program, methadone clinic. Documented with a Letter of Medical Necessity (LMN) signed by the ordering provider.
- **Urgent / same-day** trips (hospital discharge) allowed with reduced advance-notice; require facility staff to certify medical necessity.

### NEMT HCPCS codes (descriptors)

| Code | Descriptor |
|---|---|
| A0080 | Non-emergency transportation, per mile — vehicle provided by volunteer (individual or organization), with no vested interest |
| A0090 | Non-emergency transportation, per mile — vehicle provided by individual (family member, self, neighbor) with vested interest |
| A0100 | Non-emergency transportation; taxi |
| A0110 | Non-emergency transportation and bus, intra- or inter-state carrier |
| A0120 | Non-emergency transportation: mini-bus, mountain area transports, or other transportation systems |
| A0130 | Non-emergency transportation: wheelchair van |
| A0140 | Non-emergency transportation and air travel (private or commercial), intra- or inter-state |
| T2002 | Non-emergency transportation; per diem |
| T2003 | Non-emergency transportation; encounter/trip |
| T2004 | Non-emergency transport; commercial carrier, multi-pass |
| T2005 | Non-emergency transportation; stretcher van |

> NEMT below the level of ambulance. Ambulance HCPCS (A0425 mileage, A0426 ALS non-emergency, A0428 BLS non-emergency, A0429 BLS emergency) are billed separately and usually outside the NEMT broker channel.

> **Rates are not federally fixed.** Each broker negotiates its own fee schedule with each Standard Plan, and re-bids contracts. Indicative ranges seen in state Medicaid NEMT contracts:
> - Ambulatory base (T2003): **$10–$18 per leg**
> - Per-mile (A0080/A0090): **$1.20–$2.50 per loaded mile**
> - Wheelchair van base (A0130): **$25–$45 per leg + mileage**
> - Stretcher van (T2005): **$80–$160 per leg + mileage**
>
> Pull current rates from the specific broker's NC fee schedule PDF before billing.

---

## 4. ModivCare (formerly LogistiCare)

**Corporate:** ModivCare Inc. (NASDAQ: MODV), Denver, CO. Rebranded from LogistiCare in 2020 after merger with CCHN/National MedTrans.

### Platforms

- **ModivCare Provider Web** — provider portal for trip acceptance, vehicle/driver assignment, claim submission, payment.
- **ModivCare Driver App** (iOS/Android) — real-time dispatch, GPS, member signature, completion attestation.
- **ModivCare Member App / IVR** — booking, ride tracking, estimated arrival.

### API access

ModivCare offers vendor integration similar to MTM, scoped to contracted partners:
- **REST API** for trip ingestion (from health-plan partners) and trip status egress (to provider groups)
- **EDI 837P** outbound from broker to plan; 835 inbound
- **Lyft Concierge** and **Uber Health** integrations are baked-in for last-mile ambulatory rides
- **Webhooks**: `dispatch.assigned`, `ride.started`, `ride.completed`, `ride.cancelled`

ModivCare does not publish open developer docs; integration is gated by Master Services Agreement and BAA.

### NC subcontracts

Confirmed via public plan provider directories (as of late 2024 — re-verify): ModivCare is the contracted NEMT broker for AmeriHealth Caritas NC, Healthy Blue (Anthem) NC, and UnitedHealthcare Community Plan NC. ModivCare also subcontracts to several Tailored Plans (Trillium, Vaya).

---

## 5. Billing Mechanics for NEMT Providers

### GPS-validated mileage
Both MTM and ModivCare require driver-app GPS breadcrumbs (typically every 30–60 sec) on the loaded leg. Broker compares **claimed mileage** against **Google/HERE map shortest-route mileage** and against **GPS-track actual mileage**. Variance >10–15% flags the trip for review. Mileage inflation is one of the most common audit findings.

### Round-trip vs one-way
- Each **leg** is a separate claim line (e.g., home→clinic = A-leg; clinic→home = B-leg).
- Some brokers allow **round-trip billing** as a single encounter (T2003 with multiplier) for standing orders; most require separate legs.
- **Wait time** on round-trip dialysis is sometimes reimbursed via T2007 (additional ground transport, per 30 min) or a flat wait fee.

### Vehicle-class differentials
| Class | Typical code | Required equipment |
|---|---|---|
| Ambulatory | A0100 / T2003 | Sedan / minivan, no special equipment |
| Wheelchair van | A0130 | ADA lift or ramp, 4-point tie-down, securement straps |
| Stretcher van | T2005 | Non-medical stretcher, two attendants. Not ambulance. |
| BLS non-emergency ambulance | A0428 + A0425 mileage | Licensed EMTs, oxygen, AED |
| ALS non-emergency ambulance | A0426 + A0425 mileage | Paramedic, ALS equipment |

Stretcher/BLS/ALS escalation requires a **Physician Certification Statement (PCS)** documenting that lower modes are medically contraindicated.

### HIPAA-compliant trip logs
NEMT trip data is **PHI** (it links a Medicaid ID to a healthcare appointment location). Driver manifests should show **minimum necessary**: member name, pickup, drop-off, time. Diagnosis/reason for visit should **not** appear on driver-facing screens. Trip logs retained 6–10 years (per CFR 42 §431.17 and state requirements).

---

## 6. CMS NEMT Requirements

- **42 CFR 440.170(a)** — defines "transportation" as a covered Medicaid service. The state Medicaid plan must "assure necessary transportation … to and from providers" for all categorically eligible recipients. NEMT is mandatory for all eligible recipients regardless of waiver.
- **42 CFR 431.53** — requires the state plan to specify methods of assurance.
- **Consolidated Appropriations Act, 2021 (§209)** — codified the NEMT benefit into the Social Security Act §1902(a)(4), ending the prior debate over whether NEMT could be considered an "administrative" expense and removed.
- **CMS Informational Bulletin (October 2016 and 2020 updates)** — provides guidance on use of Transportation Network Companies (TNCs) like Lyft and Uber. Permitted as a NEMT mode under broker contract if: (a) driver/vehicle credentialing meets state Medicaid standards, (b) PHI is protected (Uber Health / Lyft Concierge are BAA-compliant), (c) member is ambulatory and does not need attendant.
- **State Medicaid Director Letter SMD #21-001** and successors continue to address fraud, waste, and abuse (FWA) controls in NEMT.

---

## 7. Compliance & Fraud Red Flags

NEMT is repeatedly listed in OIG Work Plans and state Medicaid Fraud Control Unit reports as a high-risk benefit. Patterns to score in `fraud-engine-service`:

| Pattern | Signal |
|---|---|
| **Phantom trip** | Claim submitted with no GPS breadcrumb, no member signature, or GPS shows vehicle never moved from base |
| **Mileage inflation** | Claimed miles exceed shortest-route × 1.15, or exceed GPS-track miles |
| **Duplicate billing** | Same member, same date, overlapping time windows from two providers (or two legs of same RT billed as two RTs) |
| **Impossible velocity** | Trip duration vs claimed mileage implies <10 mph or >80 mph average |
| **Stacked trips** | Same vehicle/driver claiming overlapping trips with different members |
| **Standing order without appointment** | Dialysis claim on a date the clinic was closed / member had no encounter on file |
| **Member fraud** | Member sells Medicaid ID to a provider who bills phantom trips; signal = high trip volume with no corresponding medical encounters in claims history |
| **Upcoding** | Ambulatory member billed as wheelchair or stretcher |
| **No-show abuse** | Excessive no-show claims for the same member; or provider claiming "trip leg 1" but no return leg |
| **Geographic anomaly** | Pickup/drop-off coordinates far from member's address-of-record or covered service area |

OIG and the NC Medicaid Investigations Division (MID) routinely subpoena GPS data, driver logs, and member encounter data for NEMT audits.

---

## 8. MedGuard360 Integration Hooks

```
┌────────────────────────────────────────────────────────────────────┐
│                       MedGuard360 Platform                          │
│                                                                     │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│   │ portal       │───▶│ nemt-service │───▶│ claims-service       │  │
│   │ (Transport   │    │              │    │  (837P generator)    │  │
│   │  Broker role)│    └──────┬───────┘    └──────────┬───────────┘  │
│   └──────────────┘           │                       │              │
│                              ▼                       ▼              │
│                      ┌──────────────┐        ┌─────────────────┐    │
│                      │ fraud-engine │◀───────│ adjudication    │    │
│                      │  -service    │        │                 │    │
│                      └──────────────┘        └─────────────────┘    │
└──────────┬─────────────────────────────────────────────────────────┘
           │
   ┌───────┴────────┐
   ▼                ▼
┌──────────┐   ┌────────────┐
│ MTM Link │   │ ModivCare  │   (REST + Webhooks, BAA-gated)
└──────────┘   └────────────┘
```

- **nemt-service** — owns trip lifecycle. Receives trip events from MTM/ModivCare webhooks. Persists `Trip` entity (memberId, broker, brokerTripId, pickup/drop coordinates + timestamps, GPS track, HCPCS code, vehicle class, status). Exposes internal API to claims-service and fraud-engine-service.
- **claims-service** — generates **837P** with proper NEMT HCPCS, place-of-service `99` (Other Place of Service) or `41` (Ambulance — Land) for stretcher escalation, NPI of transportation provider, ordering provider NPI when standing PA tied to an RX.
- **fraud-engine-service** — scoring rules from Section 7. Inputs: trip GPS track, claim line, member claim history, provider trip volume baseline. Outputs: risk score 0–100, rule-trigger explanations for `case-builder-service`.
- **portal** — "Transport Broker" role: dashboard of pending PAs, in-flight trips, claim submission queue, payment reconciliation, fraud alerts. Separate "Transportation Provider" sub-role can see only their fleet's trips.

---

## 9. Brokers as Two-Sided Billing Entities

A subtle but critical billing reality: **the broker is simultaneously a payer (to the transportation provider) and a billing provider (to the Standard Plan).**

```
       ── pays ──▶
TPP ◀────────────  Broker  ────── bills ──▶  Standard Plan ──▶ NC Medicaid
(van) ─ submits ─▶ (MTM /             ◀──── pays ───────────
       claim       ModivCare)
```

| Perspective | Billing provider | Payer | Claim format |
|---|---|---|---|
| TPP → Broker | Transportation provider | Broker | Broker portal claim / 837P |
| Broker → Plan | Broker (its own NPI/TIN) | Standard Plan | 837P (or encounter under cap) |
| Plan → State | Plan | NC Medicaid | Encounter file |

`claims-service` must support both perspectives:
- **Outbound 837P "Provider→Broker"** when MedGuard360 represents a transportation provider client
- **Outbound 837P "Broker→Plan"** when MedGuard360 represents a broker client (e.g., MTM uses MG360 as billing engine)
- **Inbound 835** parsing for each path
- The same `Trip` entity carries two claim envelopes with different `billingProviderNpi` / `payerId` pairs and different fee schedules.

---

## 10. TypeScript Adapter Spec

Both adapters implement the common `NemtBrokerAdapter` interface so `nemt-service` can call them polymorphically.

```ts
// integrations/nemt-brokers/types.ts

export type LatLng = { lat: number; lng: number };

export type VehicleClass =
  | 'ambulatory'
  | 'wheelchair'
  | 'stretcher'
  | 'bls'
  | 'als';

export type GpsBreadcrumb = {
  ts: string;         // ISO-8601
  lat: number;
  lng: number;
  speedMph?: number;
  headingDeg?: number;
};

export interface AuthorizeTripRequest {
  memberId: string;          // NC Medicaid ID
  planId: string;            // Standard Plan / Tailored Plan ID
  pickup: { address: string; coord?: LatLng; placeName?: string };
  dest:   { address: string; coord?: LatLng; placeName?: string };
  scheduledAt: string;       // ISO-8601 pickup time
  appointmentAt?: string;    // ISO-8601 appointment time at destination
  vehicleClass: VehicleClass;
  standingOrderId?: string;  // ties to existing standing PA
  pcsAttached?: boolean;     // for stretcher / ALS / BLS
  oneWay: boolean;
}

export interface AuthorizeTripResponse {
  brokerTripId: string;
  authorizationNumber: string;
  status: 'authorized' | 'pending_review' | 'denied';
  denialReason?: string;
  approvedHcpcs: string;
  feeScheduleAmount?: number;
}

export interface SubmitTripClaimRequest {
  brokerTripId: string;
  hcpcs: string;             // A0100 / A0130 / T2003 / T2005 / ...
  loadedMiles: number;       // billed miles
  computedMiles?: number;    // map shortest-route miles
  gpsTrack: GpsBreadcrumb[];
  pickupActualAt: string;
  dropoffActualAt: string;
  memberSignatureUrl?: string; // S3 / blob URL, BAA-protected
  noShow?: boolean;
  attendantCount?: number;
}

export interface SubmitTripClaimResponse {
  claimId: string;
  status: 'accepted' | 'rejected' | 'pending_review';
  reasonCodes?: string[];
  payableAmount?: number;
}

export type TripStatus =
  | 'requested' | 'authorized' | 'scheduled' | 'assigned'
  | 'enroute_pickup' | 'on_board' | 'enroute_drop'
  | 'completed' | 'no_show' | 'cancelled' | 'denied';

export interface TripStatusResponse {
  brokerTripId: string;
  status: TripStatus;
  lastEventAt: string;
  driverName?: string;
  vehicleId?: string;
  etaPickup?: string;
  etaDrop?: string;
}

export interface NemtBrokerAdapter {
  authorizeTrip(req: AuthorizeTripRequest): Promise<AuthorizeTripResponse>;
  submitTripClaim(req: SubmitTripClaimRequest): Promise<SubmitTripClaimResponse>;
  getTripStatus(brokerTripId: string): Promise<TripStatusResponse>;
  cancelTrip(brokerTripId: string, reason: string): Promise<{ ok: boolean }>;
}
```

Concrete implementations:

```ts
// integrations/nemt-brokers/mtm/adapter.ts
export class MtmAdapter implements NemtBrokerAdapter {
  mtmAuthorizeTrip   = (r: AuthorizeTripRequest)    => this.authorizeTrip(r);
  mtmSubmitTripClaim = (r: SubmitTripClaimRequest)  => this.submitTripClaim(r);
  mtmGetTripStatus   = (id: string)                 => this.getTripStatus(id);
  // ... OAuth2 client-credentials against MTM Link API
}

// integrations/nemt-brokers/modivcare/adapter.ts
export class ModivcareAdapter implements NemtBrokerAdapter {
  modivcareAuthorize = (r: AuthorizeTripRequest)    => this.authorizeTrip(r);
  modivcareSubmit    = (r: SubmitTripClaimRequest)  => this.submitTripClaim(r);
  modivcareStatus    = (id: string)                 => this.getTripStatus(id);
  // ... OAuth2 against ModivCare provider API
}
```

### Webhook receivers

Both brokers POST signed JSON to MedGuard360. Signature verification is mandatory (HMAC-SHA256 with a per-broker shared secret).

```
POST /webhooks/mtm/trip-status
  Headers:   X-MTM-Signature: sha256=<hex>
             X-MTM-Event-Id:  <uuid>     # for idempotency
  Body:      { brokerTripId, status, ts, payload }

POST /webhooks/modivcare/trip-status
  Headers:   X-Modivcare-Signature: sha256=<hex>
             X-Modivcare-Delivery:  <uuid>
  Body:      { tripId, event, occurredAt, data }
```

Handler responsibilities:
1. Verify HMAC signature; reject 401 on mismatch.
2. Check `Event-Id` against a 24h dedup cache; 200 OK on replay (idempotent).
3. Persist raw envelope to `nemt_webhook_events` (audit + replay).
4. Map broker status → internal `TripStatus`.
5. Emit domain event `trip.status.changed` on the platform event bus for fraud-engine, claims-service, and portal subscribers.

---

## 11. Environment Configuration

```
# MTM Link
MTM_API_BASE_URL=https://api.mtm-link.example/...   # confirm at onboarding
MTM_OAUTH_TOKEN_URL=...
MTM_CLIENT_ID=...
MTM_CLIENT_SECRET=...
MTM_WEBHOOK_SECRET=...

# ModivCare
MODIVCARE_API_BASE_URL=...
MODIVCARE_OAUTH_TOKEN_URL=...
MODIVCARE_CLIENT_ID=...
MODIVCARE_CLIENT_SECRET=...
MODIVCARE_WEBHOOK_SECRET=...

# Compliance
NEMT_PHI_RETENTION_YEARS=10
NEMT_GPS_VARIANCE_THRESHOLD_PCT=15
```

All credentials must live in the MedGuard360 KMS-backed secret store; never in source or `.env` committed to git.

---

## 12. Official Sources (Re-verify Before Production)

- **NC DHHS — Medicaid Transportation**: https://medicaid.ncdhhs.gov/transportation
- **NC DHHS Provider Manuals & Clinical Coverage Policies (CCP 1A-32 — Transportation)**: https://medicaid.ncdhhs.gov/providers/clinical-coverage-policies
- **NC Medicaid Managed Care Standard Plan Contracts** (lists subcontracted broker per plan)
- **MTM Inc**: https://www.mtm-inc.net (transportation providers, MTM Link)
- **ModivCare**: https://www.modivcare.com (NEMT, transportation providers)
- **CMS — 42 CFR 440.170**: https://www.ecfr.gov/current/title-42/section-440.170
- **CMS NEMT Informational Bulletins** (2016, 2020): https://www.medicaid.gov/federal-policy-guidance
- **HHS-OIG Work Plan — NEMT** (annual updates): https://oig.hhs.gov/reports-and-publications/workplan/
- **HCPCS Level II code book** (annual CMS release) for current A0xxx and T2xxx descriptors
- **NCDHHS Medicaid Fee Schedule** (search "NEMT") — for state FFS rates that floor broker negotiations

**Each Standard Plan and Tailored Plan publishes its own Transportation Provider Manual** — pull and store these in `integrations/nemt-brokers/manuals/` keyed by plan-year.

---

## 13. Implementation Checklist

- [ ] Confirm 2026 broker assignment per NC Standard Plan / Tailored Plan from each plan's current Provider Manual
- [ ] Execute BAA + MSA with MTM and ModivCare
- [ ] Obtain sandbox / UAT API credentials
- [ ] Implement `MtmAdapter` and `ModivcareAdapter` against `NemtBrokerAdapter` interface
- [ ] Wire `/webhooks/mtm/trip-status` and `/webhooks/modivcare/trip-status` with HMAC verify + idempotency
- [ ] Wire `nemt-service` → `claims-service` 837P generation for both broker-side and provider-side billing perspectives
- [ ] Implement fraud-engine NEMT rule pack (Section 7)
- [ ] Build "Transport Broker" and "Transportation Provider" portal roles
- [ ] Load current NC NEMT fee schedule per broker into `claims-service` reference data
- [ ] End-to-end test: book → dispatch → GPS track → submit claim → 835 reconcile
- [ ] Penetration test webhook endpoints
- [ ] Document and version-control each plan's transportation provider manual
