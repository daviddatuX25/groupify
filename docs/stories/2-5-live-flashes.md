# Story 2.5: Live Flashes + Presence

Status: ready-for-dev

## Story

As a participant,
I want live join/leave flashes and an online count,
so that I can see the board change as people move.

## Acceptance Criteria

1. GIVEN a member joining a group WHEN the join event arrives THEN the group card flashes green for ~1s.
2. GIVEN a member leaving a group WHEN the leave event arrives THEN the group card flashes red for ~1s.
3. GIVEN `prefers-reduced-motion` is set WHEN a flash would play THEN the animation is suppressed while the state change still renders.
4. GIVEN connected devices WHEN presence changes THEN the online count updates live.

## Tasks / Subtasks

- [ ] Derive flashes from events (AC: 1, 2)
  - [ ] In the board component, react to join events with a green flash and leave events with a red flash on the affected card, ~1s duration (FR-3.3)
  - [ ] Flashes are derived client-side from events per AD-6 — never stored or broadcast as state
  - [ ] Flash is paired with a non-color state change (count/slot update, icon) so the change is never color-only (NFR-3)
- [ ] Honor `prefers-reduced-motion` (AC: 3)
  - [ ] Check `window.matchMedia('(prefers-reduced-motion: reduce)')` and skip the flash animation when set; state change still renders (Kahoot pattern)
- [ ] Live online presence count (AC: 4)
  - [ ] Track presence on the `session:<code>` channel (Reverb presence members) and derive the online count
  - [ ] Show total connected (and pool count from story 2-1) on participant and admin screens (FR-3.5)
  - [ ] Count updates as devices connect/disconnect without reload
- [ ] Verify timing and accessibility (AC: 1, 2, 3, 4)
  - [ ] Two-device check: join/leave on one device shows the flash on the other within ~1s (NFR-1)
  - [ ] Reduced-motion emulation suppresses the animation but keeps the count/slot change visible

## Dev Notes

- FR-3.3: join/leave feedback — card flashes green on join, red on leave, ~1s (accessibility-safe: flash + count change, not color alone); FR-3.5: online presence — total connected + pool count visible on participant and admin screens.
- AD-6 Realtime: one presence channel carries grid/pool/presence/flashes; flashes are derived client-side from events and honor `prefers-reduced-motion`.
- NFR-3: WCAG 2.1 AA basics — non-color-only state changes, `prefers-reduced-motion` honored for flashes.
- CAP-3: any membership change visible on all connected devices within ~1s.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md (E2S5)]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-3 (Pool & live grid)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6 (Realtime — two channel classes, snapshot resync)]
- [Source: docs/prds/prd-groupify/prd.md#F3 (Pool & live board — FR-3.3, FR-3.5)]

# Traceability

- FR: FR-3.3, FR-3.5 | CAP: CAP-3 | AD: AD-6

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/2-5-live-flashes.md
