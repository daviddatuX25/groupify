# Story 4.4: Delegation Toggles

Status: ready-for-dev

## Story

As a developer,
I want admin-controlled delegation toggles for leaders (`set group size`, `fill group fields`),
so that the admin can delegate bounded power per session and changes apply live.

## Acceptance Criteria

1. GIVEN I am the admin WHEN I toggle `set group size` or `fill group fields` for the leader role THEN the toggle is stored as a session override in config and applies live.
2. GIVEN delegation is on and a leader sets their group's size WHEN the value exceeds the session max (or is below the session min) THEN the change is rejected — delegation is bounded by session rules.
3. GIVEN delegation is off WHEN a leader attempts the action THEN it is blocked; with it on, the leader's UI shows the control.
4. GIVEN I toggle delegation for this session WHEN another session exists THEN the other session's defaults are unaffected.

## Tasks / Subtasks

- [ ] Toggle endpoints (AC: 1, 4)
  - [ ] Add admin routes to set `perms['set group size']['leader']` and `perms['fill group fields']['leader']` in the session config (AD-4); admin-token auth (AD-3) + `can?` gate (AD-5).
  - [ ] Overrides are session-scoped — stored in that session's config, never in system defaults (flexibility-model: delegation changes one session).
- [ ] Bounded enforcement (AC: 2)
  - [ ] Leader-set group size validated against session `rules.min_members` / `rules.max_members` inside the mutation transaction (AD-7, FR-4.5, FR-6.3).
- [ ] Live application (AC: 1)
  - [ ] Commit then broadcast the config change (AD-1, AD-6); the allowed-action set is recomputed and re-rendered (AD-5).
- [ ] UI gating (AC: 3)
  - [ ] Leader size/field controls render only when the server-computed allowed-action set includes them (AD-5); server-side rejection regardless (builds on E4S3).

## Dev Notes

- AD-5: delegation = session override inside `can?(action, role, session)` resolution (session override → role default → system default); the same service emits what the leader UI renders.
- AD-4: toggles live in the validated session config (`perms`); a config change, applied live — no new columns.
- AD-7: size changes are single transactions re-checking session hard limits; capacity = count of active memberships.
- FR-6.3 / FR-4.5: leader-set size can never exceed session max (or fall below min) — bounded delegation.
- AD-6: config changes propagate live via session + admin channels; reconnect ends in snapshot resync.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#epic-e4--flexibility-systems-config-fields-permissions-extensions]
- [Source: docs/prds/prd-groupify/prd.md#f6--permissions-engine]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-7]
- [Source: docs/specs/spec-groupify/flexibility-model.md#1-permission-engine-cap-7]
- [Source: docs/specs/spec-groupify/flexibility-model.md#resolution-order]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-1]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-4]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-5]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]

# Traceability

- FR: FR-4.5, FR-6.2, FR-6.3, FR-6.5 | CAP: CAP-7 | AD: AD-1, AD-4, AD-5, AD-6, AD-7

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/4-4-delegation-toggles.md
