---
baseline_commit: c1894c3238516211e1e2e9bd70748347b541cbf4
---

# Story 3.5: CSV Export

Status: review

## Story

As a facilitator,
I want a CSV export of the final roster,
so that I can take attendance and rosters into other tools.

## Acceptance Criteria

1. GIVEN the admin WHEN they request the export THEN a CSV streams with group / name / email and every configured field as a column.
2. GIVEN pooled participants WHEN exported THEN their group is "(pool)" and field cells are empty.

## Tasks / Subtasks

- [x] `AdminExportController@csv` — token auth; streams CSV (`groupify-{code}.csv`); dynamic field columns from config (AD-8); pooled rows as `(pool)`
- [x] Route `GET /admin/sessions/{session}/export` (admin.export)
- [x] 2 Pest tests (full export with field column; token rejection)

## Dev Notes

- AD-8: CSV columns are config-driven — no schema changes per field. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-8]
- fputcsv quotes fields containing spaces/commas — tests match the quoting.

### References

- [Source: docs/planning/epics-groupify.md#E3S5]
- [Source: docs/prds/prd-groupify/prd.md#FR-5.5]

# Traceability

- FR: FR-5.5 | CAP: CAP-5 | AD: AD-8

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- phpstan: fopen resource|false, nullsafe-on-null, offset-on-string — explicit null handling + @var annotations

### Completion Notes List

- 2 tests green; gates green (71 tests, 281 assertions).

### File List

- app/Http/Controllers/Admin/AdminExportController.php
- routes/web.php
- tests/Feature/ExportCsvTest.php (2 tests)
- docs/stories/3-5-csv-export.md (this record)

---

# Story 3.7: Projection Hotkeys

Status: review

## Story

As a facilitator projecting the admin panel,
I want keyboard shortcuts,
so that I can control what the room sees without hunting for buttons.

## Acceptance Criteria

1. GIVEN the admin panel WHEN 'h' is pressed THEN the board sections hide (join info stays).
2. GIVEN the admin panel WHEN 'i' is pressed THEN the join info (QR/code) toggles.

## Tasks / Subtasks

- [x] `keydown` handler: `i` toggles join-info section, `h` toggles board sections (groups + pool)
- [x] Sections wrapped in fragments with the toggle state

## Dev Notes

- ADOPT Mentimeter presenter-hotkey pattern (research/interface-research.md). [Source: research/interface-research.md]
- FR-5.7.

### References

- [Source: docs/prds/prd-groupify/prd.md#FR-5.7]
- [Source: research/interface-research.md]

# Traceability

- FR: FR-5.7 | CAP: CAP-5 | AD: —

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- JSX: comment inside an expression + adjacent siblings → needed fragment wrapping

### Completion Notes List

- Browser-verified: 'h' hides board (join info stays), 'i' hides join info.

### File List

- resources/js/pages/Admin/Show.tsx
- docs/stories/3-7-projection-hotkeys.md (this record)
