---
baseline_commit: 0ca0339826e1e03c1068d1ae054e2d5d1b72e4ec
---

# Story 1.7: Auto-Purge Archived Sessions

Status: review

## Story

As an operator,
I want archived sessions to delete themselves after 30 days,
so that the home server does not accumulate dead data.

## Acceptance Criteria

1. GIVEN an archived session older than 30 days WHEN the purge runs THEN the session and all its rows are deleted.
2. GIVEN an archived session younger than 30 days or a live/frozen session WHEN the purge runs THEN it is kept.
3. GIVEN the scheduler WHEN configured THEN the purge runs daily.

## Tasks / Subtasks

- [x] Purge command (AC: 1, 2)
  - [x] `app/Console/Commands/PurgeArchivedSessions.php` — `sessions:purge`: delete `status=archived` and `updated_at < now()-30d`; participants cascade (FR-1.7)
- [x] Daily schedule (AC: 3)
  - [x] `routes/console.php`: `Schedule::command('sessions:purge')->daily();`
- [x] Tests (AC: 1, 2)
  - [x] Old archived purged with rows; young archived kept; live/frozen kept regardless of age

## Dev Notes

- FR-1.7; retention default resolved 2026-08-14 (30 days). Deletion is full token revocation (AD-3). [Source: docs/prds/prd-groupify/prd.md#FR-1.7]
- Scheduler needs `schedule:work`/cron in production (Dokploy: cron entry) — noted for E6S3.

### References

- [Source: docs/prds/prd-groupify/prd.md#FR-1.7]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-15]

# Traceability

- FR: FR-1.7 | CAP: CAP-15 | AD: AD-3

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None

### Completion Notes List

- 4 Pest tests green; gates green (44 tests total, 171 assertions).

### File List

- app/Console/Commands/PurgeArchivedSessions.php
- routes/console.php
- tests/Feature/PurgeArchivedSessionsTest.php (4 tests)
- docs/stories/1-7-auto-purge.md (this record)
