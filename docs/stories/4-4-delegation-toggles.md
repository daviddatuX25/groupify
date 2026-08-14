---
baseline_commit: d4e3dc7f4944f8ba204c7c46c555d66968eedaae
---

# Story 4.4: Delegation Toggles

Status: review

## Story

As a facilitator,
I want to delegate bounded powers to group leaders,
so that sessions stay flexible without losing control.

## Acceptance Criteria

1. GIVEN the default matrix WHEN a leader creates a group THEN they may set the group's size within session hard limits.
2. GIVEN a session override denying `set_group_size` or `fill_group_fields` for leaders WHEN they attempt it THEN it is rejected.
3. GIVEN a per-group capacity WHEN set THEN join checks and the board use it.

## Tasks / Subtasks

- [x] `groups.capacity` (nullable; null = session max) + `Group::effectiveCapacity`/`openSlots`
- [x] `GroupController@store` accepts `capacity` bounded by session min/max; enforcement via `PermissionService::can('set_group_size', 'leader')` (session override → role default, AD-5); `fill_group_fields` enforcement on field values
- [x] Join + admin move capacity checks use the per-group capacity; snapshot exposes it
- [x] 6 Pest tests (delegated set, bounds, override deny, snapshot/join capacity, fill deny, registry)

## Dev Notes

- FR-4.5: delegation is always bounded by session hard limits. [Source: docs/prds/prd-groupify/prd.md#FR-4.5]
- The perms overrides are set via the existing config endpoint (perms → action → role → bool) — the setup UI surface for these toggles lands with the 5-2 admin shell (config panel).

### References

- [Source: docs/planning/epics-groupify.md#E4S4]
- [Source: docs/specs/spec-groupify/flexibility-model.md#1-permission-engine-cap-7]

# Traceability

- FR: FR-6.2, FR-6.3, FR-6.5 | CAP: CAP-7 | AD: AD-4, AD-5

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Closure `use` list missing `$data`/`$session` (capacity null + undefined variable) — fixed
- ValidationException import missing in SessionConfigController

### Completion Notes List

- 6 tests green; gates green (81 tests, 316 assertions).

### File List

- database/migrations/…000005_add_capacity_to_groups_table.php
- app/Models/Group.php, app/Services/SessionSnapshot.php
- app/Http/Controllers/GroupController.php, Admin/AdminActionsController.php, Admin/SessionConfigController.php
- tests/Feature/DelegationExtensionsTest.php
- docs/stories/4-4-delegation-toggles.md (this record)
