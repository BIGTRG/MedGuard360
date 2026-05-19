# hub-service

Statewide 1-800 hub. Port **3015**. Owns `hub_calls`, `hub_tickets`.

Each state has its own toll-free number (configured in `state_configs.hub_phone_number`).
Calls land here via the telephony gateway, get routed through an AI chatbot,
and escalate to humans when needed.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST   | `/api/v1/hub/calls`                    | Telephony webhook — start call |
| POST   | `/api/v1/hub/calls/:id/end`            | Telephony webhook — end call |
| POST   | `/api/v1/hub/chat`                     | AI intent classify a chat message |
| POST   | `/api/v1/hub/tickets`                  | Create a ticket (from chat, IVR, or web form) |
| GET    | `/api/v1/hub/tickets`                  | List open/in-progress, priority-sorted |
| POST   | `/api/v1/hub/tickets/:id/assign`       | Assign to agent |
| POST   | `/api/v1/hub/tickets/:id/resolve`      | Resolve with disposition |

## Intent classifier

`src/intent.ts` recognizes 6 intents: crisis, eligibility, claim_status,
provider_lookup, prior_auth, complaint (+ `other` fallback).

**Crisis handling**:
1. Any crisis-language match auto-creates an `urgent` ticket
2. Emits `crisis.alert.raised` Kafka event
3. notification-service picks up event → SMS the on-call crisis team
4. Chatbot reply: "You are in the right place. I am connecting you to a crisis-trained agent now."

## Production wiring

Today the routes assume an authenticated bearer token from the telephony
gateway. Real deployment fronts this with:
- Twilio / AWS Connect SIP trunk → state's toll-free number
- Webhook hits this service with caller ANI + state
- Voice → speech-to-text engine → /hub/chat → text-to-speech response
- If `shouldHandoff: true`, transfer to live agent queue
