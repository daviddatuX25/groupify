# Story 5.2: Mobile-First Shell

Status: ready-for-dev

## Story

As a participant on a small phone and a facilitator projecting on a big screen,
I want a mobile-first app shell built on the shadcn/ui theme with lucide icons — fully usable at 360px width and legible as large-type admin views,
so that everyone can use the app on any phone without install and the facilitator can read the live board from across the room.

## Acceptance Criteria

1. GIVEN a participant on a 360px-wide viewport WHEN they walk the join → pool → create/join group → board flows THEN every flow is fully usable with no horizontal scrolling or cut-off controls.
2. GIVEN the app shell WHEN rendered THEN it consistently uses the shadcn/ui theme (Tailwind v4 tokens) and lucide-react icons on participant and admin surfaces.
3. GIVEN the admin live view WHEN displayed at projector sizes THEN text is large-type and high-contrast, readable from a distance.
4. GIVEN the server-status banner WHEN the connection degrades on a 360px viewport THEN the banner remains readable and does not break the layout.

## Tasks / Subtasks

- [ ] Initialize the design system shell (AC: 2)
  - [ ] Set up shadcn/ui (Tailwind v4 compatible) with CSS-variable theme tokens
  - [ ] Add lucide-react and an icon usage convention
  - [ ] Define the type/spacing scale shared by participant and admin surfaces
- [ ] Build the responsive layout shell (AC: 1)
  - [ ] Shared shell: header (session code), join-instruction bar slot, main content
  - [ ] Mobile-first breakpoints; verify no horizontal overflow at 360px
  - [ ] Verify create/join-group form and board card interactions fit at 360px
- [ ] Projector / large-type admin styles (AC: 3)
  - [ ] Admin live view type scale and density tuned for big screens
  - [ ] High-contrast tokens on projected surfaces (pair with story 5-4)
- [ ] Status-banner responsiveness (AC: 4)
  - [ ] Offline/reconnecting banner readable and layout-safe at 360px
  - [ ] Multi-viewport pass (360px phone, tablet, projector) over the key flows

## Dev Notes

- Binding UI contract: docs/brand/brand-context.md — "Kinetic" dark design system (color tokens, type scale, motion, component inventory, dark-only, mono uppercase labels, glass surfaces). Theme shadcn/ui CSS variables to these hex values; never defaults. [Source: docs/brand/brand-context.md]
- NFR-2: participant flows fully usable on small phones, no install; admin flows usable on projector-sized screens (large type, high contrast). [Source: docs/prds/prd-groupify/prd.md#NFR-2]
- AD-2: one Laravel app serves Inertia pages; Vite builds the React client; Tailwind CSS ^4, shadcn/ui (Tailwind v4 compatible), lucide-react per the Stack. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-2]
- AD-11: the server-status banner must stay visible and labeled on every viewport — no silent failure on mobile either. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-11]
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#E5S2]
- [Source: docs/prds/prd-groupify/prd.md#NFR-2]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-9]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-2]

# Traceability

- FR: NFR-2 | CAP: CAP-9 | AD: AD-2, AD-11

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/5-2-mobile-shell.md
