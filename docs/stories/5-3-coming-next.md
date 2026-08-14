# Story 5.3: Coming-Next Section

Status: ready-for-dev

## Story

As a facilitator,
I want a "Coming next" section in the app that lists roadmap items (chat, approvals, proxy, quiz…) as links/notes only,
so that the product vision stays visible to users without any dead interactions.

## Acceptance Criteria

1. GIVEN the app WHEN the "Coming next" section is opened THEN it lists roadmap items (chat, approvals, proxy, quiz…) with short notes.
2. GIVEN any roadmap item WHEN rendered THEN it is informational only — links/notes — with no buttons or controls that pretend to work.
3. GIVEN the roadmap source WHEN it changes THEN the section reflects the current roadmap content from a single source of truth.

## Tasks / Subtasks

- [ ] Define the roadmap data source (AC: 3)
  - [ ] Read docs/specs/spec-groupify/roadmap.md and capture the preserved-vision items (chat, approvals, proxy, quiz…)
  - [ ] Expose the list as a single source of truth (config or shared Inertia data) reused by the UI
- [ ] Build the Coming-Next component (AC: 1, 2)
  - [ ] Render items as notes/links only — no dead buttons, no disabled-looking controls
  - [ ] Accessible list markup (semantic list, readable labels)
  - [ ] Place the section outside the live-formation flow (admin panel footer or dedicated page)
- [ ] Wire the section into the shell (AC: 1)
  - [ ] Add an entry point visible to facilitators (and participants where sensible)
  - [ ] Verify it never interrupts join or group flows

## Dev Notes

- FR-7.4: "Coming next" section in the app UI lists the roadmap (chat, approvals, proxy, quiz…) — keeps the vision visible to users. [Source: docs/prds/prd-groupify/prd.md#FR-7.4]
- The roadmap items are deferred capabilities — CAP-10 communication tiers (chat, announcements), CAP-11 proxy mode, CAP-12 group dynamics, and extension modules such as group quiz — informational only, no dead interactions. [Source: docs/specs/spec-groupify/SPEC.md#CAP-10]
- AD-9: extensions are session-toggled modules; the roadmap lists extension categories (Communication, Formation, Trust, Data, Event) — core grouping code is never mutated for them. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-9]
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#E5S3]
- [Source: docs/prds/prd-groupify/prd.md#FR-7.4]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-10]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-9]

# Traceability

- FR: FR-7.4 | CAP: CAP-8, CAP-10, CAP-11 | AD: AD-9

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/5-3-coming-next.md
