---
baseline_commit: 1a3133305171575310fe21dc9b6f730ad8ac5073
---

# Story 1.4: Auto-Rejoin by Device Token

Status: review

## Story

As a returning participant,
I want my device to be recognized automatically,
so that I land straight back in my seat without re-entering my identity.

## Acceptance Criteria

1. GIVEN a returning device (localStorage device token) WHEN it opens the join page for a session it has a seat in THEN it is redirected straight to the session page in its seat.
2. GIVEN a device with no seat in this session WHEN it opens the join page THEN the normal PIN + name form is shown.
3. GIVEN a seat check WHEN a token from a different session is presented THEN no seat is reported.

## Tasks / Subtasks

- [x] Seat-check endpoint (AC: 1, 2, 3)
  - [x] `GET /join/{session:code}/seat?token={uuid}` → `{seat: bool, name: string|null}` (JoinController@seat)
  - [x] Token validated as uuid (422 otherwise); lookup scoped to session (AC 3)
- [x] Client fast-path (AC: 1, 2)
  - [x] `Session/Join.tsx`: on mount, if device token exists → seat check → seat found → persist name → `router.visit('/s/{code}')`; no seat → show the form
  - [x] "Checking your seat…" state; fetch failures fall back to the form (never a dead screen)
- [x] Seat reuse (AC: 1) — already wired in 1-2 (`firstOrCreate` by session+token); re-verified

## Dev Notes

- FR-2.4/FR-2.5: device token is the bearer identity; one seat per (session, token) enforced by unique index (AD-7). [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]
- The seat check is read-only JSON; no CSRF needed (GET).
- Hooks rule: `useForm` must be unconditional — placed above the `checking` early return.

### Project Structure Notes

- Route: join.seat. Client: resources/js/pages/Session/Join.tsx (device token + seat check + fast-path).

### References

- [Source: docs/planning/epics-groupify.md#E1S4]
- [Source: docs/prds/prd-groupify/prd.md#FR-2.4]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]

# Traceability

- FR: FR-2.4, FR-2.5 | CAP: CAP-2 | AD: AD-3, AD-7

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Found + fixed test-isolation leak: compose.yaml env (DB_DATABASE, BROADCAST_CONNECTION, QUEUE_CONNECTION) overrode phpunit.xml `<env>` (PHPUnit doesn't override real env without `force="true"`) — test runs were wiping the shared dev SQLite file (explained vanishing curl-created sessions). Forced the three envs in phpunit.xml; tests now run on `:memory:`, dev DB stable.
- Browser `waitForUrl` pattern mismatch on the first attempt — app flow was fine (redirect verified on re-run).

### Completion Notes List

- All 3 ACs verified: 4 new Pest tests (32 total, 138 assertions) + browser flow (join once → revisit /join/{code} auto-redirects to /s/{code}, "Seat: Maya" from server lookup).
- Gates green: pint + phpstan clean, build ✓.

### File List

- app/Http/Controllers/JoinController.php (seat method)
- routes/web.php (join.seat route)
- resources/js/pages/Session/Join.tsx (seat fast-path)
- phpunit.xml (force test env isolation)
- tests/Feature/AutoRejoinTest.php (4 tests)
- docs/stories/1-4-auto-rejoin.md (this record)
