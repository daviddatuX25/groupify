# Story 1.1: Session Create

Status: ready-for-dev

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

- [ ] Create the `sessions` migration and model (AC: 1)
  - [ ] `database/migrations/…_create_sessions_table.php`: code, pin, config JSON, status, timestamps; unique index on `code`
  - [ ] `app/Models/Session.php` with casts for `config` and relations to participants/groups/memberships/session_events
  - [ ] Store the admin_token (bearer) on the session row; 6-digit numeric code + random 4-digit PIN generated at creation
- [ ] Build the create-session flow at `/new` (AC: 1, 2)
  - [ ] Route `POST /sessions` in routes/web.php → `SessionController@store` in app/Http/Controllers
  - [ ] Generate a unique 6-digit code (retry on collision) and random 4-digit PIN; validate code format
  - [ ] Seed default config JSON per AD-4: rules (min 3 / max 6, join mode open, allow user creation, naming "Team Alpha…"), empty fields, perms, extensions (AC: 2)
  - [ ] Return the admin panel URL containing the admin_token; redirect creator into the admin panel (AC: 3)
- [ ] Guard the admin panel route (AC: 4)
  - [ ] Admin routes authorize by comparing the admin_token query/header against the session's stored token (AD-3)
  - [ ] Reject (404/redirect) admin panel requests without a matching admin_token
- [ ] Create the New Session Inertia page (AC: 1, 2)
  - [ ] `resources/js/pages/Admin/New.tsx` with the create form; rules fields (min/max, join mode, naming scheme) pre-filled with defaults (AC: 2)
  - [ ] Submit via Inertia; on success redirect to the admin panel page `resources/js/pages/Admin/Show.tsx`
  - [ ] Show validation errors inline on failed create

## Dev Notes

- AD-3 Identity: no users table — admin identity is the per-session admin_token; every session-scoped request is authorized by token (participant or admin); tokens are bearer and revocable only by session delete/archive.
- AD-4 Session config object: rules/fields/perms/extensions live in ONE validated config JSON per session; feature code never reads ad-hoc columns; adding a setting = extending the config schema.
- AD-1: every mutation is an HTTP action that commits a transaction, then broadcasts; SQLite is the only source of truth.
- Seed shape (ARCHITECTURE-SPINE.md#Seed): `sessions` table = (code, pin, config JSON, status, timestamps); channels `session:<code>` and `admin:<code>`.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md (E1S1)]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-1 (Session lifecycle)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-3 (Identity — device token + session, no accounts)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-4 (Session config object — single source of truth)]
- [Source: docs/prds/prd-groupify/prd.md#F1 (Session management — FR-1.1, FR-1.2)]

# Traceability

- FR: FR-1.1, FR-1.2 | CAP: CAP-1 | AD: AD-3, AD-4

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/1-1-session-create.md
