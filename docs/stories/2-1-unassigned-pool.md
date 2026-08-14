# Story 2.1: Unassigned Pool

Status: ready-for-dev

## Story

As a participant,
I want to see myself (and the admin to see everyone) in an unassigned pool,
so that I know I have joined and who is still waiting to be grouped.

## Acceptance Criteria

1. GIVEN joined-but-ungrouped participants WHEN the session loads THEN they are visible in the pool — the participant sees themselves, the admin sees all pool members.
2. GIVEN the pool WHEN any screen renders THEN the pool count is shown on all screens.

## Tasks / Subtasks

- [ ] Build the pool from the session snapshot (AC: 1)
  - [ ] Pool = active participants with no group membership, derived from the snapshot (memberships with no group, status active) (AD-7)
  - [ ] `resources/js/components/Pool.tsx` renders pool members; participants see their own card, admin sees the full pool (FR-3.1)
- [ ] Show the pool count everywhere (AC: 2)
  - [ ] Pool count computed from the snapshot and rendered in the shared participant/admin layout (header/status bar)
  - [ ] Count updates live when pool membership changes arrive via the `session:<code>` presence channel (AD-6)
- [ ] Keep the pool live (AC: 1, 2)
  - [ ] Re-render pool + count from events (join/leave/dissolve) with no full-page reload (CAP-3: visible on all connected devices within ~1s)
  - [ ] Participants who join a group leave the pool; members who leave a group return to the pool (consistency with stories 2-3/2-4)

## Dev Notes

- FR-3.1: unassigned pool — every joined-but-ungrouped participant visible to the admin and to themselves; pool count on all screens.
- AD-6 Realtime: the session presence channel carries grid, pool, presence, and flashes; the client renders from the snapshot and event deltas.
- AD-7 Membership model: pool membership is derived from memberships rows (active, no group) — no separate pool table.
- CAP-3: any membership change visible on all connected devices within ~1s.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md (E2S1)]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-3 (Pool & live grid)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6 (Realtime — two channel classes, snapshot resync)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7 (Membership model — seats)]
- [Source: docs/prds/prd-groupify/prd.md#F3 (Pool & live board — FR-3.1)]

# Traceability

- FR: FR-3.1 | CAP: CAP-3 | AD: AD-6, AD-7

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/2-1-unassigned-pool.md
