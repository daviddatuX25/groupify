---
baseline_commit: 0ca0339826e1e03c1068d1ae054e2d5d1b72e4ec
---

# Story 1.6: Join-Instruction Bar

Status: review

## Story

As a latecomer,
I want a persistent bar showing how to join,
so that I never have to ask the host for the code.

## Acceptance Criteria

1. GIVEN any participant screen WHEN rendered THEN a pinned bar shows the join URL and session code.
2. GIVEN the bar WHEN clicked/copied THEN the join flow works as normal (PIN still required).

## Tasks / Subtasks

- [x] Pinned join bar (AC: 1)
  - [x] `Session/Show.tsx`: pinned top bar — "Joining late? Open {origin}/join/{code} and enter the PIN from your host" (AhaSlides pattern, FR-1.6)
  - [x] Renders on the participant session page (SSR-safe: window guarded)
- [x] Join flow intact (AC: 2)
  - [x] URL targets the existing join route (1-2) — PIN validation untouched

## Dev Notes

- ADOPT from AhaSlides join-instruction bar (research/interface-research.md). [Source: research/interface-research.md]
- FR-1.6. No backend change; verification is browser-level.

### Project Structure Notes

- Session/Show.tsx layout now: pinned bar → header → content.

### References

- [Source: docs/prds/prd-groupify/prd.md#FR-1.6]
- [Source: research/interface-research.md]

# Traceability

- FR: FR-1.6 | CAP: CAP-2 | AD: —

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None

### Completion Notes List

- Verified in Chromium on a live session: bar text, join URL, and code all render.
- Gates green: 44 tests (171 assertions), pint + phpstan + build ✓.

### File List

- resources/js/pages/Session/Show.tsx
- docs/stories/1-6-join-instruction-bar.md (this record)
