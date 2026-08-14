---
baseline_commit: 54b971d272df3d650fc79091eb15a3851f258bff
---

# Story 1.1: Session Create

Status: review

## Story

As a facilitator,
I want to create a session with a unique code, PIN, and admin token,
so that participants can join and I can manage the session from the admin panel.

## Acceptance Criteria

1. GIVEN a facilitator who opens `/new` WHEN they create a session THEN a session is created with a unique 6-digit code, a 4-digit PIN, and an admin token.
2. GIVEN session creation WHEN no custom rules are set THEN the defaults apply: min 3 members, max 6, join mode open, naming scheme "Team Alpha…".
3. GIVEN a freshly created session WHEN the facilitator opens the admin URL with the admin token THEN they land in the admin panel.
4. GIVEN an admin panel URL WHEN it is opened without a valid admin token THEN the request is rejected.

## Tasks / Subtasks

- [x] Sessions migration and model (AC: 1) — landed with story 4-1
  - [x] `group_sessions` migration: code (unique 6-digit), pin (4-digit), config JSON, status, timestamps, admin_token
  - [x] `app/Models/Session.php` with SessionConfig cast; relations to participants/groups/memberships deferred to E2 (tables land there)
  - [x] Bearer admin_token stored on the row; 6-digit numeric code + 4-digit PIN generated at creation
- [x] Create-session flow at `/new` (AC: 1, 2)
  - [x] `GET /new` → `Admin/New` Inertia page; `POST /sessions` → `SessionController@store` (routes/web.php)
  - [x] Unique 6-digit code with collision retry (10 attempts + UniqueConstraintViolationException catch); 4-digit PIN; Str::random(40) admin token
  - [x] Default config seeded (min 3 / max 6 / join open / allow creation / naming alpha) — AC 2
  - [x] Redirect to admin panel URL with token — AC 3
- [x] Guard the admin panel route (AC: 4)
  - [x] `AdminPanelController@show` — hash_equals against stored admin_token (query or X-Admin-Token header)
  - [x] Invalid/missing token → 404 (no existence leak)
- [x] New Session Inertia page (AC: 1, 2)
  - [x] `resources/js/pages/Admin/New.tsx` — create form, submits POST /sessions, inline errors, loading state
  - [x] `resources/js/pages/Admin/Show.tsx` — session code + PIN shell; persists admin_token to localStorage for later X-Admin-Token calls (AD-3); QR/stats in 3-1

## Dev Notes

- AD-3: no accounts — admin identity is the per-session token; tokens are bearer, revocable only by session delete/archive. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-3]
- AD-4: default config seeded at creation; feature code reads config only through the resolver. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-4]
- Code format locked: 6-digit numeric (research: Quizizz/Blooket/Slido convention; no case-sensitive alphanumerics). [Source: research/interface-research.md]
- CSRF (PreventRequestForgery, Laravel 13): active in production; React client sends XSRF cookie automatically. Curl smoke required the cookie dance — verified 302 → 200 → 404 chain over live HTTP.

### Project Structure Notes

- Pages: resources/js/pages/Admin/{New,Show}.tsx. Routes: sessions.new / sessions.store / admin.sessions.show.
- Admin token persisted client-side under `groupify.admin_token` (localStorage) — mirrors participant token pattern (1-4).

### References

- [Source: docs/planning/epics-groupify.md#E1S1]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-1]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-3]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-4]

# Traceability

- FR: FR-1.1, FR-1.2 | CAP: CAP-1 | AD: AD-3, AD-4

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- curl POST returned 419 — CSRF working as intended (client sends XSRF cookie; curl needed cookie jar + X-XSRF-TOKEN)

### Completion Notes List

- All 4 ACs verified: unit (7 tests) + live HTTP smoke (GET /new SSR renders; POST → 302 to token URL; admin 200; no-token 404).
- Gates green: pest 19/19 (94 assertions), pint + phpstan clean, `npm run build` ✓ (557 modules).

### File List

- app/Http/Controllers/SessionController.php
- app/Http/Controllers/Admin/AdminPanelController.php
- routes/web.php
- resources/js/pages/Admin/New.tsx
- resources/js/pages/Admin/Show.tsx
- tests/Feature/SessionCreateTest.php (7 tests)
- docs/stories/1-1-session-create.md (this record)
