---
baseline_commit: c1894c3238516211e1e2e9bd70748347b541cbf4
---

# Story 3.4: Freeze/Unfreeze

Status: review

## Story

As a facilitator,
I want to freeze and unfreeze grouping from the live panel,
so that I can lock the board during announcements.

## Acceptance Criteria

1. GIVEN a live session WHEN the facilitator clicks Freeze THEN grouping locks (joins blocked) and the panel shows FROZEN.
2. GIVEN a frozen session WHEN the facilitator clicks Unfreeze THEN grouping resumes.

## Tasks / Subtasks

- [x] Backend freeze/unfreeze — landed in story 1-5 (PATCH state, config rules.freeze, broadcast)
- [x] Admin UI button (Freeze/Unfreeze toggle) — landed in story 3-1 slice; browser-verified: click Freeze → FROZEN label + join blocked (curl 404); click Unfreeze → resumed

## Dev Notes

- FR-1.3: frozen = no join/leave/swap; admin exempt (admin actions skip the freeze check).

### References

- [Source: docs/prds/prd-groupify/prd.md#FR-1.3]

# Traceability

- FR: FR-1.3, FR-5.4 | CAP: CAP-5 | AD: AD-4, AD-7

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None

### Completion Notes List

- Verified live: button-driven freeze → FROZEN → curl join 404 → unfreeze → resumed.

### File List

- (no new files — UI in Admin/Show.tsx from 3-1; backend from 1-5)
