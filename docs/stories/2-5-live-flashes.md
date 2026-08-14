---
baseline_commit: dcd50bd74b11871ad5b9d7ff3f4c94ac704cb7d2
---

# Story 2.5: Live Flashes + Presence

Status: review

## Story

As a participant,
I want the board to update live when people join and leave,
so that I see the room move without refreshing.

## Acceptance Criteria

1. GIVEN a board client subscribed to the session channel WHEN a membership changes THEN the snapshot refetches and the card updates live (no page reload).
2. GIVEN a join/leave event WHEN it arrives THEN the affected card flashes green (joined) or red (left) for ~1s.

## Tasks / Subtasks

- [x] JSON board endpoint `GET /api/sessions/{code}/board` (device-token identity, snapshot reuse) + tests
- [x] Client subscription: `echo().channel('session.{code}')` listening to SessionConfigUpdated / SessionStateUpdated / GroupCreated / MembershipChanged / SessionDeleted → refetch + setState (AD-6)
- [x] Flash state on MembershipChanged (joined/left), card border + glow ~1.2s
- [x] Presence count + pool/groups all render from the refetched snapshot

## Dev Notes

- `@laravel/echo-react`: `echo` is a **function** (`echo().channel(...)`), `useConnectionStatus()` for connection state. [Source: research/laravel-guidelines.md]
- AD-6: events carry IDs + revision; client refetches the server snapshot. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]

### References

- [Source: docs/planning/epics-groupify.md#E2S5]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-3]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]

# Traceability

- FR: FR-3.3, FR-3.5 | CAP: CAP-3 | AD: AD-6

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Client blank page: `echo.channel` called on a function — the package exports `echo` as a callable (`echo().channel(...)`). Fixed.
- Browser `networkidle0` never settles with the WebSocket open — use `domcontentloaded`.

### Completion Notes List

- **Realtime proven in Chromium**: Maya's tab (marker-confirmed no reload) showed Leo joining Team Alpha live; slots 5 → 4 open; presence intact.
- 2 board API tests (62 total, 257 assertions); gates green.

### File List

- app/Http/Controllers/BoardController.php
- routes/web.php (board.show)
- resources/js/pages/Session/Show.tsx (realtime wiring)
- tests/Feature/BoardApiTest.php (2 tests)
- docs/stories/2-5-live-flashes.md (this record)

---

# Story 2.6: Snapshot Resync

Status: review

## Story

As a participant on a flaky connection,
I want the board to resync when my WebSocket reconnects,
so that I never see a stale board.

## Acceptance Criteria

1. GIVEN the Echo connection drops and reconnects WHEN the status returns to connected THEN the client refetches the full snapshot.
2. GIVEN a SessionDeleted event WHEN it arrives THEN the client shows a session-ended state.

## Tasks / Subtasks

- [x] `useConnectionStatus()` — on transition to `connected`, `refetch()` (full snapshot resync, AD-6)
- [x] SessionDeleted event → refetch; 404 on the board endpoint → "session ended" state with home link

## Dev Notes

- AD-6: reconnect always ends in a snapshot resync — no stale cards, no duplicate seats. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]
- Full page-level server-status banner (online/reconnecting/offline) is story 5-1.

### References

- [Source: docs/planning/epics-groupify.md#E2S6]
- [Source: docs/prds/prd-groupify/prd.md#FR-8.3]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]

# Traceability

- FR: FR-8.3 | CAP: CAP-9 | AD: AD-6

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None

### Completion Notes List

- Resync path wired via connection status; deletion handled; live path verified in 2-5's browser test.

### File List

- resources/js/pages/Session/Show.tsx
- docs/stories/2-6-snapshot-resync.md (this record)
