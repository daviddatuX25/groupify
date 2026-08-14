---
baseline_commit: 60eddc446a3b729137c0280a620b2c9b23d2eca9
phase: 2
---

# Phase 2 · Story H: Chat Tiers (announcements + group chat)

Status: review

## Story

As a facilitator and group member,
I want announcements and group chat,
so that the room can communicate without leaving the board.

## Acceptance Criteria

1. GIVEN chat enabled WHEN the admin posts an announcement THEN it is stored, broadcast, and visible to every participant.
2. GIVEN a group member WHEN they post to their group THEN it is stored and visible to members; outsiders are blocked.
3. GIVEN `group_chat_mode=leader` WHEN a non-leader member posts THEN it is rejected.
4. GIVEN chat disabled WHEN any message endpoint is called THEN it is rejected.

## Tasks / Subtasks

- [x] `session_messages` table + `SessionMessage` model + `MessageCreated` event (broadcast on session channel)
- [x] `MessageController` — index (announcements to all; group messages to members) + store (announcement → admin+announce permission; group → member + leader-mode check)
- [x] Config: `chat_enabled` (bool, off by default), `group_chat_mode` (open|leader) + validation
- [x] Participant chat panel (announcements + group chat, composer when in a group, live via MessageCreated → refetch)
- [x] Admin announce composer
- [x] 7 Pest tests (admin announce+broadcast, non-admin block, member-only group, leader mode, index scoping, disabled flag, body validation)

## Dev Notes

- CAP-10 Communication tiers — first slice (announcements + group chat; global hub deferred). [Source: docs/specs/spec-groupify/SPEC.md#CAP-10]
- Announcements render as "Facilitator" when no author (admin posts).

### References

- [Source: docs/specs/spec-groupify/roadmap.md (phase 2 — chat tiers)]

# Traceability

- FR: — (CAP-10) | CAP: CAP-10 | AD: AD-1, AD-6

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Larastan: created_at cast not inferred → Carbon::parse; Collection type pinned with @var

### Completion Notes List

- 7 tests green (128 total, 472 assertions); e2e 6/6; live-verified: admin announce → participant sees "Facilitator: Welcome!", non-admin 404.

### File List

- database/migrations/…000009_create_session_messages_table.php
- app/Models/SessionMessage.php, app/Events/MessageCreated.php
- app/Http/Controllers/MessageController.php, routes/web.php
- app/Support/SessionConfig.php, app/Http/Controllers/Admin/SessionConfigController.php
- resources/js/pages/Session/Show.tsx, Admin/Show.tsx
- tests/Feature/ChatTiersTest.php (7 tests)
- docs/stories/phase2-chat-tiers.md (this record)
