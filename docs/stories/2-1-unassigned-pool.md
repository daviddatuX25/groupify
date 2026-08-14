---
baseline_commit: 2002483ea55f4463d2d392b5b9547882f28ac62a
---

# Story 2.1: Unassigned Pool

Status: review

## Story

As a facilitator,
I want to see every joined-but-ungrouped participant,
so that I know who is still waiting to be placed.

## Acceptance Criteria

1. GIVEN a session with pooled participants WHEN the board snapshot is served THEN the pool lists exactly the participants without an active membership.
2. GIVEN a viewing participant WHEN the board loads with their device token THEN their identity resolves and their pooled state is correct.

## Tasks / Subtasks

- [x] Schema (AD-7): `groups` (session FK, leader_id, name, field_values JSON) + `memberships` (group FK, participant FK, role, status, unique pair)
- [x] Models + factories: Group, Membership (+ Session::groups() relation)
- [x] `app/Services/SessionSnapshot.php` — server-computed board: pool (participants minus active member ids), groups with member_count/capacity/open_slots/fields/members, presence count, `me` from device token
- [x] Session page resolves identity from `X-Device-Token` header or `device_token` query param (join redirect now carries it)

## Dev Notes

- AD-7: pool = participants without active membership; membership unique per (group, participant). [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]
- AD-6: snapshot is the client render source. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]
- The full-page load can't send the device-token header — the join redirect embeds `device_token` as a query param; page loads resolve `me` from it (controller supports both).

### References

- [Source: docs/planning/epics-groupify.md#E2S1]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-3]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]

# Traceability

- FR: FR-3.1 | CAP: CAP-3 | AD: AD-6, AD-7

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Wayfinder build break: `AdminPanelController extends Controller` with missing import (removed)
- Session::groups() relation missing → snapshot 500s (added)
- Board identity null on full page load → redirect now carries device_token query

### Completion Notes List

- Verified: pool listing, identity resolution, presence — 4 tests; browser-verified join → board with pooled status.

### File List

- database/migrations/…000002_create_groups_table.php, …000003_create_memberships_table.php
- app/Models/Group.php, app/Models/Membership.php (+ factories)
- app/Services/SessionSnapshot.php
- app/Http/Controllers/SessionPageController.php, Admin/AdminPanelController.php
- app/Http/Controllers/JoinController.php (redirect with device_token)
- tests/Feature/BoardSnapshotTest.php
- docs/stories/2-1-unassigned-pool.md (this record)

---

# Story 2.2: Grid Board

Status: review

## Story

As a participant,
I want a live grid of group cards with names, slots, and topics,
so that I can see where I fit at a glance.

## Acceptance Criteria

1. GIVEN the board WHEN rendered THEN group cards show name, slot dots (filled/empty), member list, leader marker, and field values.
2. GIVEN the search input WHEN typing THEN cards filter by group name or field value.
3. GIVEN the "open slots only" toggle WHEN enabled THEN full groups are hidden.

## Tasks / Subtasks

- [x] Board UI (`Session/Show.tsx` rewrite): status header (presence + pool counts), me banner, search, open-slots toggle, card grid (name, slot dots with glow, leader marker, field values, members, open/FULL)
- [x] Client-side filtering (name + field values; open-slots toggle) — server-side search deferred to scale need (snapshot is the source)
- [x] Snapshot supplies `capacity` (config max_members) + `open_slots` + `field_values`

## Dev Notes

- ADOPT OpenSpace-style grid + Kahoot slot-presence patterns (research/interface-research.md). [Source: research/interface-research.md]
- FR-3.2/FR-3.4. Create/join actions land in 2-3/2-4 (board is display-only here — no dead buttons shipped).

### References

- [Source: docs/planning/epics-groupify.md#E2S2]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-3]
- [Source: research/interface-research.md]

# Traceability

- FR: FR-3.2, FR-3.4 | CAP: CAP-3 | AD: AD-6

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None

### Completion Notes List

- Browser-verified: board renders with pool status, search, open-slots toggle, presence; card grid verified via snapshot tests (member_count, capacity, open_slots, field_values).

### File List

- resources/js/pages/Session/Show.tsx
- docs/stories/2-2-grid-board.md (this record)
