# Story 3.4: Freeze/Unfreeze

Status: ready-for-dev

## Story

As a facilitator (session admin),
I want to freeze and unfreeze grouping from the live view,
so that I can pause formation during announcements and resume it when ready.

## Acceptance Criteria

1. GIVEN the session is live WHEN I toggle freeze from the live admin view THEN the session freezes immediately and the frozen state is visible on all participant and admin screens.
2. GIVEN the session is frozen WHEN I toggle unfreeze THEN joins, leaves, and moves resume normal behavior.
3. GIVEN the session is frozen WHEN a member tries to join or leave a group THEN the action is blocked while the admin remains exempt.
4. GIVEN the session is frozen WHEN any screen is reloaded THEN the frozen state is still rendered (persisted in the session config).

## Tasks / Subtasks

- [ ] Freeze toggle action (AC: 1, 2)
  - [ ] Add `POST /sessions/{code}/admin/freeze` (and unfreeze) that updates `rules.freeze` in the session config object (AD-4) — the single source of truth.
  - [ ] Authorize with admin token (AD-3) and `can?('freeze', role)` (AD-5); validate the config after the update.
- [ ] Transactional enforcement (AC: 3)
  - [ ] join/leave/move/dissolve transactions re-check the freeze flag before committing (AD-7); admin force-move stays exempt (E1S5); blocked requests return a clear error.
- [ ] Live visibility (AC: 1, 4)
  - [ ] Broadcast the freeze state change on the admin and session channels after commit (AD-6); every screen renders the frozen badge/read-only board from the server-computed snapshot.
  - [ ] Persist `rules.freeze` in config so reloads render the frozen state (AD-4, Seed shape).
- [ ] Participant read-only board (AC: 3, 4)
  - [ ] While frozen, the board renders without join/leave affordances from the allowed-action set (AD-5); no client-side second check.

## Dev Notes

- AD-4: freeze lives in the validated session config (`rules.freeze`); feature code never reads ad-hoc columns — one resolver reads it.
- AD-7: join/leave/move/dissolve are single transactions that re-check capacity, join mode, and freeze before committing; admin is exempt from freeze.
- AD-6: frozen state is server state broadcast on both channel classes; reconnect ends in a full snapshot resync so the frozen state is never stale.
- AD-5: `can?(action, role)` drives which controls render; frozen blocks are enforced server-side, not just hidden.
- E1S5: live → frozen blocks all joins/leaves/swaps (board read-only, admin exempt).
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#epic-e3--admin-control-god-mode]
- [Source: docs/prds/prd-groupify/prd.md#f5--admin-control]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-5]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-4]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-5]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]

# Traceability

- FR: FR-1.3, FR-5.4 | CAP: CAP-5 | AD: AD-4, AD-5, AD-6, AD-7

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/3-4-freeze-unfreeze.md
