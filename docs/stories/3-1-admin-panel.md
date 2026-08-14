---
baseline_commit: d3635046ecc75b5774904ab5a4cccf1203d62489
---

# Story 3.1: Admin Panel

Status: review

## Story

As a facilitator,
I want a live admin panel with QR, PIN, and stats,
so that I can run the room from one projected screen.

## Acceptance Criteria

1. GIVEN the admin panel WHEN rendered THEN QR + PIN are always visible with live stats (online / pool / groups).
2. GIVEN any session event WHEN it fires THEN the admin panel updates live without reload.

## Tasks / Subtasks

- [x] Admin UI rebuild: QR card, PIN, stats tiles (Online / PIN / Topics set / In pool / Groups), live groups + pool sections
- [x] `BoardController` accepts `X-Admin-Token` → snapshot with `is_admin` (admin board JSON)
- [x] Admin page subscribes to the session channel events → refetch (live updates, AD-6)

## Dev Notes

- AD-6: the admin surface consumes the same events as participants. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]
- Token seeding bug: the page was writing localStorage from its own (empty) read — seed from the server prop.

### References

- [Source: docs/planning/epics-groupify.md#E3S1]
- [Source: docs/prds/prd-groupify/prd.md#FR-5.1]

# Traceability

- FR: FR-5.1 | CAP: CAP-5 | AD: AD-3, AD-6

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- `\${session.id}` sed escape broke every admin mutation URL (literal string) — fixed with edit tool
- CSS text-transform uppercase broke case-sensitive innerText assertions

### Completion Notes List

- Browser-verified: stats render live; a curl-side freeze PATCH propagated to the admin page without reload (FROZEN label + Unfreeze button appeared via WS).

### File List

- resources/js/pages/Admin/Show.tsx
- app/Http/Controllers/BoardController.php
- docs/stories/3-1-admin-panel.md (this record)

---

# Story 3.2: Force-Move Member

Status: review

## Story

As a facilitator,
I want to move any member between groups or back to the pool,
so that I can fix lopsided groups without asking anyone to leave.

## Acceptance Criteria

1. GIVEN an admin WHEN they move a member to a group THEN the membership changes transactionally and the board updates everywhere.
2. GIVEN a leader is moved WHEN leadership transfers to the next member THEN the source group stays coherent.
3. GIVEN a non-admin WHEN they call the move endpoint THEN it is rejected.

## Tasks / Subtasks

- [x] `AdminActionsController@move` — token auth, target-group validation (same session), transactional seat release (with leadership transfer) + capacity-checked re-seat, broadcast `MembershipChanged` (action `moved`)
- [x] Admin UI: per-member "move…" select (pool + other groups), auto-act on change
- [x] 4 Pest tests (cross-group move, kick to pool, leadership transfer, token rejection)

## Dev Notes

- Admin is exempt from the freeze (FR-1.3); move works while frozen.
- AD-7: capacity re-checked on the target in the same transaction. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]

### References

- [Source: docs/planning/epics-groupify.md#E3S2]
- [Source: docs/prds/prd-groupify/prd.md#FR-5.2]

# Traceability

- FR: FR-5.2 | CAP: CAP-5 | AD: AD-1, AD-7

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None

### Completion Notes List

- 4 tests green; endpoint proven via suite (UI select uses the same act() path as dissolve, which is browser-proven).

### File List

- app/Http/Controllers/Admin/AdminActionsController.php
- routes/web.php
- resources/js/pages/Admin/Show.tsx
- tests/Feature/AdminActionsTest.php
- docs/stories/3-2-force-move.md (this record)

---

# Story 3.3: Dissolve Groups

Status: review

## Story

As a facilitator,
I want to dissolve one group or all groups back to the pool,
so that I can restart formation cleanly.

## Acceptance Criteria

1. GIVEN a dissolve-all WHEN triggered THEN every active membership is cleared and all participants return to the pool.
2. GIVEN a per-group dissolve WHEN triggered THEN only that group's memberships are cleared.
3. GIVEN the dissolve WHEN committed THEN it broadcasts so every board updates live.

## Tasks / Subtasks

- [x] `AdminActionsController@dissolve` — optional `group_id`; transactionally deletes active memberships (+ clears leader_id), broadcasts `MembershipChanged` (`dissolved`)
- [x] Admin UI: "Dissolve all" + per-group "Dissolve this group" buttons
- [x] 2 Pest tests (all vs single group)

## Dev Notes

- Design: dissolved groups persist as empty shells (mockup "Team Delta — Pending Topic Assignment"), memberships only are cleared.

### References

- [Source: docs/planning/epics-groupify.md#E3S3]
- [Source: docs/prds/prd-groupify/prd.md#FR-5.3]

# Traceability

- FR: FR-5.3 | CAP: CAP-5 | AD: AD-1

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None

### Completion Notes List

- Browser-verified: Dissolve all → pool (1), Team Alpha emptied live.

### File List

- app/Http/Controllers/Admin/AdminActionsController.php
- routes/web.php
- resources/js/pages/Admin/Show.tsx
- tests/Feature/AdminActionsTest.php
- docs/stories/3-3-dissolve-groups.md (this record)
