---
baseline_commit: 81dab3e8fe1a1d44d9d1148514dc197bdcd18964
---

# Story 1.5: Session States + Archive/Delete

Status: review

## Story

As a facilitator,
I want to freeze, archive, or delete a session,
so that I can control when grouping happens and retire sessions cleanly.

## Acceptance Criteria

1. GIVEN a live session WHEN the facilitator freezes it THEN all joins, leaves, and swaps are blocked and the board is read-only (admin controls still work).
2. GIVEN a live session WHEN the facilitator archives it THEN it stops accepting joins.
3. GIVEN a session WHEN the facilitator deletes it THEN all its rows are purged.

## Tasks / Subtasks

- [x] Session state actions (AC: 1, 2)
  - [x] `PATCH /admin/sessions/{session}/state` → `SessionStateController@update`: action in freeze|unfreeze|archive
  - [x] Freeze lives in config `rules.freeze` (AD-4); archive sets `status = archived` (terminal — repeat → 422)
  - [x] Broadcasts `SessionStateUpdated` on `session.{code}` after commit (AD-1/AD-6, revision UUID)
- [x] Enforce freeze in mutations (AC: 1)
  - [x] Join blocked while frozen (JoinController re-checks status + freeze; unfreeze restores) — verified in test
  - [ ] Leave/create-group/move/dissolve freeze checks land with Epic 2 (those mutations do not exist yet)
  - [ ] Board read-only rendering for non-admin lands with the E2 board (client-side)
- [x] Stop joins on archived sessions (AC: 2)
  - [x] Join/seat endpoints reject when status ≠ live (join only when live)
  - [x] Archived sessions remain viewable (`SessionPageController` allows live/frozen/archived)
- [x] Delete (AC: 3)
  - [x] `DELETE /admin/sessions/{session}` → `SessionStateController@destroy` — cascade purges participants (FK); broadcast `SessionDeleted` on the channel
  - [x] Deletion is the full token-revocation path (AD-3)
- [x] Admin token auth (AC: 1)
  - [x] Extracted `AuthorizesAdminToken` trait (hash_equals, 404 no-leak) — now shared by config + state controllers

## Dev Notes

- AD-4: freeze is config, not a column — one validated structure. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-4]
- AD-7: capacity/freeze enforced transactionally server-side; the UI is never the only gate. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]
- Auth policy unified to 404 for missing/invalid admin tokens (no session-existence leak); the 1-2-era 403 expectation updated in SessionConfigTest.
- Groups/memberships/session_events tables land in E2 — cascade coverage extends then.

### Project Structure Notes

- Routes: admin.sessions.state.update / admin.sessions.destroy. New: AuthorizesAdminToken trait, SessionStateController, SessionStateUpdated + SessionDeleted events.

### References

- [Source: docs/planning/epics-groupify.md#E1S5]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-1]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]

# Traceability

- FR: FR-1.3, FR-1.4 | CAP: CAP-1 | AD: AD-3, AD-4, AD-7

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- SessionConfigTest expected 403 on bad token; unified policy is 404 — test updated to match the documented no-leak decision

### Completion Notes List

- All 3 ACs verified: 8 new Pest tests (40 total, 163 assertions); gates green (pint/phpstan/build ✓).
- Freeze/archive/delete all broadcast; client consumption lands with E2 board + E5 status.

### File List

- app/Http/Controllers/Admin/AuthorizesAdminToken.php
- app/Http/Controllers/Admin/SessionStateController.php
- app/Events/SessionStateUpdated.php
- app/Events/SessionDeleted.php
- app/Http/Controllers/Admin/SessionConfigController.php (trait refactor)
- app/Http/Controllers/JoinController.php (freeze check)
- app/Http/Controllers/SessionPageController.php (archived viewable)
- routes/web.php
- tests/Feature/SessionStateTest.php (8 tests)
- tests/Feature/SessionConfigTest.php (404 policy update)
- docs/stories/1-5-session-states.md (this record)
