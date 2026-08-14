---
id: epic-2-live-board
title: Epic 2 — Live Board (pool, grid, groups, realtime)
status: implemented
createdAt: 2026-08-14
specIds:
  - CAP-3
  - CAP-4
  - CAP-9
requirementIds:
  - FR-3.1
  - FR-3.2
  - FR-3.3
  - FR-3.4
  - FR-3.5
  - FR-4.1
  - FR-4.2
  - FR-4.3
  - FR-4.4
  - FR-8.3
---

# Proposal

The live board: participants land in the unassigned pool, see a realtime grid of
group cards (names, slot dots, fields, members), create groups (auto-named with
required fields), join/leave with transactional capacity+freeze checks and
leadership transfer, and see every change live via Reverb/Echo with reconnect
resync. One server-computed snapshot (SessionSnapshot) is the render source.

Implemented across stories 2-1 … 2-6, commits `2c7fb88` … `f1caf93`, 18 new Pest
tests, browser-verified: create/join/leave flows and a live cross-client update
without page reload.

# Requirements

## REQ-2.1 Unassigned pool
Pool lists participants without active memberships; identity resolves from the device token.

Status: implemented — story `2-1-unassigned-pool`

## REQ-2.2 Grid board
Cards show name, slots, leader, members, field values; search + open-slots filter.

Status: implemented — story `2-2-grid-board`

## REQ-2.3 Create group
Auto (Team Alpha/Bravo…, Table N) or custom name; required session fields validated; creator is leader.

Status: implemented — story `2-3-create-group`

## REQ-2.4 Join/leave group
Open-mode join with transactional capacity + freeze checks; leave; leadership transfer to next-joined member.

Status: implemented — story `2-4-join-leave-group`

## REQ-2.5 Live updates + flashes
Echo subscription refetches the snapshot on any session event; membership changes flash the card.

Status: implemented — story `2-5-live-flashes` (browser-verified live cross-client)

## REQ-2.6 Snapshot resync
Reconnect → full snapshot refetch; SessionDeleted → session-ended state.

Status: implemented — story `2-6-snapshot-resync`

# Tasks

- [x] groups + memberships migrations, models, factories
- [x] SessionSnapshot service; SessionPageController + BoardController (JSON)
- [x] GroupController (store/join/leave), GroupNamer, GroupCreated + MembershipChanged events
- [x] Board UI with search/filter, create form, join/leave, flash + resync wiring
- [x] 18 new Pest tests; gates green (62 total, 257 assertions)
