---
baseline_commit: 5d11c3ed6bab893a769ec780ba590fdc83ae30df
phase: 2
---

# Phase 2 · Story J: Custom Roles

Status: review

## Story

As a facilitator,
I want to define roles with their own permission sets and assign them,
so that trusted participants can help run the session.

## Acceptance Criteria

1. GIVEN a defined custom role WHEN `can(action, role)` is evaluated THEN the action resolves from the role's action set.
2. GIVEN an assigned participant WHEN they act THEN their custom-role powers apply (e.g. announce) while their base member powers remain.
3. GIVEN an undefined role WHEN assigned THEN it is rejected; clearing the role revokes the powers.

## Tasks / Subtasks

- [x] `participants.custom_role` (nullable) + migration
- [x] Config `roles` map ({ name: action[] }) + validation; merged through the config endpoint (was missing from the merge list — fixed)
- [x] `PermissionService::can()` resolves custom roles from the session config; standard roles unchanged
- [x] `AdminActionsController@assignRole` (validate + assign/clear) + route
- [x] Announcement path honors participant custom roles (device-token announce)
- [x] Snapshot exposes custom_role (pool + members)
- [x] Admin UI: role editor (name + actions) + assign select on pool chips
- [x] 6 Pest tests (resolution, announce, undefined rejection, clear revocation, additive base role, snapshot)

## Dev Notes

- CAP-16 custom roles; additive grants (a custom role grants its actions; the base membership role still governs everything else). [Source: docs/specs/spec-groupify/SPEC.md#CAP-16]

### References

- [Source: docs/specs/spec-groupify/flexibility-model.md#1-permission-engine-cap-7]

# Traceability

- FR: — (CAP-16) | CAP: CAP-16 | AD: AD-5

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Config endpoint dropped `roles` from the request merge — added to the only() list
- Test expectation corrected: custom roles are additive, not restrictive

### Completion Notes List

- 6 tests green (137 total, 506 assertions); e2e 6/6; live-verified: role defined+assigned → co-host announced via device token.

### File List

- database/migrations/…000011_add_custom_role_to_participants_table.php
- app/Support/SessionConfig.php, app/Services/PermissionService.php
- app/Http/Controllers/Admin/AdminActionsController.php, Admin/SessionConfigController.php, MessageController.php
- app/Services/SessionSnapshot.php, routes/web.php
- resources/js/pages/Admin/Show.tsx
- tests/Feature/CustomRolesTest.php (6 tests)
- docs/stories/phase2-custom-roles.md (this record)
