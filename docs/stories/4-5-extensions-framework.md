---
baseline_commit: d4e3dc7f4944f8ba204c7c46c555d66968eedaae
---

# Story 4.5: Extensions Framework

Status: review

## Story

As a developer,
I want a registry-based extension framework,
so that future modules (chat, quiz, proxy…) plug in without touching core grouping logic.

## Acceptance Criteria

1. GIVEN the config endpoint WHEN an unregistered extension key is enabled THEN it is rejected.
2. GIVEN the registry WHEN queried THEN it lists the currently implementable modules (none on night one).
3. GIVEN `extensions[]` in config WHEN empty THEN the session runs bare.

## Tasks / Subtasks

- [x] `app/Extensions/ExtensionRegistry` — registered() returns implementable keys (empty on night one; planned: chat, approval-queue, proxy, auto-dissolve, match-me, device-binding, quiz, custom-roles)
- [x] Config update validates extensions against the registry (unknown → 422)
- [x] `extensions[]` already lives in the config object (AD-4) — enablement is config-only (AD-9)
- [x] 1 Pest test (reject + empty-allowed + registry empty)

## Dev Notes

- AD-9: extensions = hooks on session events + own screens + own data; core is extension-agnostic. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-9]
- Extension contract documented in flexibility-model.md §3.

### References

- [Source: docs/planning/epics-groupify.md#E4S5]
- [Source: docs/specs/spec-groupify/flexibility-model.md#3-extension-taxonomy-cap-8]

# Traceability

- FR: FR-7.1, FR-7.2 | CAP: CAP-8 | AD: AD-9

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None

### Completion Notes List

- Registry + validation green; modules ship with their roadmap phase.

### File List

- app/Extensions/ExtensionRegistry.php
- app/Http/Controllers/Admin/SessionConfigController.php
- tests/Feature/DelegationExtensionsTest.php
- docs/stories/4-5-extensions-framework.md (this record)
