# @medguard360/mobile

React Native (Expo SDK 52) app for MedGuard360.

## What's here

- **Offline-first** — SQLite cache for reads, outbox pattern for writes
- **Secure tokens** — Keychain (iOS) / Keystore (Android) via expo-secure-store,
  NEVER AsyncStorage (which is plain-text on Android)
- **Device biometric + vendor biometric** — Phase 1 unlocks via Face ID /
  Touch ID, phase 2 submits to our `/auth/biometric/verify` which dispatches
  to Suprema or NEC per state
- **Auto-refresh** of JWT on 401 (same pattern as the web portal)

## Screens implemented

| Screen | Purpose |
|--------|---------|
| `LoginScreen`     | Email + password → JWT |
| `BiometricScreen` | Face ID / Touch ID + server-side vendor verify |
| `HomeScreen`      | Welcome + biometric banner + outbox-sync status + 4 action tiles |
| `EncounterScreen` | Start encounter → capture note → server-side NLP coding |

## What's stubbed

These screens are intentionally minimal. Production fills out:
- patient search (camera QR scan + barcode + text)
- claim submission flow
- PA submission with photo capture of clinical docs
- crisis plan responder view (biometric-required)
- audio capture → speech-to-text → encounter transcription

## Local dev

```bash
cd frontend/mobile
npm install
# point at the local docker-compose nginx (Android emulator uses 10.0.2.2):
MEDGUARD_API_BASE=http://10.0.2.2/api npm start
```

Then `i` for iOS simulator or `a` for Android, or scan the QR code with Expo Go.

## Production builds

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

(EAS config in `eas.json` once you create an Expo account and run `eas init`.)

## Offline-first model

- **Reads** (`get()` in `lib/api.ts`): try network → fall back to SQLite
  cache (5-min TTL by default). Successful reads repopulate the cache.
- **Writes** (`send()`): if network fails, the request goes to a SQLite
  outbox. `syncOutbox()` is called on app foreground + after login + after
  a successful write that previously failed.

This means a provider on a poor cellular connection (home visit, rural
school) can keep documenting; everything syncs when they have signal again.
