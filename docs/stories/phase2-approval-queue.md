---
baseline_commit: 4b141c300336881dc064215f22917ea73ad5b19c
phase: 2
---

# Phase 2 · Story A: Approval Queue

Status: review

## Story

As a group leader,
I want to screen join requests before accepting,
so that groups stay intentional in approval-mode sessions.

## Acceptance Criteria

1. GIVEN an approval-mode session WHEN a pooled participant clicks request THEN a pending request is created (no membership).
2. GIVEN the group leader WHEN pending requests exist THEN they see them on the card and can approve (→ member) or reject (→ removed).
3. GIVEN a non-leader or a leader without the approve_join permission WHEN they try THEN it is rejected.
4. GIVEN pending requests WHEN capacity is evaluated THEN they do not count toward slots.

## Tasks / Subtasks

- [x] Join in approval mode creates `status=pending` (was: hard 422); broadcast `MembershipChanged` action `pending`; event `join_requested`
- [x] `POST …/requests/{participant}/approve|reject` — leader-only (404) + `approve_join` permission (422); approve → active member, reject → delete; broadcasts + event records
- [x] Snapshot: `groups[].pending[]` (id, name)
- [x] UI: "Request to join" label in approval mode; leader pending panel with ✓/✕ on the card; mutation error banner (network/422 feedback)
- [x] 7 Pest tests (pending create, snapshot, approve, reject, non-leader block, permission override, capacity exclusion)

## Dev Notes

- FR-4.2 approval mode; roadmap "Approval queue" item now shipped. [Source: docs/prds/prd-groupify/prd.md#FR-4.2]
- Pending seats never count toward capacity (only active memberships do).
- Leader determination: `groups.leader_id` — leadership transfer (2-4) carries over.

### References

- [Source: docs/specs/spec-groupify/roadmap.md (phase 2 — approval queue)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]

# Traceability

- FR: FR-4.2 | CAP: CAP-4 | AD: AD-1, AD-7

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Join closure signature drift (python replace) — rewrote against the actual file text
- TSX ternary missing `: null` — "expected ':'" parse error

### Completion Notes List

- 7 tests green (91 total, 350 assertions); e2e 6/6 regression pass; approval flow verified live (request → approve → member, pending cleared).
- First phase-2 slice shipped; the admin-side queue view shipped 2026-08-14 (phase-2 story G): admin approve/reject on any pending request + Pending Requests panel.

### File List

- app/Http/Controllers/GroupController.php (join/approve/reject)
- app/Services/SessionSnapshot.php (pending)
- routes/web.php
- resources/js/pages/Session/Show.tsx (request label, pending panel, error banner)
- tests/Feature/ApprovalQueueTest.php (7 tests)
- docs/stories/phase2-approval-queue.md (this record)
