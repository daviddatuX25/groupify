---
baseline_commit: 4f7694540c28e7653dce5d23145accdc82306238
---

# Story 3.6: Activity Feed

Status: review

## Story

As a facilitator,
I want a live activity feed of what is happening in the session,
so that I can follow the room without watching every screen.

## Acceptance Criteria

1. GIVEN key session events WHEN they occur THEN they are recorded (join, group created, member joined/left, moved, dissolved, freeze/archive).
2. GIVEN the admin WHEN they open the panel THEN the feed lists events newest-first.
3. GIVEN a non-admin WHEN they call the feed endpoint THEN it is rejected.

## Tasks / Subtasks

- [x] `session_events` table + `SessionEvent` model + `EventRecorder` service (append-only)
- [x] Recording hooks: participant_joined, group_created, member_joined/left, member_moved, groups_dissolved, session_frozen/unfrozen/archived
- [x] `GET /admin/sessions/{session}/activity` (token auth, latest 50)
- [x] Admin panel "Recent activity" section (fetched with the live refetch)

## Dev Notes

- FR-5.6; feeds future audit/moderation (CAP-10). [Source: docs/prds/prd-groupify/prd.md#FR-5.6]
- session_deleted is not recorded — the event row would cascade-delete with the session.

### References

- [Source: docs/planning/epics-groupify.md#E3S6]
- [Source: docs/prds/prd-groupify/prd.md#FR-5.6]

# Traceability

- FR: FR-5.6 | CAP: CAP-5 | AD: AD-1

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- phpstan: typed map closure + Carbon::parse for created_at
- Missed GroupController import (python replace anchor) — added via edit

### Completion Notes List

- 3 tests green; gates green (74 tests, 287 assertions); build ✓.

### File List

- database/migrations/…000004_create_session_events_table.php
- app/Models/SessionEvent.php
- app/Services/EventRecorder.php
- app/Http/Controllers/Admin/AdminActivityController.php
- app/Http/Controllers/JoinController.php, GroupController.php, Admin/AdminActionsController.php, Admin/SessionStateController.php (recording hooks)
- routes/web.php
- resources/js/pages/Admin/Show.tsx (activity section)
- tests/Feature/ActivityFeedTest.php (3 tests)
- docs/stories/3-6-activity-feed.md (this record)
