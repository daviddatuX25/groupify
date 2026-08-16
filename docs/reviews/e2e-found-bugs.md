---
title: Groupify — E2E Coverage Bugs
status: open
created: 2026-08-16
updated: 2026-08-16
---

# Bugs found by the e2e coverage expansion

Found while writing `tests/e2e/*` (Phase 2 of `docs/planning/e2e-coverage-plan.md`).
Three fixed in the same pass (one app bug, two input bugs); the rest are filed here for story work.
One fixed in the same pass; the rest are filed here for story work.

## Fixed

### 1. Permissions tab role assignment always fails — FIXED
`resources/js/pages/Admin/PermsEditor.tsx` — the assign-role dialog's
`onConfirm={(role) => assignRole(id, role)}` received `(action, value)` and
used the **action string** ("role") as the role name. Every assignment 422'd
with "Unknown role: role".
Fix: `onConfirm={(_action, role) => assignRole(assignmentParticipant.id, role)}`.
Verified: `member-actions.spec.ts` "admin defines a custom role…" green.

### 2. Team-size field snaps to 1 when cleared — FIXED
`resources/js/pages/Admin/ConfigEditor.tsx` — the exact-size "Team size"
number input coerced every keystroke: `Number(e.target.value) || 1`. Clearing
the field jumped it to 1, so typing a new number produced "19" instead of "9".
Fix: the input is backed by a raw string draft (empty stays empty mid-edit),
normalized on blur and at save.
Verified: `config-editor.spec.ts` "clearing the team size field…".

### 3. Quiz points field snaps to 0 when cleared — FIXED
`resources/js/pages/Admin/Show.tsx` — same class of bug: `points: Number(...)`
on every keystroke. The draft now keeps the raw string; the save coerces
`Number(points) || 1`.
Verified: `config-editor.spec.ts` "clearing the quiz points field…".

## Open

### 4. Moderation queue never refreshes on its own
Pending posts broadcast nothing and the admin panel has **no mount/connect
refetch** — the queue (and chat monitor, activity feed, template list) stays
empty on a fresh load until an unrelated channel event or mutation fires.
Admin must create a group / toggle a plugin / wait for a join to see pending
messages. Tests work around it (`openModerationQueue` triggers a refetch);
fix is a pending-message broadcast or a mount refetch.

### 5. Reject leaves the moderation queue stuck at (1)
`AdminMessageController::decide` deletes the message, but the admin UI's
refetch can read a stale pending list — the queue header stays at (1) after
reject (approve clears only because its `MessageCreated` broadcast triggers a
second refetch). `messaging.spec.ts` asserts the server truth instead.

### 6. Banned participants stay visible in the pool
`SessionSnapshot` pool query has no `banned_at` filter — a banned participant
is removed from groups but still shows as a pool chip (no actions work).
Fix: exclude `banned_at` participants from the pool query.

### 7. Profile customization is unwired — FIXED
`AvatarProfileDialog` existed but no page rendered it and no UI called
`PATCH /s/{code}/profile`. Wired 2026-08-16: the participant profile card now
has a "Customize" button that opens the dialog; save PATCHes the profile with
toast + sound feedback and refetches the board. Avatar-style shelf extended to
9 styles (server allow-list updated). `profile.spec.ts` + the new avatar hub
flow cover it.

### 8. Leadership transfer is unwired
`POST /admin/sessions/{id}/groups/{g}/leader` has a controller but no UI
caller. `leader-flow.spec.ts` pins the API contract.

### 9. Export button 404s
The admin header's Export `<a href>` sends no `X-Admin-Token` and no
`?token=` — `AuthorizesAdminToken` requires one, so the click 404s.
`admin-tools.spec.ts` tests the endpoint via API; fix the link to carry the
token (query param or cookie).

## Infra note

### 10. Reverb broadcast delivery degrades under sustained load
The prod container's Reverb accumulates ghost WS connections; after ~1h of
test load, broadcast jobs report DONE but clients never receive events
(queue worker's Reverb connection goes stale). `scripts/e2e.sh` now
force-recreates the stack per run; CI gets a fresh container per run anyway.
Worth a worker-restart watchdog in prod.
