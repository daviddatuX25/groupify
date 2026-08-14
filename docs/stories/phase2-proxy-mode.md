---
baseline_commit: 25a7c5aadc2e603ac09e931f054d660998c9503b
phase: 2
---

# Phase 2 · Story L: Proxy Mode

Status: review

## Story

As a facilitator,
I want to register people who are not present (field trips),
so that their seats exist before they arrive and they can claim them later.

## Acceptance Criteria

1. GIVEN the admin WHEN they bulk-create named seats THEN each seat exists unclaimed (no device token) and appears in the pool.
2. GIVEN a person joining with a seat's name WHEN the seat is unclaimed THEN they claim it (their device token binds to the seat).
3. GIVEN a second device joining with a claimed seat's name WHEN attempted THEN it is rejected.

## Tasks / Subtasks

- [x] `participants.token` nullable + migration (proxied seats have no token)
- [x] `AdminActionsController@createParticipants` — bulk seats from a name list; dedupe (case-insensitive), skip existing; event record
- [x] Join claim: name match → unclaimed seat claimed; claimed seat + other device → 422; same token → rejoin; new name → normal seat
- [x] Guest-list claim check tightened to only token-bearing seats (proxy+guest combos work)
- [x] UI: proxy importer (one name per line) in the admin panel
- [x] 6 Pest tests (bulk create, dedupe, claim, second-device rejection, admin auth, pool exposure)

## Dev Notes

- CAP-11 proxy mode. Proxied seats are plain participant rows with NULL token — no new table. [Source: docs/specs/spec-groupify/SPEC.md#CAP-11]

### References

- [Source: docs/specs/spec-groupify/flexibility-model.md#3-extensions-framework-cap-8]

# Traceability

- FR: — (CAP-11) | CAP: CAP-11 | AD: AD-7

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Python batch-edit silently no-opped on a drifted anchor (first join edit) — applied directly via the Edit tool
- PHPStan: `collect()` template resolution + Collection put() typing → rewrote with plain arrays
- KickBan unban test: after the claim rule, a fresh token + existing name is rejected by design — the test now rejoins with the seat's own token (the real unban UX)

### Completion Notes List

- 6 tests green (148 total, 536 assertions); e2e 6/6; live-verified: seats created → pool → Ana claimed (302) → second device rejected.

### File List

- database/migrations/…000013_make_participant_token_nullable_table.php
- app/Http/Controllers/Admin/AdminActionsController.php (createParticipants), JoinController.php (claim)
- routes/web.php, resources/js/pages/Admin/Show.tsx
- tests/Feature/ProxyModeTest.php (6 tests), tests/Feature/KickBanTest.php (unban rejoin semantics)
- docs/stories/phase2-proxy-mode.md (this record)
