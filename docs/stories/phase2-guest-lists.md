---
baseline_commit: e78972243b08013d64a3f1dbedf3f060126bd666
phase: 2
---

# Phase 2 · Story D: Guest Lists / Gated Entry

Status: review

## Story

As a facilitator,
I want an invite-only session,
so that only rostered names can join (field-trip/classroom rosters).

## Acceptance Criteria

1. GIVEN a session with a guest list WHEN a rostered name joins THEN admission is granted.
2. GIVEN an unrostered name WHEN it tries to join THEN it is rejected with a clear message.
3. GIVEN a rostered name already claimed WHEN a second device uses it THEN it is rejected.
4. GIVEN no guest list WHEN anyone joins THEN the session stays open.

## Tasks / Subtasks

- [x] Config rule `guest_list: string[]` (+ validation) with `SessionConfig::guestList()`
- [x] Join enforcement: trim + case-insensitive match; unknown → "not on the guest list"; duplicate claim → "already taken"
- [x] Admin UI: guest-list input (comma-separated) + Set button
- [x] 6 Pest tests (allowed, case-insensitive/trim, rejected, one-claim, open default, shape validation)

## Dev Notes

- Roadmap "Gated entry / guest lists" (AhaSlides passcode / Zoom roster pattern). [Source: docs/specs/spec-groupify/roadmap.md]
- Names normalize to trimmed-as-typed; claims are per-session (LOWER(name) lookup).

### References

- [Source: research/interface-research.md (gated entry)]

# Traceability

- FR: — (roadmap) | CAP: — | AD: AD-7

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Docblock/insert order drift in SessionConfig (phpstan) — fixed

### Completion Notes List

- 6 tests green (109 total, 399 assertions); e2e 6/6; live-verified: rostered join 302, intruder rejected with clear message.

### File List

- app/Support/SessionConfig.php, app/Http/Controllers/Admin/SessionConfigController.php
- app/Http/Controllers/JoinController.php
- resources/js/pages/Admin/Show.tsx
- tests/Feature/GuestListTest.php (6 tests)
- docs/stories/phase2-guest-lists.md (this record)
