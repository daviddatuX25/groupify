# Story 1.7: Auto-Purge Archived Sessions

Status: ready-for-dev

## Story

As a facilitator,
I want archived sessions purged automatically after 30 days,
so that old data does not linger on my self-hosted server.

## Acceptance Criteria

1. GIVEN archived sessions WHEN the daily purge job runs THEN sessions archived more than 30 days ago are purged.
2. GIVEN an archived session WHEN the facilitator uses delete-now THEN it is purged immediately.
3. GIVEN the purge job WHEN it runs THEN active (live/frozen) sessions are never touched.

## Tasks / Subtasks

- [ ] Build the purge command (AC: 1, 3)
  - [ ] `app/Console/Commands/PurgeArchivedSessions.php` (e.g. `sessions:purge`) that deletes sessions where `status = archived` and `archived_at` is older than 30 days (CAP-15, FR-1.7)
  - [ ] Record `archived_at` when a session is archived (story 1-5) and use it as the purge boundary
  - [ ] Delete cascades to participants, groups, memberships, session_events (same purge path as delete-now)
  - [ ] Query explicitly filters `status = archived` so live/frozen sessions are never selected (AC: 3)
- [ ] Schedule the daily job (AC: 1)
  - [ ] Register `sessions:purge` in the Laravel scheduler (routes/console.php or `bootstrap/app.php` `withSchedule`) to run daily
  - [ ] Confirm the queue worker / scheduler wiring matches the E6S2 operational envelope (database queue + one worker)
- [ ] Implement delete-now (AC: 2)
  - [ ] Admin action on an archived session purges immediately (same cascade as the scheduled purge)
  - [ ] Delete-now also works from the archived-session view without waiting for the daily job (FR-1.7)
- [ ] Verify purge behavior (AC: 1, 2, 3)
  - [ ] Run the purge command and confirm only archived sessions older than 30 days are removed
  - [ ] Confirm live and frozen sessions remain untouched after the run
  - [ ] Confirm delete-now purges an archived session immediately

## Dev Notes

- CAP-15 Retention & self-destruct: archived sessions auto-purge after 30 days (default); delete-now available immediately; per-session retention config is later (resolved 2026-08-14).
- FR-1.7: archived sessions auto-purge after 30 days via a daily scheduled job; delete-now always available.
- AD-1: purge is a server-side mutation (scheduled command), not a client action — SQLite stays the single source of truth.
- AD-3: deleting a session revokes its tokens — the purge is the retention-path revocation.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md (E1S7)]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-15 (Retention & self-destruct)]
- [Source: docs/prds/prd-groupify/prd.md#F1 (Session management — FR-1.7)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-1 (Paradigm — single-writer monolith with broadcast)]

# Traceability

- FR: FR-1.7 | CAP: CAP-15 | AD: AD-1, AD-3

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/1-7-auto-purge.md
