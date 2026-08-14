---
id: epic-1-session-foundation
title: Epic 1 — Session Foundation (create, join, rejoin, states, purge)
status: implemented
createdAt: 2026-08-14
specIds:
  - CAP-1
  - CAP-2
  - CAP-15
requirementIds:
  - FR-1.1
  - FR-1.2
  - FR-1.3
  - FR-1.4
  - FR-1.6
  - FR-1.7
  - FR-2.1
  - FR-2.2
  - FR-2.3
  - FR-2.4
  - FR-2.5
---

# Proposal

Ephemeral session lifecycle: facilitators create token-gated sessions, participants
join by code+PIN or QR with a device-token seat, returning devices auto-rejoin,
sessions freeze/archive/delete with live broadcasts, and archived sessions purge
after 30 days. No user accounts (AD-3); one seat per (session, device token) (AD-7).

Implemented across 7 stories (1-1 … 1-7), commits `984ca9a` … `de38d8a`, 32 Pest
tests, browser-verified join/rejoin/QR flows. Traces: SPEC CAP-1/CAP-2/CAP-15,
PRD FR-1.x/FR-2.x, spine AD-1/AD-3/AD-4/AD-6/AD-7.

# Requirements

## REQ-1.1 Create session
Facilitator creates a session with unique 6-digit code, 4-digit PIN, and admin
token; defaults applied (min 3 / max 6 / join open / naming alpha); creator
redirected into the token-gated admin panel.

Status: implemented — story `1-1-session-create`, tests Feature/SessionCreateTest.php (7)

## REQ-1.2 Join by code + PIN
Participant joins with PIN + required name + optional email; clear 422 errors on
wrong PIN; no lockout; seat row created for the device token.

Status: implemented — story `1-2-join-code-pin`, tests Feature/JoinSessionTest.php (9)

## REQ-1.3 QR join
Admin panel renders a QR encoding the join URL; scanning lands on the join page
with the code pre-filled; PIN still typed.

Status: implemented — story `1-3-qr-join` (browser-verified)

## REQ-1.4 Auto-rejoin
Returning device with an existing seat skips the form and lands in its seat via
`GET /join/{code}/seat`; foreign tokens report no seat.

Status: implemented — story `1-4-auto-rejoin`, tests Feature/AutoRejoinTest.php (4)

## REQ-1.5 Session states
Freeze/unfreeze/archive via admin PATCH with broadcasts; frozen blocks joins;
archived stops joins but stays viewable; delete purges rows (cascade).

Status: implemented — story `1-5-session-states`, tests Feature/SessionStateTest.php (8)

## REQ-1.6 Join-instruction bar
Pinned bar on participant screens with join URL + code (AhaSlides pattern).

Status: implemented — story `1-6-join-instruction-bar` (browser-verified)

## REQ-1.7 Auto-purge
Daily `sessions:purge` deletes archived sessions older than 30 days with rows.

Status: implemented — story `1-7-auto-purge`, tests Feature/PurgeArchivedSessionsTest.php (4)

# Tasks

- [x] Sessions + participants migrations, models, factories
- [x] SessionController (new/store), JoinController (show/store/seat), SessionPageController, AdminPanelController, SessionConfigController, SessionStateController (+ AuthorizesAdminToken trait)
- [x] Events: SessionConfigUpdated, SessionStateUpdated, SessionDeleted
- [x] PurgeArchivedSessions command + daily schedule
- [x] Pages: Admin/New, Admin/Show (+QR), Session/Join, Session/Show (+join bar)
- [x] Test isolation fix (compose env no longer leaks into phpunit)
- [x] 32 new Pest tests; pint/phpstan/build green
