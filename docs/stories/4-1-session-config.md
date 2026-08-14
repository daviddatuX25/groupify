---
baseline_commit: 207d5895edcf6f3e6eb21d5d8cb7ae8e37d00254
---

# Story 4.1: Session Config Object

Status: in-progress

## Story

As a developer,
I want one validated session config object (rules / fields / perms / extensions) with a single resolver,
so that adding a session-level setting is a config change only — never a migration or a new code path.

## Acceptance Criteria

1. GIVEN a session is created WHEN its config is stored THEN it is one validated JSON structure with `rules` / `fields` / `perms` / `extensions` (AD-4 shape).
2. GIVEN any feature needs a session setting WHEN it reads config THEN it goes through the single config resolver — no ad-hoc columns anywhere.
3. GIVEN the admin changes rules (e.g. min/max, join mode, allow-creation) WHEN the update commits THEN the change applies live to all screens.
4. GIVEN a new session-level setting is needed WHEN it is added to the config schema THEN no migration or new column is required.

## Tasks / Subtasks

- [x] Config schema + validation (AC: 1)
  - [x] `app/Support/SessionConfig.php` — typed value object with accessors `rules()/fields()/perms()/extensions()`; defaults from flexibility-model (min 3 / max 6 / join open / allow creation / naming alpha)
  - [x] `app/Casts/SessionConfigCast.php` — JSON cast on the `group_sessions.config` column
  - [x] `database/migrations/2026_08_14_000000_create_sessions_table.php` — `group_sessions` (code unique 6-digit, pin 4-digit, admin_token, status, config JSON) — renamed from `sessions` (collides with Laravel's session-storage table)
- [x] Config resolver service (AC: 2)
  - [x] `app/Services/PermissionService.php` — `can(action, role, config)` resolution order session override → role default → system default (AD-5) + `allowedActions(role)` for UI affordances
  - [x] `app/Support/RoleDefaults.php` — system default matrix (flexibility-model §1)
- [x] Config update endpoint (AC: 3)
  - [x] `PUT /admin/sessions/{session}/config` → `SessionConfigController@update`: X-Admin-Token auth (AD-3), merge + full-structure validation, transaction commit, broadcast (AD-1)
  - [x] `app/Events/SessionConfigUpdated.php` — broadcastable on `session.{code}` channel, revision UUID (AD-6)
- [ ] Live application (AC: 3) — client re-render deferred to E2/E5
  - [x] Broadcast dispatched on every config commit (verified via Event::fake in tests)
  - [ ] Client subscription + re-render from new snapshot (board stories E2S2/E5)
- [x] Schema evolution (AC: 4)
  - [x] Unknown future settings survive validation roundtrip (verified: `future_setting` preserved) — extend schema + defaults only, no migrations

## Dev Notes

- AD-4: config object is the single source of truth; feature code never reads ad-hoc columns. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-4]
- AD-5: perms live inside config; PermissionService consumes via the resolver. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-5]
- Laravel 13 gotchas hit: (1) `sessions` table name collides with the framework session-storage table (SESSION_DRIVER=database default) → `group_sessions`; (2) Laravel `Validator::validate()` drops unruled keys — merged back so future settings survive; (3) CSRF renamed PreventRequestForgery — tests bypass it per-file (React client sends XSRF cookie automatically, CSRF stays on).
- Level-7 phpstan: value object + cast need explicit generics (`@implements Arrayable<string, mixed>`, `CastsAttributes<TGet,TSet>`, `@use HasFactory<Factory>` on the trait use).

### Project Structure Notes

- `group_sessions` table per spine Seed (updated in ARCHITECTURE-SPINE.md); factory, model, cast, value object, service, event, controller, route.
- Route: `routes/web.php` → `admin.sessions.config.update`.

### References

