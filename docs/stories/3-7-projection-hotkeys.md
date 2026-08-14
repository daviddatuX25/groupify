# Story 3.7: Projection Hotkeys

Status: ready-for-dev

## Story

As a facilitator (session admin),
I want keyboard hotkeys on the projected live view,
so that I can toggle the join-info panel and hide/show the board without a mouse.

## Acceptance Criteria

1. GIVEN I am viewing the admin live view WHEN I press the join-info hotkey THEN the join-info panel (QR + PIN) toggles visible/hidden.
2. GIVEN I am viewing the admin live view WHEN I press the board hotkey THEN the board hides or shows.
3. GIVEN I toggle the panel or board visibility WHEN a session event arrives or I reconnect THEN the toggles are unaffected (hotkeys are local presentation state only; server state untouched).
4. GIVEN the admin view is open WHEN I press the hotkeys THEN they work without a mouse and do not fire while typing in an input.

## Tasks / Subtasks

- [ ] Hotkey handling (AC: 1, 2, 4)
  - [ ] Add a `useProjectionHotkeys` hook (`resources/js/hooks`) listening on the window (Mentimeter `i`/`h` pattern per FR-5.7); keys: toggle join-info panel, hide/show board.
  - [ ] Ignore hotkeys when focus is in a text input/textarea so typing is never hijacked.
- [ ] View-state wiring (AC: 1, 2, 3)
  - [ ] Keep panel/board visibility as local component state in the admin panel; no server round-trip, no broadcast — server state (AD-6 snapshot) is untouched.
  - [ ] Render the join-info panel and board from the existing snapshot; toggles only affect local rendering.
- [ ] Discoverability (AC: 4)
  - [ ] Show an on-screen hint listing the hotkeys on the projector view; keyboard-operable admin controls per NFR-3/E5S4.
- [ ] Reset behavior (AC: 3)
  - [ ] Default state on mount: panel visible, board visible; document that hotkey state is per-browser-session presentation only.

## Dev Notes

- AD-2: the admin live view is a React (Inertia) client island; hotkeys are client-side presentation toggles in the React layer.
- AD-6: hotkeys never mutate or re-render server state — session/admin channels and snapshot resync are unaffected.
- AD-5: hotkeys apply only to the admin live view; participant screens render no hotkey controls.
- FR-5.7: ADOPT Mentimeter `i`/`h` pattern — toggle join-info panel, hide/show board.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#epic-e3--admin-control-god-mode]
- [Source: docs/prds/prd-groupify/prd.md#f5--admin-control]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-5]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-2]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]

# Traceability

- FR: FR-5.7 | CAP: CAP-5 | AD: AD-2, AD-6

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/3-7-projection-hotkeys.md
