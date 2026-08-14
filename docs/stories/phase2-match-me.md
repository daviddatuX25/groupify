---
baseline_commit: 6468de5149957a7b1a57caa75ff4f397e1ef85c5
phase: 2
---

# Phase 2 · Story B: Auto-Distribute + Match Me

Status: review

## Story

As a facilitator or a pooled participant,
I want one-tap assignment,
so that everyone lands in a group without hunting for space.

## Acceptance Criteria

1. GIVEN an admin WHEN they click Auto-Distribute THEN every pooled participant is assigned to groups with space, split as evenly as capacity allows.
2. GIVEN a pooled participant WHEN they click Match me THEN they join the least-full group.
3. GIVEN full groups or frozen sessions WHEN assigning THEN it stops without overfilling and reports no eligible group.

## Tasks / Subtasks

- [x] `AdminActionsController@distribute` — greedy most-open-slots assignment in one transaction; broadcasts `auto_distributed`; admin-token auth
- [x] `GroupController@matchMe` — pooled-only, mutable-only; joins the least-full group; broadcasts `joined`; records `member_joined` (auto)
- [x] Routes: admin.auto-distribute, match-me
- [x] UI: admin "⚡ Auto-Distribute" (pool section, disabled when empty); participant "⚡ Match me" (me banner)
- [x] 6 Pest tests (even split, capacity cap, token auth, least-full join, already-grouped/frozen, no-space)

## Dev Notes

- CAP-12 (match-me auto-assign) + the mockup's facilitator Auto-Distribute button. [Source: docs/specs/spec-groupify/SPEC.md#CAP-12]
- Assignment is greedy (not optimal) — fine at this scale; capacity respected (never overfills; leftovers stay pooled).

### References

- [Source: docs/specs/spec-groupify/roadmap.md (phase 3 — match me)]
- [Source: docs/brand/brand-context.md (Auto-Distribute button)]

# Traceability

- FR: — (CAP-12) | CAP: CAP-12 | AD: AD-1, AD-7

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None (first-pass green after TDD)

### Completion Notes List

- 6 tests green (97 total, 365 assertions); e2e 6/6; live-verified: 4 pooled → 3+3 even split, pool empty.

### File List

- app/Http/Controllers/Admin/AdminActionsController.php (distribute)
- app/Http/Controllers/GroupController.php (matchMe)
- routes/web.php
- resources/js/pages/Admin/Show.tsx, Session/Show.tsx
- tests/Feature/AutoAssignTest.php (6 tests)
- docs/stories/phase2-match-me.md (this record)
