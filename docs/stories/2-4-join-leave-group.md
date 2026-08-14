# Story 2.4: Join/Leave Group

Status: ready-for-dev

## Story

As a participant,
I want to join and leave groups freely,
so that I can move between groups as formation happens.

## Acceptance Criteria

1. GIVEN an open-mode group WHEN a participant taps join THEN they are joined instantly.
2. GIVEN any join WHEN capacity and freeze are re-checked THEN the join commits in a single transaction (no overfill, no joins while frozen).
3. GIVEN a group member WHEN they leave THEN they return to the pool.
4. GIVEN the group leader WHEN they leave THEN leadership transfers to the next-joined member.

## Tasks / Subtasks

- [ ] Implement instant join (AC: 1)
  - [ ] `POST /sessions/{code}/groups/{group}/join` — open join mode = instant join (FR-4.2), no approval queue for night one
  - [ ] Commit the membership (role member, status active) in one transaction, then broadcast the join event (AD-1, AD-6)
- [ ] Enforce capacity + freeze transactionally (AC: 2)
  - [ ] In the same transaction as the membership insert: re-check join mode (open), capacity (active memberships < max), and the freeze flag (AD-7)
  - [ ] Overfull joins and joins while frozen are rejected with clear errors — never partially committed
- [ ] Implement leave (AC: 3)
  - [ ] `POST /sessions/{code}/groups/{group}/leave` — removes the membership; participant returns to the pool (active, no group) and a leave event broadcasts
- [ ] Implement leadership transfer (AC: 4)
  - [ ] When the leader leaves, assign the `leader` role to the next-joined active member of that group (PRD assumption; ghost-group GC is CAP-10, deferred)
  - [ ] If the last member leaves, the group becomes empty (dissolved or left empty per board rules — empty groups show 0/max with join available)
- [ ] Verify invariants (AC: 2, 3, 4)
  - [ ] Concurrent joins at capacity: only the memberships that fit commit; no group exceeds max
  - [ ] Leave → pool appears on all screens; leader leave transfers leadership; frozen session rejects join/leave server-side

## Dev Notes

- FR-4.2: join — open mode = instant (approval mode ships pending state + admin-side accept/decline); FR-4.3: leave freely; leader leaving transfers leadership to next-joined member.
- AD-7 Membership model (core of this story): capacity = count of active memberships; join/leave are single transactions that re-check capacity, join mode, and freeze before committing — caps and join mode are never violated (CAP-4).
- AD-1: every mutation commits then broadcasts; no client-side optimistic divergence.
- CAP-4: capacity bounds enforced; leader delegation of size-setting is CAP-7 (story 4-4), not here.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md (E2S4)]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-4 (Group formation)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7 (Membership model — seats)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-1 (Paradigm — single-writer monolith with broadcast)]
- [Source: docs/prds/prd-groupify/prd.md#F4 (Groups — FR-4.2, FR-4.3)]

# Traceability

- FR: FR-4.2, FR-4.3 | CAP: CAP-4 | AD: AD-1, AD-7

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/2-4-join-leave-group.md
