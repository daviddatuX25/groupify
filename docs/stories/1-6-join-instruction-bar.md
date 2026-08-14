# Story 1.6: Join-Instruction Bar

Status: ready-for-dev

## Story

As a participant,
I want the session code and join hint always visible,
so that latecomers and lost tabs can recover without asking the facilitator.

## Acceptance Criteria

1. GIVEN any participant screen WHEN it renders THEN a persistent bar shows the session code and the "enter PIN" join hint.
2. GIVEN the join-instruction bar WHEN the participant navigates between pool, board, and group screens THEN the bar stays visible.

## Tasks / Subtasks

- [ ] Build the join-instruction bar component (AC: 1)
  - [ ] `resources/js/components/JoinInstructionBar.tsx` showing the session code and an "enter PIN" hint (FR-1.6, ADOPT AhaSlides)
  - [ ] Render code + hint from the session snapshot so it always matches server state (AD-6)
  - [ ] Make the code text large and tappable (copyable) for projector readability and phone recovery
- [ ] Pin the bar on every participant screen (AC: 1, 2)
  - [ ] Include the bar in the shared participant layout so pool, board, and group screens all render it (AC: 2)
  - [ ] Ensure it persists across Inertia navigations (no per-page duplication)
- [ ] Verify persistence (AC: 1, 2)
  - [ ] Walk pool → board → group screens and confirm the bar never disappears
  - [ ] Confirm the hint reads clearly (code + "enter PIN") on a 360px viewport and on the projector view

## Dev Notes

- FR-1.6: join-instruction bar pinned on every participant screen (code + join hint) so latecomers and lost tabs recover without asking — ADOPT from AhaSlides.
- AD-6 Realtime: participant screens render from the session snapshot; the bar is part of that server-derived render, so it cannot drift from the real code.
- CAP-2 join surface: the bar complements the join flows from stories 1-2/1-3 (code + PIN always recoverable).
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md (E1S6)]
- [Source: docs/prds/prd-groupify/prd.md#F1 (Session management — FR-1.6)]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-2 (Join & identity)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6 (Realtime — two channel classes, snapshot resync)]

# Traceability

- FR: FR-1.6 | CAP: CAP-2 | AD: AD-6

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/1-6-join-instruction-bar.md
