# Story 4.5: Extensions Framework

Status: ready-for-dev

## Story

As a developer,
I want an extension registry with a hook contract wired into session events,
so that future modules (chat, quiz, approvals…) can be enabled per session via config without ever mutating core grouping logic.

## Acceptance Criteria

1. GIVEN the framework is in place WHEN a session event fires (join/leave/create/dissolve/move) THEN the hooks of registered, enabled extensions are invoked with the event payload.
2. GIVEN a session config lists extensions WHEN the session runs THEN only the enabled extensions are active — enablement is per-session and config-driven.
3. GIVEN no extension is enabled WHEN the session runs THEN core behavior is unchanged and no extension code executes.
4. GIVEN an extension is enabled on one session WHEN another session has it disabled THEN enablement differs per session with zero core changes.
5. GIVEN the core code WHEN it is inspected for extension references THEN it contains none — core (session/join/pool/grid/groups/admin/fields/perms) is extension-agnostic.

## Tasks / Subtasks

- [ ] Extension registry (AC: 1)
  - [ ] Create `app/Extensions/ExtensionRegistry` where first-party extensions register by key; core never hard-codes a module (AD-9).
- [ ] Hook contract (AC: 1)
  - [ ] Define the extension contract: hooks on session events + own screens + own namespaced data tables (flexibility-model extension contract, AD-9).
  - [ ] Dispatch session events (join/leave/create/dissolve/move, with payload `{ type, session_id, entity ids, revision }`) to hooks of enabled extensions (AD-1, AD-6).
- [ ] Config-driven enablement (AC: 2, 4)
  - [ ] Read `extensions[]` from the session config (AD-4) via the single resolver; the registry runs only enabled extensions per session.
- [ ] Core stays no-op (AC: 3, 5)
  - [ ] Core grouping logic contains zero extension references (AD-9); no modules ship yet (FR-7.3 — framework only, validated by tests).

## Dev Notes

- AD-9: extensions register listeners on session events, own screens, and own namespaced tables; core is extension-agnostic; core code cannot know an extension exists.
- AD-4: `extensions[]` lives in the validated session config; enabling an extension on one session and not another is config-only.
- AD-1: session events are the committed-mutation broadcast stream extensions hook into; events carry entity IDs + revision numbers (AD-6).
- Taxonomy (flexibility-model): Core / Extensions / Plugins; extension domains Communication, Formation, Trust, Data, Event.
- FR-7.3: night one ships the data model + hook contract only — no reference module; the framework is validated by tests.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#epic-e4--flexibility-systems-config-fields-permissions-extensions]
- [Source: docs/prds/prd-groupify/prd.md#f7--extensions-framework]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-8]
- [Source: docs/specs/spec-groupify/flexibility-model.md#3-extension-taxonomy-cap-8]
- [Source: docs/specs/spec-groupify/flexibility-model.md#extension-contract]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-1]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-4]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-9]

# Traceability

- FR: FR-7.1, FR-7.2 | CAP: CAP-8 | AD: AD-1, AD-4, AD-6, AD-9

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/4-5-extensions-framework.md
