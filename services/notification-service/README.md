# notification-service

Email / SMS / push fanout. Port **3017**. Owns `notifications`.

## How other services trigger notifications

Two patterns:

**1. Explicit "requested" event** — publisher fully specifies recipient/body:
- `notification.email.requested`
- `notification.sms.requested`
- `notification.push.requested`

**2. Business event auto-template** — publisher just emits the domain event,
and notification-service looks up the template + recipient:
- `pa.approved` / `pa.denied`
- `claim.paid`, `fraud.flag.raised`
- `credentialing.approved` / `credentialing.denied`
- `crisis.alert.raised`

Templates live in `src/templates.ts` keyed by event type. Substitution syntax
is `{varName}` — pulled from the event payload.

## Vendors (stubbed)

- email → SES
- sms → Twilio
- push → FCM

`src/vendors.ts` is the swap point. Real adapters call vendor SDKs.

## REST endpoint

`POST /api/v1/notifications/send` — synchronous send (emits the matching
`notification.<channel>.requested` topic and returns 202). Useful for ad-hoc
messages from portals.

## Persistence

Every send (success or failure) gets an `notifications` row with attempts,
last_error, vendor_message_id. Failed sends can be retried via cron later.
