---
baseline_commit: c4f227a22698cd4638e8d0b4082ffe1fee031121
phase: 2
---

# Phase 2 · Story K: Kick & Ban Moderation

Status: review

## Story

As a group leader and facilitator,
I want to remove disruptive participants,
so that sessions stay safe.

## Acceptance Criteria

1. GIVEN a group leader WHEN they kick a member THEN the member returns to the pool (permission `kick_ban` enforced).
2. GIVEN the admin WHEN they ban a participant THEN the participant is kicked from all groups and blocked from rejoining (by name or token).
3. GIVEN an unban WHEN applied THEN the participant can rejoin.

## Tasks / Subtasks

- [x] `participants.banned_at` (nullable) + migration
- [x] `GroupController@kick` — leader-only (+ kick_ban permission); deletes the active membership; broadcast + event
- [x] `AdminActionsController@ban` — ban/unban; ban kicks from all groups; broadcast + event
- [x] Join blocks banned participants (by name or device token) with a clear message
- [x] UI: leader kick button on member rows; admin ban button on pool chips
- [x] 5 Pest tests (leader kick, non-leader block, ban kicks+blocks, unban, token auth)

## Dev Notes

- CAP-10 moderation slice (kick & ban; ghost-GC/ownership transfer remain deferred). [Source: docs/specs/spec-groupify/SPEC.md#CAP-10]

### References

- [Source: docs/specs/spec-groupify/roadmap.md (phase 2 — moderation)]

# Traceability

- FR: — (CAP-10) | CAP: CAP-10 | AD: AD-1, AD-7

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None (first-pass green after TDD)

### Completion Notes List

- 5 tests green (142 total, 522 assertions); e2e 6/6; live-verified: leader kick → pool, admin ban → rejoin blocked with message.

### File List

- database/migrations/…000012_add_banned_at_to_participants_table.php
- app/Http/Controllers/GroupController.php, Admin/AdminActionsController.php, JoinController.php
- routes/web.php, resources/js/pages/Session/Show.tsx, Admin/Show.tsx
- tests/Feature/KickBanTest.php (5 tests)
- docs/stories/phase2-kick-ban.md (this record)
