# Story 3.6: Activity Feed

Status: ready-for-dev

## Story

As a facilitator (session admin),
I want a timestamped activity feed of join/leave/create/dissolve/move events,
so that I can see what happened during the session and audit formation.

## Acceptance Criteria

1. GIVEN members join, leave, create, dissolve, or move WHEN those actions commit THEN the activity feed records each event with a timestamp.
2. GIVEN I am the admin WHEN I open the activity feed THEN I see events ordered by time with event type and relevant payload.
3. GIVEN the feed is open WHEN new events occur THEN it updates live without a page reload.
4. GIVEN I reload the feed page WHEN the session has history THEN all past events are still shown.

## Tasks / Subtasks

- [ ] `session_events` model + migration (AC: 1)
  - [ ] Add `session_events` table (`session_id`, `type`, `payload`, `at`) per the Seed shape; model `app/Models/SessionEvent`.
  - [ ] Write events inside the same transaction as the mutation (AD-1) for join/leave/create/dissolve/move.
- [ ] Feed endpoint + UI (AC: 2, 4)
  - [ ] Admin route returning the event list (admin-token auth, AD-3; `can?` gate, AD-5); server-rendered from the DB so reloads show full history.
  - [ ] Render type + timestamp + payload summary (e.g. "Diego joined Team Bravo") in the admin panel.
- [ ] Live updates (AC: 3)
  - [ ] Subscribe to the admin channel (AD-6) and append new events as they arrive; reconnect ends in snapshot resync.

## Dev Notes

- AD-1: every mutation is a transaction, then a broadcast; `session_events` rows are written in the same transaction, so the feed is never missing an event.
- AD-6: god-mode events flow on the `admin:<code>` channel and carry entity IDs + revision numbers; reconnect ends in a full snapshot resync.
- AD-5: the feed is an admin affordance rendered from the server-computed allowed-action set.
- AD-3: feed access is authorized by the per-session admin token.
- Seed shape: `session_events (session_id, type, payload, at)` — the feed reads this table directly.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#epic-e3--admin-control-god-mode]
- [Source: docs/prds/prd-groupify/prd.md#f5--admin-control]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-5]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-1]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-3]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-5]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]

# Traceability

- FR: FR-5.6 | CAP: CAP-5 | AD: AD-1, AD-3, AD-5, AD-6

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/3-6-activity-feed.md
