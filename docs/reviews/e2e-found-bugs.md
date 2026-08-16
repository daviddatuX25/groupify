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

### 4. Moderation queue never refreshes on its own — FIXED
Root cause was two-fold: pending posts broadcast nothing, and the admin had
no mount refetch. Fixed by broadcasting `MessageCreated` for pending posts,
adding a mount refetch for the admin-only panels, and a 5s resilience poll so
a dropped WS event can never leave the admin stale. The deeper root cause was
the service worker: `/admin/sessions/*` GETs fell into its cache-first branch
and served one-request-stale responses — the SW is now network-first for all
dynamic endpoints (v2). Tests assert the realtime queue appearance with no
user action.

### 5. Reject leaves the moderation queue stuck at (1) — FIXED
Same service-worker staleness as #4: the decide handler's refetch read the
previous cached pending list. With the SW network-first fix the refetch reads
fresh; reject also broadcasts so the queue header clears immediately. The
test asserts the queue disappears after reject.

### 6. Banned participants stay visible in the pool — FIXED
`SessionSnapshot` pool query (and the seat/presence count) now excludes
`banned_at` participants. The ban test asserts the participant vanishes from
both the group and the pool.

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

### 9. Export button 404s — FIXED
The Export control is now a button that downloads via an authenticated
fetch → blob (`X-Admin-Token` header; no bearer token in the URL). The test
clicks the UI button and asserts the CSV download.

## Infra note

### 10. Reverb broadcast delivery degrades under sustained load
The prod container's Reverb accumulates ghost WS connections; after ~1h of
test load, broadcast jobs report DONE but clients never receive events
(queue worker's Reverb connection goes stale). `scripts/e2e.sh` now
force-recreates the stack per run; CI gets a fresh container per run anyway.
Worth a worker-restart watchdog in prod.
