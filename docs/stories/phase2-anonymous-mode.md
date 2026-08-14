---
baseline_commit: 6d118c9dd7f5c45fdd3787e538e7c4a0a196c2bc
phase: 2
---

# Phase 2 · Story E: Anonymous Mode

Status: review

## Story

As a facilitator,
I want participants to appear under random display names,
so that sensitive topics stay comfortable while I still know who is who.

## Acceptance Criteria

1. GIVEN anonymous mode ON WHEN someone joins THEN they get a random adjective+animal display name (real name stored host-side only).
2. GIVEN the board WHEN anonymous THEN cards/pool show display names; the admin panel shows the real name.
3. GIVEN the CSV export WHEN anonymous THEN a `registered name` column carries the real name.

## Tasks / Subtasks

- [x] `participants.display_name` (nullable) + migration
- [x] `RandomName` service (adjective + animal)
- [x] Config rule `anonymous_mode` (boolean) + validation; join assigns a display name
- [x] Snapshot: members/me/pool use display names; `real_name` exposed (anonymous only)
- [x] CSV: `name` = display; `registered name` column when anonymous
- [x] 5 Pest tests (random assignment, board/admin split, off = normal, CSV column, validation)

## Dev Notes

- Slido/Blooket anonymous-with-host-identity pattern. [Source: research/interface-research.md]
- Host identity: the admin panel + CSV keep the registered name; participants only see display names.

### References

- [Source: docs/specs/spec-groupify/roadmap.md (phase 3 — anonymous mode)]

# Traceability

- FR: — (roadmap) | CAP: — | AD: —

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Batch-edit silent skips (drifted anchors) — export header/row edits applied in two passes
- Larastan template-covariance noise on Collection::map → converted members/pending to plain arrays (no ignores)

### Completion Notes List

- 5 tests green (114 total, 431 assertions); e2e 6/6; live-verified: CSV `"Clever Panda",Maya`.

### File List

- database/migrations/…000007_add_display_name_to_participants_table.php
- app/Support/RandomName.php
- app/Support/SessionConfig.php, app/Http/Controllers/Admin/SessionConfigController.php
- app/Http/Controllers/JoinController.php, app/Services/SessionSnapshot.php
- app/Http/Controllers/Admin/AdminExportController.php
- tests/Feature/AnonymousModeTest.php (5 tests)
- docs/stories/phase2-anonymous-mode.md (this record)
