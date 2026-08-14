---
baseline_commit: 7900212b96385c39e400f013890a166eabd4e796
phase: 2
---

# Phase 2 · Story G: Admin Approval Queue View

Status: review

## Story

As a facilitator,
I want one panel showing every pending join request,
so that I can screen groups without waiting for leaders.

## Acceptance Criteria

1. GIVEN pending requests across groups WHEN the admin opens the panel THEN they see them all with the target group.
2. GIVEN the admin WHEN they approve or reject THEN the decision applies (approve → active member; reject → removed).
3. GIVEN a leader without the approve_join permission WHEN they try THEN the existing permission rule still applies (leader path unchanged).

## Tasks / Subtasks

- [x] `GroupController@approve/reject` accept an admin token (X-Admin-Token) alongside the leader path — admin decides without a device token
- [x] Admin panel "Pending requests" section (flattened from the board snapshot) with approve/reject per request
- [x] 2 new Pest tests (admin approve+reject; pending exposed on the admin board)

## Dev Notes

- Completes phase-2 story A (the admin-side view gap). [Source: docs/stories/phase2-approval-queue.md]
- The admin path bypasses the leader/approve_join gate; the leader path is unchanged.

### References

- [Source: docs/prds/prd-groupify/prd.md#FR-4.2]

# Traceability

- FR: FR-4.2 | CAP: CAP-4 | AD: AD-3

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Batch test-edit hit the wrong assertion (two identical lines) — fixed both precisely

### Completion Notes List

- 2 tests green (121 total, 453 assertions); e2e 6/6.

### File List

- app/Http/Controllers/GroupController.php
- resources/js/pages/Admin/Show.tsx
- tests/Feature/ApprovalQueueTest.php (+2)
- docs/stories/phase2-admin-approval-view.md (this record)
