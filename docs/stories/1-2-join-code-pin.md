---
baseline_commit: 984ca9a32783efbb0208cc59f5ad345b8d696439
---

# Story 1.2: Join by Code + PIN

Status: review

## Story

As a participant,
I want to join a session by entering its code and PIN with my name,
so that I land in the room as a seat on this device.

## Acceptance Criteria

1. GIVEN a participant who enters the session code WHEN they open the join page THEN they see a PIN + name entry and clear errors on wrong PIN / unknown code.
2. GIVEN the correct PIN WHEN they submit name (required) + email (optional) THEN they land on the session page and a participant row exists for their device token.
3. GIVEN the same device token WHEN it joins again THEN it reuses its existing seat (no duplicates).

## Tasks / Subtasks

- [x] Participants table + model (AD-7)
  - [x] Migration `create_participants_table`: group_session_id FK cascade, uuid token, name, nullable email; unique (session, token)
  - [x] `app/Models/Participant.php` + `ParticipantFactory`
- [x] Join flow (FR-2.1, FR-2.3)
  - [x] `GET /join/{session:code}` → `Session/Join` page (PIN never exposed in page props)
  - [x] `POST /join/{session:code}` → validate pin (digits:4) + name (required) + email (nullable|email) + device_token (required|uuid)
  - [x] Wrong PIN → `ValidationException::withMessages(['pin' => 'Wrong PIN.'])` — 422, clear error, no lockout
  - [x] Unknown code → 404 (route binding by code)
  - [x] Seat reuse: `firstOrCreate(session+token)` — same device rejoins its seat (also core of 1-4)
  - [x] Non-live sessions → 404 on join
- [x] Session page + routes
  - [x] `GET /s/{session:code}` → `Session/Show` placeholder (pool + board land in Epic 2)
  - [x] Device token: client-generated UUID persisted to localStorage (`groupify.device_token`); name persisted for display (`groupify.participant_name`)

## Dev Notes

- AD-7: one participant row per (session, device token) — unique index enforces the seat model. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]
- AD-3: no accounts; the device token is the bearer identity for later mutations (X-Device-Token header pattern lands with Epic 2). [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-3]
- PIN never leaves the server in page props — join page receives only the code.
- Validation errors: HTML requests get 302-back (flash), JSON gets 422 — tests use postJson for the 422 assertions.

### Project Structure Notes

- Routes: join.show / join.store / session.show. Pages: resources/js/pages/Session/{Join,Show}.tsx.
- Participants table is the first cross-table FK (group_sessions → participants, cascade).

### References

- [Source: docs/planning/epics-groupify.md#E1S2]
- [Source: docs/prds/prd-groupify/prd.md#FR-2.1]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-2]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]

# Traceability

- FR: FR-2.1, FR-2.3 | CAP: CAP-2 | AD: AD-3, AD-7

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Live smoke greps failed twice on SSR HTML (React comment nodes split text; asset hashes matched the 6-digit pattern) — switched to the Inertia page JSON (`"code":"…"`) for reliable extraction

### Completion Notes List

- All ACs verified: 9 new Pest tests (28 total, 131 assertions) + live HTTP smoke (join 200 → wrong PIN 422 → correct 302 → session page 200).
- Gates green: pint + phpstan clean, `npm run build` ✓.

### File List

- database/migrations/2026_08_14_000001_create_participants_table.php
- app/Models/Participant.php
- database/factories/ParticipantFactory.php
- app/Http/Controllers/JoinController.php
- app/Http/Controllers/SessionPageController.php
- routes/web.php
- resources/js/pages/Session/Join.tsx
- resources/js/pages/Session/Show.tsx
- tests/Feature/JoinSessionTest.php (9 tests)
- docs/stories/1-2-join-code-pin.md (this record)

