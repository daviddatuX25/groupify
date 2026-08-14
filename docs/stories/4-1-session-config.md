# Story 4.1: Session Config Object

Status: ready-for-dev

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
