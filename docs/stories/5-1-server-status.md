# Story 5.1: Server-Status UX

Status: ready-for-dev

## Story

As a participant and facilitator,
I want the app to show explicit realtime connection state — online / reconnecting / offline, with a "server offline" banner within ~5 seconds and a /health heartbeat fallback,
so that a flaky home server never appears silently broken.

## Acceptance Criteria

1. GIVEN the Reverb WebSocket connection drops WHEN the client detects the loss THEN the UI shows a "reconnecting" state and, if still disconnected after ~5 seconds, a "server offline" banner.
2. GIVEN a connection whose WebSocket state is missing or ambiguous WHEN the /health heartbeat check fails THEN the client shows the offline banner via the heartbeat fallback path.
3. GIVEN the server recovers WHEN the client reconnects THEN the client fetches the full session snapshot and re-renders from it — no stale cards, no duplicate seats — without a page reload.
4. GIVEN a healthy connection WHEN the app loads and the heartbeat succeeds THEN the UI is labeled "online" and no banner is shown.

## Tasks / Subtasks

- [ ] Implement the connection-state store (AC: 1, 4)
  - [ ] Define the online / reconnecting / offline state machine with the ~5s offline transition (AD-11)
  - [ ] Subscribe to Echo/Reverb connection events (connect, disconnect, error) and map them to states
  - [ ] Expose state via a React hook/context consumed by the banner and other UI
- [ ] Add /health heartbeat fallback (AC: 2, 4)
  - [ ] Add GET /health route returning 200 + JSON status with no DB writes
  - [ ] Client polls /health (e.g. every ~10s) when WebSocket state is ambiguous; failed checks flip state to offline
  - [ ] Restore the "online" label when the heartbeat succeeds again
- [ ] Reconnect → snapshot resync (AC: 3)
  - [ ] On reconnect, dispatch the full session snapshot fetch (AD-6)
  - [ ] Re-render pool, grid, and presence from the snapshot; drop stale local state
  - [ ] Verify no duplicate seats and no stale cards after reconnect
- [ ] Banner UI + accessibility (AC: 1, 4)
  - [ ] shadcn/ui banner component showing labeled states (no unbounded spinners)
  - [ ] role="status" + aria-live so screen readers announce state changes
  - [ ] Manual WS kill/restart drill verifying the within-~5s banner and resync

## Dev Notes

- AD-11: offline banner driven by Reverb connection state plus a /health heartbeat fallback; states online / reconnecting / offline; reconnect triggers snapshot resync (AD-6); no unbounded spinners. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-11]
- AD-6: after any (re)connect the client fetches the full session snapshot and renders from it; events carry entity IDs + revision numbers. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]
- AD-10: a failing dependency surfaces in the server-status UX, not a crash. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-10]
- CAP-9: a dead server is shown to every client within ~5s; the app never appears silently broken. [Source: docs/specs/spec-groupify/SPEC.md#CAP-9]
- FR-8.1: banner within ~5s with reconnecting state and retry; FR-8.2: heartbeat fallback when WebSocket state is ambiguous; FR-8.3: reconnect resync without page reload. [Source: docs/prds/prd-groupify/prd.md#FR-8.1]
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#E5S1]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-9]
- [Source: docs/prds/prd-groupify/prd.md#FR-8.1]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-11]

# Traceability

- FR: FR-8.1, FR-8.2, FR-8.3 | CAP: CAP-9 | AD: AD-6, AD-11

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/5-1-server-status.md
