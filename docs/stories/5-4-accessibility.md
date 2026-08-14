# Story 5.4: Accessibility Pass

Status: ready-for-dev

## Story

As a facilitator who uses only a keyboard and a participant who prefers reduced motion,
I want WCAG 2.1 AA basics across the app — keyboard-operable admin controls, non-color-only state changes, reduced-motion honored, and readable contrast on projection,
so that everyone can use Groupify regardless of input method or motion preference.

## Acceptance Criteria

1. GIVEN the admin panel WHEN I operate it with the keyboard only THEN every control (force-move, dissolve, freeze, export, hotkeys) is reachable, operable, and shows a visible focus indicator.
2. GIVEN any state change (join/leave flash, FULL group, online count) WHEN it is displayed THEN it is conveyed by more than color alone (icon/label/count change).
3. GIVEN a user with prefers-reduced-motion WHEN join/leave flashes or other animations would play THEN animations are reduced or disabled while the state change stays visible.
4. GIVEN the app WHEN rendered at projector sizes THEN text and UI contrast meets WCAG 2.1 AA (≥4.5:1 normal text, ≥3:1 large text/UI).

## Tasks / Subtasks

- [ ] Keyboard audit + focus pass (AC: 1)
  - [ ] Tab through every admin control; fix order and visible focus rings
  - [ ] Provide a non-drag alternative for force-move (picker per FR-5.2) and keyboard-accessible hotkeys (FR-5.7)
  - [ ] Verify no keyboard traps in modals/dialogs
- [ ] Non-color state changes (AC: 2)
  - [ ] Join/leave flashes add an icon + count/label change, not color alone (FR-3.3)
  - [ ] FULL/join states rendered with text, not only color
  - [ ] Online/pool stats shown as numeric labels with context
- [ ] Reduced-motion support (AC: 3)
  - [ ] Gate flash animations on prefers-reduced-motion (AD-6); the state change stays visible
  - [ ] Check banner transitions and any other animation under reduced motion
- [ ] Projection contrast audit (AC: 4)
  - [ ] Audit theme tokens against WCAG 2.1 AA on projected surfaces
  - [ ] Fix low-contrast text/borders; re-verify at large type sizes

## Dev Notes

- NFR-3: WCAG 2.1 AA basics — keyboard-operable admin controls, non-color-only state changes, readable contrast on projection, prefers-reduced-motion honored for join/leave flashes (Kahoot pattern). [Source: docs/prds/prd-groupify/prd.md#NFR-3]
- AD-6: flashes are derived client-side from events and honor prefers-reduced-motion. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]
- FR-3.3: flash + count change, not color alone. [Source: docs/prds/prd-groupify/prd.md#FR-3.3]
- AD-5: UI affordances render only from the server-computed allowed-action set — accessible controls are visible, focusable actions, never dead buttons. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-5]
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#E5S4]
- [Source: docs/prds/prd-groupify/prd.md#NFR-3]
- [Source: docs/prds/prd-groupify/prd.md#FR-3.3]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]

# Traceability

- FR: NFR-3 | CAP: — | AD: AD-5, AD-6

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/5-4-accessibility.md
