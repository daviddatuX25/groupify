# Story 4.3: Permission Engine

Status: review

## Story

As a developer,
I want a centralized permission engine resolving every action through `can?(action, role)`,
so that permissions resolve consistently (session override → role default → system default) and the UI never shows dead buttons.

## Acceptance Criteria

1. GIVEN an action and a role WHEN `can?(action, role)` is evaluated THEN resolution order is session override → role default → system default (flexibility-model matrix).
2. GIVEN a session override exists for an action WHEN `can?` is evaluated THEN the override wins over role and system defaults.
3. GIVEN the server computes an allowed-action set WHEN the UI renders THEN only permitted actions are shown — no dead buttons, no client-side re-check.
4. GIVEN a non-permitted action is requested WHEN the endpoint is called THEN it is rejected server-side (defense in depth, not UI hiding).

## Tasks / Subtasks

- [ ] Permission service (AC: 1, 2)
  - [ ] Create `app/Services/PermissionService` with `can?(action, role, session)` resolving session override → role default → system default (AD-5).
  - [ ] Seed system defaults from the flexibility-model default matrix (admin / leader / member; `create group`, `set group size`, `fill group fields`, `move members`, `dissolve all groups`, `export csv`, …).
  - [ ] Derive role: admin from the per-session admin token (AD-3); leader/member from `memberships.role` (AD-7).
- [ ] Allowed-action set (AC: 3)
  - [ ] Service exposes the allowed-action set per session + role; Inertia props carry it to the client; UI renders affordances only from it (AD-5).
- [ ] Server-side enforcement (AC: 4)
  - [ ] Controllers call `can?` before mutating and reject unauthorized requests (403); hiding in the UI is never the only control (AD-5).
- [ ] Overrides storage (AC: 2)
  - [ ] Store per-session overrides in config `perms` (AD-4) merged over `role_defaults` (flexibility-model data shape: `session_permissions` merged over `role_defaults`).

## Dev Notes

- AD-5: `can?(action, role, session)` resolves session override → role default → system default in ONE service; the same service emits the allowed-action set the UI renders.
- AD-4: `perms` lives in the validated session config; the permission service reads it through the single config resolver.
- AD-7: role comes from the membership row (leader/member); admin from the admin token (AD-3) — no users table.
- AD-3: identity = device token + per-session admin token; role derivation never assumes accounts.
- Rule (AD-5): UI affordances render only from the server-computed allowed-action set; the client never runs a second check.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#epic-e4--flexibility-systems-config-fields-permissions-extensions]
- [Source: docs/prds/prd-groupify/prd.md#f6--permissions-engine]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-7]
- [Source: docs/specs/spec-groupify/flexibility-model.md#1-permission-engine-cap-7]
- [Source: docs/specs/spec-groupify/flexibility-model.md#resolution-order]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-3]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-4]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-5]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]

# Traceability

- FR: FR-6.1, FR-6.4 | CAP: CAP-7 | AD: AD-3, AD-4, AD-5, AD-7

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/4-3-permission-engine.md
