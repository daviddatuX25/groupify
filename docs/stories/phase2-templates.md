---
baseline_commit: da04928b7d48efdb360851ecad38a8391c925308
phase: 2
---

# Phase 2 · Story F: Session Templates

Status: review

## Story

As a facilitator,
I want to save a session's configuration and replay it,
so that recurring classes start from a known setup.

## Acceptance Criteria

1. GIVEN an admin WHEN they save the current session config THEN a named template is stored (upsert by name).
2. GIVEN a template WHEN applied to a session THEN the config is replaced and the change broadcasts.
3. GIVEN a template id WHEN creating a session THEN the new session seeds from it.

## Tasks / Subtasks

- [x] `session_templates` table + `SessionTemplate` model (config cast)
- [x] `AdminTemplateController` — store (upsert), index, apply (+ broadcast SessionConfigUpdated)
- [x] `SessionController@store` accepts optional `template_id` → seeds config
- [x] Admin UI: template-name input + save; templates list with apply
- [x] 5 Pest tests (save, list, apply+broadcast, create-from-template, token auth)

## Dev Notes

- Roadmap "Session config templates" (Wordwall/Mentimeter pattern). [Source: docs/specs/spec-groupify/roadmap.md]
- Templates are server-global (single-operator home server); dedupe by name.

### References

- [Source: research/interface-research.md (templates)]

# Traceability

- FR: — (roadmap) | CAP: CAP-7 | AD: AD-4

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Pint import ordering in routes/web.php (auto-fixed)

### Completion Notes List

- 5 tests green (119 total, 444 assertions); e2e 6/6; live-verified: save → list → create-from-template.

### File List

- database/migrations/…000008_create_session_templates_table.php
- app/Models/SessionTemplate.php, app/Http/Controllers/Admin/AdminTemplateController.php
- app/Http/Controllers/SessionController.php, routes/web.php
- resources/js/pages/Admin/Show.tsx
- tests/Feature/SessionTemplateTest.php (5 tests)
- docs/stories/phase2-templates.md (this record)
