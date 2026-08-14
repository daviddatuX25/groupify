---
baseline_commit: 2c7fb883441810cd7bd5798753bc2e5c9cce0833
---

# Story 2.3: Create Group

Status: review

## Story

As a pooled participant,
I want to create a group (named or auto-named) and optionally fill its fields,
so that others can find and join it.

## Acceptance Criteria

1. GIVEN a pooled participant WHEN they create a group THEN it is created with the creator as leader and a sequential name (Team Alpha/Bravo… or Table 1/2… per config).
2. GIVEN required session fields WHEN they are missing THEN creation is blocked with validation errors.
3. GIVEN a frozen session or an already-grouped participant WHEN creation is attempted THEN it is rejected.

## Tasks / Subtasks

- [x] `GroupController@store` — device-token identity (AD-3), status+freeze+pooled checks, name (custom or `GroupNamer` auto), field validation from config (AD-8), transaction + leader membership, broadcast `GroupCreated` (AD-1)
- [x] `GroupNamer` — 'alpha' phonetic words (Alpha/Bravo/…/Zulu, cycles suffix) and 'table' (Table N)
- [x] Board UI: "+ Create New Group" form (name optional + field inputs), fetch mutation with X-Device-Token + XSRF, reload on success
- [x] 7 Pest tests (auto name, sequential, table scheme, custom + fields, required field blocks, frozen/not-pooled, token required)

## Dev Notes

- AD-7: creator becomes leader via membership role; uniqueness by (group, participant). [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]
- AD-8: field definitions live in config; required fields validated at creation. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-8]
- Mutation responses are plain JSON — the client uses fetch + reload (Inertia XHR requires Inertia responses).

### References

- [Source: docs/planning/epics-groupify.md#E2S3]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-4]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]

# Traceability

- FR: FR-4.1, FR-4.4 | CAP: CAP-4 | AD: AD-1, AD-4, AD-7, AD-8

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- `Validator::make` — used the validation class instead of the facade (fixed import)
- Namer produced "Team A" — phonetic word list added
- Inertia XHR vs JSON mutation responses — client switched to fetch + reload

### Completion Notes List

- 12 mutation tests (2-3 + 2-4) + browser-verified create (Team Alpha, Maya lead).

### File List

- app/Http/Controllers/GroupController.php
- app/Support/GroupNamer.php
- app/Events/GroupCreated.php
- routes/web.php
- resources/js/pages/Session/Show.tsx
- tests/Feature/GroupMutationsTest.php
- docs/stories/2-3-create-group.md (this record)

---

# Story 2.4: Join/Leave Group

Status: review

## Story

As a pooled participant,
I want to join a group with space and leave it freely,
so that I can move around the board.

## Acceptance Criteria

1. GIVEN an open group with capacity WHEN a pooled participant joins THEN membership is active and the board updates.
2. GIVEN a full group, frozen session, or already-grouped participant WHEN joining THEN it is rejected transactionally.
3. GIVEN a member leaves WHEN they are the leader THEN leadership transfers to the next-joined member.

## Tasks / Subtasks

- [x] `GroupController@join` — lockForUpdate + capacity/freeze/join-mode checks in one transaction (AD-7), broadcast `MembershipChanged`
- [x] `GroupController@leave` — delete membership; leader leaves → leadership transfers to next by join order (orderBy id)
- [x] Board UI: Join buttons (pooled + open groups), Leave button (my group), fetch + reload
- [x] 5 Pest tests (join + freeze, full/second-group reject, leave, leadership transfer, broadcast)

## Dev Notes

- AD-7: capacity and freeze are enforced transactionally, never UI-only. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]
- Retired retro action item: freeze enforcement on leave/create/move now implemented (E2 mutations).

### References

- [Source: docs/planning/epics-groupify.md#E2S4]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-4]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-1]

# Traceability

- FR: FR-4.2, FR-4.3 | CAP: CAP-4 | AD: AD-1, AD-7

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Browser selector `text=Join` matched the join-instruction bar ("Joining late?") — app flow verified after clicking the exact button

### Completion Notes List

- Browser-verified: Leo joined Team Alpha via the UI (reload + banner + member list), leave button present; leadership transfer covered by tests.
- Gates green: 60 tests (253 assertions), pint/phpstan/build ✓.

### File List

- app/Http/Controllers/GroupController.php (join/leave)
- app/Events/MembershipChanged.php
- routes/web.php
- resources/js/pages/Session/Show.tsx
- tests/Feature/GroupMutationsTest.php
- docs/stories/2-4-join-leave-group.md (this record)