- [Source: docs/specs/spec-groupify/flexibility-model.md#session-config-object-one-source-of-truth]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-4]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-5]
- [Source: research/laravel-guidelines.md]

# Traceability

- FR: FR-1.2 | CAP: CAP-7 | AD: AD-1, AD-4, AD-5, AD-6, AD-8, AD-9

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- `sessions` table collision with framework session storage → renamed `group_sessions` (spine Seed updated)
- migrate:fresh loop caused by the collision (table "already exists")
- 419 CSRF on PUT → per-file middleware bypass in tests only
- phpstan level 7: 18 → 0 errors via generics (Arrayable/CastsAttributes/HasFactory) + typed return docblocks

### Completion Notes List

- Backend complete and verified: config value object + cast + validation + permission service (resolution order + allowedActions) + admin update endpoint + broadcast event.
- Gates green: `composer run test` (pint 41 files + phpstan 0 + pest 12/12, 48 assertions).
- AC3 client-side live re-render deferred to E2S2/E5 (board stories) — task left open, story in-progress.

### File List

- database/migrations/2026_08_14_000000_create_sessions_table.php (group_sessions)
- database/factories/SessionFactory.php
- app/Models/Session.php
- app/Support/SessionConfig.php
- app/Support/RoleDefaults.php
- app/Casts/SessionConfigCast.php
- app/Services/PermissionService.php
- app/Events/SessionConfigUpdated.php
- app/Http/Controllers/Admin/SessionConfigController.php
- routes/web.php (admin config route)
- tests/Feature/SessionConfigTest.php (12 tests)
- docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md (seed table name)
- docs/stories/4-1-session-config.md (this record)

## Story

As a developer,
I want one validated session config object (rules / fields / perms / extensions) with a single resolver,
so that adding a session-level setting is a config change only — never a migration or a new code path.

## Acceptance Criteria

1. GIVEN a session is created WHEN its config is stored THEN it is one validated JSON structure with `rules` / `fields` / `perms` / `extensions` (AD-4 shape).
2. GIVEN any feature needs a session setting WHEN it reads config THEN it goes through the single config resolver — no ad-hoc columns anywhere.
3. GIVEN the admin changes rules (e.g. min/max, join mode, allow-creation) WHEN the update commits THEN the change applies live to all screens.
4. GIVEN a new session-level setting is needed WHEN it is added to the config schema THEN no migration or new column is required.

## Tasks / Subtasks

- [ ] Config schema + validation (AC: 1)
  - [ ] Define Laravel validation for the config object `{ rules{min_members, max_members, join_mode, allow_user_creation, naming, freeze}, fields[], perms, extensions[] }` (AD-4 + flexibility-model shape).
  - [ ] Store config as a JSON column on `sessions` (Seed shape); default config on session create.
- [ ] Config resolver service (AC: 2)
  - [ ] Create `app/Services/SessionConfig` as the single reader: typed accessors `rules()`, `fields()`, `perms()`, `extensions()`.
  - [ ] Feature code never reads ad-hoc columns (AD-4 rule); all feature reads go through the resolver.
- [ ] Config update endpoint (AC: 3)
  - [ ] Add admin route to update config with validation + merge; commit the transaction, then broadcast (AD-1); authorize with admin token (AD-3) and `can?` (AD-5).
- [ ] Live application (AC: 3)
  - [ ] Broadcast the config change on the session and admin channels (AD-6); clients re-render from the new server-computed snapshot.
- [ ] Schema evolution (AC: 4)
  - [ ] Extending config = extending the validation schema + defaults only; document the pattern; no migrations for new settings.

## Dev Notes

- AD-4: rules, fields, permissions, and enabled extensions live in ONE validated config structure per session; one resolver reads it; feature code never reads ad-hoc columns.
- AD-5: `perms` lives inside the config; the permission service consumes it through the same resolver (resolution order: session override → role default → system default).
- AD-8: `fields` in the config drive cards, search, and CSV — no schema changes per field.
- AD-9: `extensions[]` in the config is the per-session enablement switch; enabling is config-only.
- AD-1: config updates are mutations that commit a transaction, then broadcast.
- AD-6: config changes propagate live; reconnect ends in snapshot resync so no client renders stale rules.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#epic-e4--flexibility-systems-config-fields-permissions-extensions]
- [Source: docs/prds/prd-groupify/prd.md#f1--session-management]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-7]
- [Source: docs/specs/spec-groupify/flexibility-model.md#session-config-object-one-source-of-truth]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-1]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-3]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-4]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-5]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-8]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-9]

# Traceability

- FR: FR-1.2 | CAP: CAP-7 | AD: AD-1, AD-4, AD-5, AD-6, AD-8, AD-9

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/4-1-session-config.md
