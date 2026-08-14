---
baseline_commit: 0d2846d4ce75b0d6f84ff12a124b58d30c2deda8
phase: 2
---

# Phase 2 · Story C: Auto-Dissolve Timer

Status: review

## Story

As a facilitator,
I want groups to dissolve automatically on a timer,
so that timed formation rounds run themselves.

## Acceptance Criteria

1. GIVEN an admin WHEN they set an auto-dissolve duration THEN `dissolve_at` is computed and broadcast-ready.
2. GIVEN a session whose timer expires WHEN the minute scheduler runs THEN all groups dissolve to the pool (idempotent) and the timer clears.
3. GIVEN the board WHEN a timer is active THEN participants see a live countdown.

## Tasks / Subtasks

- [x] `group_sessions.dissolve_at` (nullable) + cast
- [x] Config rule `auto_dissolve_minutes` (nullable, min 1) — config endpoint computes/clears dissolve_at
- [x] `sessions:auto-dissolve` command (every minute): dissolve active memberships past-due, clear timers, broadcast `dissolved`, record `auto_dissolved`
- [x] Snapshot exposes dissolve_at; participant header shows a ticking countdown
- [x] Admin UI: timer input + Set button
- [x] Dev entrypoint runs `schedule:work`
- [x] 6 Pest tests (set/clear, expiry dissolve, idempotency, future untouched, validation)

## Dev Notes

- CAP-12 group dynamics. [Source: docs/specs/spec-groupify/SPEC.md#CAP-12]
- Prod scheduler runs inside the container (supervisord `schedule:work`) — no external cron.

### References

- [Source: docs/specs/spec-groupify/roadmap.md (phase 3 — auto-dissolve)]

# Traceability

- FR: — (CAP-12) | CAP: CAP-12 | AD: AD-1, AD-6, AD-10

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- SQLite "database is locked" under worker+scheduler writes → DB_BUSY_TIMEOUT=30000 (prod env + docs)
- Volume mounted at /var/www/html/database SHADOWED the image's migrations (stale schema) → sqlite file moved to database/data; volume mounts only the data dir
- Stale container after image rebuild → force-recreate

### Completion Notes List

- 6 tests green (103 total, 382 assertions); e2e 6/6; live-verified: timer set → dissolve_at computed, disable → cleared, countdown ticking (290→288s).

### File List

- database/migrations/…000006_add_dissolve_at_to_group_sessions_table.php
- app/Console/Commands/AutoDissolveSessions.php
- app/Models/Session.php, app/Support/SessionConfig.php, app/Services/SessionSnapshot.php
- app/Http/Controllers/Admin/SessionConfigController.php
- routes/console.php, scripts/entrypoint.sh
- resources/js/pages/Admin/Show.tsx, Session/Show.tsx
- compose.prod.yaml, Dockerfile.prod, docker/prod/entrypoint.sh (volume fix), docs/deploy/dokploy.md
- tests/Feature/AutoDissolveTest.php (6 tests)
- docs/stories/phase2-auto-dissolve.md (this record)
