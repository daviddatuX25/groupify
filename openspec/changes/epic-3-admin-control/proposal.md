---
id: epic-3-admin-control
title: Epic 3 — Admin Control (panel, move, dissolve, freeze, export, feed, hotkeys)
status: implemented
createdAt: 2026-08-14
specIds:
  - CAP-5
requirementIds:
  - FR-5.1
  - FR-5.2
  - FR-5.3
  - FR-5.4
  - FR-5.5
  - FR-5.6
  - FR-5.7
---

# Proposal

The facilitator god-mode: a live admin panel (QR, PIN, stats, groups, pool) that
updates via the same channel events as participants; force-move members with
leadership transfer; dissolve one/all groups; freeze/unfreeze from the panel;
CSV export with dynamic field columns; an activity feed; projection hotkeys.

Implemented across stories 3-1 … 3-7, commits `c1894c3` … `4f76945`, 16 new Pest
tests, browser-verified: live stats propagation, freeze → join-block, dissolve,
hotkeys.

# Requirements

## REQ-3.1 Admin panel
QR + PIN + live stats; updates live from session events.

Status: implemented — story `3-1-admin-panel`

## REQ-3.2 Force-move
Move any member to another group or the pool; leadership transfers; transactional.

Status: implemented — story `3-2-force-move`

## REQ-3.3 Dissolve
Dissolve one group or all groups; memberships cleared; broadcasts.

Status: implemented — story `3-3-dissolve-groups`

## REQ-3.4 Freeze UI
Freeze/unfreeze from the panel; frozen blocks joins; admin exempt.

Status: implemented — story `3-4-freeze-unfreeze`

## REQ-3.5 CSV export
Group / name / email + every configured field; pooled rows as (pool).

Status: implemented — story `3-5-csv-export`

## REQ-3.6 Activity feed
Append-only session_events recorded on key mutations; newest-first admin feed.

Status: implemented — story `3-6-activity-feed`

## REQ-3.7 Projection hotkeys
'i' toggles join info; 'h' toggles the board.

Status: implemented — story `3-7-projection-hotkeys`

# Tasks

- [x] AdminActionsController (move/dissolve), AdminExportController, AdminActivityController
- [x] session_events migration + EventRecorder + recording hooks
- [x] Admin panel UI rebuild (stats, controls, member moves, pool, activity, hotkeys)
- [x] BoardController admin support (is_admin)
- [x] 16 new Pest tests; gates green (74 total, 287 assertions)
