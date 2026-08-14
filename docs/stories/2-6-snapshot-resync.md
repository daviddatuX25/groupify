# Story 2.6: Snapshot Resync

Status: ready-for-dev

## Story

As a participant,
I want my screen to resync after a connection drop,
so that I never see stale cards or duplicate seats.

## Acceptance Criteria

1. GIVEN a client that reconnects after a connection drop WHEN the connection is restored THEN it fetches the full session snapshot and renders from it.
2. GIVEN the resynced render WHEN it completes THEN there are no stale cards and no duplicate seats.

## Tasks / Subtasks

- [ ] Build the snapshot endpoint (AC: 1)
  - [ ] `GET /sessions/{code}/snapshot` returns the full session state: config, participants, pool, groups, memberships (seats), presence — the server is the only source of truth (AD-1)
  - [ ] Authorize by participant token (or admin token for the admin channel) per AD-3
- [ ] Trigger resync on reconnect (AC: 1)
  - [ ] After any (re)connect of the `session:<code>` presence channel, the client fetches the snapshot and re-renders from it (AD-6: reconnect always ends in snapshot resync; AD-11)
  - [ ] Reuse the same snapshot render path as the initial page load so seats and cards can never diverge between routes
- [ ] Render from snapshot, not partial events (AC: 2)
  - [ ] Events carry entity IDs + revision numbers (AD-6); the client treats the snapshot as authoritative and replays no stale deltas over it
  - [ ] Seat assignment is derived from the snapshot's membership rows — no duplicate seats, no stale cards (FR-8.3)
- [ ] Cover auto-rejoin integration (AC: 1, 2)
  - [ ] Returning devices (story 1-4) land in their exact seat from the resynced snapshot, including after the server was unreachable
- [ ] Verify resync (AC: 1, 2)
  - [ ] Kill and restart the Reverb/server connection with another device making changes mid-drop; confirm the reconnected client shows the current board with no stale cards or duplicate seats

## Dev Notes

- FR-8.3: on reconnect the participant re-syncs to current session state (seat, group, board) without page reload.
- AD-6 Realtime: after any (re)connect the client fetches the full session snapshot and renders from it; events carry entity IDs + revision numbers — this story is the resync half of AD-6.
- AD-11 Server-status UX: reconnect triggers snapshot resync (AD-6); the reconnect path here pairs with the offline banner (story 5-1).
- CAP-14 note (resolved 2026-08-14): night one ships banner + auto-rejoin/resync only — full offline queueing is phase 3.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md (E2S6)]
- [Source: docs/prds/prd-groupify/prd.md#F8 (Reliability & server status — FR-8.3)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6 (Realtime — two channel classes, snapshot resync)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-11 (Server-status UX — visible degradation)]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-14 (Offline resilience — night-one scope)]

# Traceability

- FR: FR-8.3 | CAP: CAP-9 | AD: AD-6, AD-11

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/2-6-snapshot-resync.md
