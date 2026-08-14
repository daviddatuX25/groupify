---
baseline_commit: 6835df020651ce42acef54fc3551578d1a16d2f7
phase: 2
---

# Phase 2 · Story I: Global Chat Hub + Moderation

Status: review

## Story

As a participant and facilitator,
I want a session-wide chat with a moderation queue,
so that the room can network safely.

## Acceptance Criteria

1. GIVEN chat enabled WHEN any participant posts to the global hub THEN everyone in the session sees it.
2. GIVEN `global_chat_mode=muted` WHEN a participant posts THEN writes are rejected (reads keep working).
3. GIVEN `global_chat_mode=moderated` WHEN a participant posts THEN it is queued invisible until the admin approves (visible) or rejects (deleted).

## Tasks / Subtasks

- [x] `session_messages.status` (visible|pending) + migration
- [x] Global scope: any participant may post; muted → 422; moderated → pending (no broadcast until approved)
- [x] `AdminMessageController` — pending list + decide (approve → visible + broadcast; reject → delete)
- [x] Config `global_chat_mode` (open|muted|moderated) + validation
- [x] Participant chat panel: global composer (room-wide); admin moderation queue section
- [x] 3 new Pest tests (global visible, muted, moderated queue+approve+reject)

## Dev Notes

- Completes the 3-tier communication matrix (announcements/global/group). [Source: docs/specs/spec-groupify/SPEC.md#CAP-10]
- Slido "In review" moderation pattern. [Source: research/interface-research.md]

### References

- [Source: docs/specs/spec-groupify/roadmap.md (phase 2 — chat tiers)]

# Traceability

- FR: — (CAP-10) | CAP: CAP-10 | AD: AD-1, AD-6

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Larastan map inference (author nullsafe) — typed closure + Carbon::parse

### Completion Notes List

- 3 tests green (131 total, 490 assertions); e2e 6/6; live-verified: moderated post → count 0 → admin approve → visible.

### File List

- database/migrations/…000010_add_status_to_session_messages_table.php
- app/Http/Controllers/Admin/AdminMessageController.php, routes/web.php
- app/Http/Controllers/MessageController.php, app/Support/SessionConfig.php, Admin/SessionConfigController.php
- resources/js/pages/Session/Show.tsx, Admin/Show.tsx
- tests/Feature/ChatTiersTest.php (+3)
- docs/stories/phase2-global-chat-moderation.md (this record)
