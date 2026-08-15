---
baseline_commit: 5112244
phase: 3
---

# Phase 3 · Story C: Live Online Presence (FR-3.5)

Status: done

## Story

As a facilitator,
I want to see who is actually connected right now,
so that I know who is physically present in the room.

## Acceptance Criteria

1. GIVEN a live session WHEN the admin opens the panel THEN the online count reflects live connections (not just joined seats).
2. GIVEN participants WHEN they open/close the board THEN the count changes in realtime for everyone.
3. GIVEN no valid token WHEN the presence auth is attempted THEN it is rejected.

## Tasks / Subtasks

- [x] Reverb presence channel `presence-session.{code}` — auth resolves the participant from the device token or the admin from the admin token
- [x] `SetDeviceUser` web-group middleware (request user resolver from token + channel)
- [x] `Participant` + `AdminIdentity` implement the Authenticatable-shaped identifier the presence signature requires (`getAuthIdentifier*`)
- [x] Registered pattern uses the normalized name (`session.{code}` — Pusher conventions strip the `presence-` prefix before matching)
- [x] Frontend: echo auth headers from localStorage + the initial Inertia page (Inertia 3 embeds page data as a script tag's text, not `#app` data-page)
- [x] `echo.join('session.'+code)` — Echo prepends `presence-` itself (double prefix was the final 403)
- [x] Session + Admin headers show the live count (falls back to the seat count)
- [x] 5 Pest tests + 1 e2e (live count moves 1 → 2 → 1 across browsers)

## Debug Log References

- The Laravel-Boost/community pattern (custom guard/viaRequest or request-user resolver) confirmed the shape: the presence auth needs an Authenticatable user
- Root causes found in order: (1) console-kernel probes never load channels.php (booted callbacks), (2) test broadcast driver was null (flip per-suite + forget instances), (3) `getAuthIdentifier` missing on Participant/AdminIdentity, (4) Pusher conventions normalize `presence-` away before pattern matching, (5) Inertia 3 page data is in a script tag's text, (6) Echo's `join()` prepends `presence-` itself

## File List

- app/Http/Middleware/SetDeviceUser.php (new), app/Support/AdminIdentity.php (new)
- app/Models/Participant.php (getAuthIdentifier*), routes/channels.php, routes/web.php
- bootstrap/app.php (web-group append), phpunit.xml (null broadcast driver stays global)
- resources/js/app.tsx, pages/Session/Show.tsx, pages/Admin/Show.tsx
- tests/Feature/PresenceTest.php (5), tests/e2e/presence.spec.ts
- docs/stories/phase3-presence.md (this record)
