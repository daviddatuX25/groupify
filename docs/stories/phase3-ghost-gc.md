---
baseline_commit: 3bb1c36ae3a1b38651140ad897fcd7a79ef9601c
phase: 3
---

# Phase 3 · Story A: Ghost-Group GC + Ownership Transfer

Status: review

## Story

As a facilitator,
I want groups to survive leader departures gracefully and never linger as empty shells,
so that the board stays clean and every group has a leader.

## Acceptance Criteria

1. GIVEN a leader's membership is removed (leave, force-move, ban) WHEN the group has other active members THEN leadership transfers to the oldest member.
2. GIVEN a group's last member is removed THEN the group dissolves.
3. GIVEN the admin WHEN they pick an active member THEN leadership transfers explicitly (old leader demoted).
4. GIVEN an hourly sweep WHEN empty/leaderless groups exist THEN they dissolve/rebalance.

## Tasks / Subtasks

- [x] `GroupLeadershipService` — single rebalance implementation (transfer to oldest active member | dissolve) shared by leave, force-move, ban, and the GC sweep
- [x] Ban path rebalanced (previously left ghosts)
- [x] `AdminActionsController@transferLeadership` — explicit admin transfer with validation (active member only) + route
- [x] `PurgeGhostGroups` command + hourly schedule (safety net; live paths already rebalance)
- [x] 6 Pest tests (ban-transfer, ban-dissolve, admin transfer, invalid target, auth, purge)

## Dev Notes

- CAP-10 moderation completion (the deferred ghost-GC item). All removal paths now converge on one service — no more three copies of the transfer rule. [Source: docs/specs/spec-groupify/SPEC.md#CAP-10]

### References

- [Source: docs/specs/spec-groupify/roadmap.md (phase 3 — ghost GC + ownership transfer)]

# Traceability

- FR: — (CAP-10) | CAP: CAP-10 | AD: AD-1

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Missing `GroupLeadershipService` imports in both controllers → container resolution 500s
- Live verify: duplicate "Maya" seat collided with the claim rule (same-name join) → leader join must precede the loop

### Completion Notes List

- 6 tests green (168 total, 593 assertions); e2e 7/7; live-verified: ban leader → Ana leads; admin transfer → Ben leads.

### File List

- app/Services/GroupLeadershipService.php (new)
- app/Http/Controllers/GroupController.php, Admin/AdminActionsController.php
- app/Console/Commands/PurgeGhostGroups.php (new); routes/console.php, routes/web.php
- tests/Feature/GhostGcTest.php (6 tests)
- docs/stories/phase3-ghost-gc.md (this record)
