---
baseline_commit: 17d7f54534d508d8999b729d8325444e33e3a23e
---

# Story 5.1: Server-Status UX

Status: review

## Story

As a participant on a flaky home server,
I want an explicit offline banner,
so that the app never appears silently broken.

## Acceptance Criteria

1. GIVEN the WebSocket connection WHEN it drops THEN a banner shows "Server offline — you're in a safe spot, reconnecting…" within ~5s.
2. GIVEN the connection WHEN healthy THEN no banner renders.
3. GIVEN the /health heartbeat WHEN it fails THEN the banner appears even if the WS state is ambiguous.

## Tasks / Subtasks

- [x] `GET /health` heartbeat endpoint (+ test)
- [x] `ServerStatus` component: `useConnectionStatus` (online/reconnecting/offline) + 10s /health poll; renders only when degraded; role=status
- [x] Integrated on participant + admin pages (top banner)

## Dev Notes

- AD-11: every UI state labeled; no unbounded spinners. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-11]
- Offline-banner render path verified by logic + healthy-path browser check; a live WS-drop simulation is deferred to the E6S4 failure drill.

### References

- [Source: docs/planning/epics-groupify.md#E5S1]
- [Source: docs/prds/prd-groupify/prd.md#FR-8.1]

# Traceability

- FR: FR-8.1, FR-8.2 | CAP: CAP-9 | AD: AD-11

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None

### Completion Notes List

- Health endpoint tested (1 test); healthy path verified in Chromium (no false banner, Inter font + brand bg loaded).

### File List

- routes/web.php (/health)
- resources/js/components/ServerStatus.tsx
- resources/js/pages/Session/Show.tsx, Admin/Show.tsx
- tests/Feature/HealthTest.php
- docs/stories/5-1-server-status.md (this record)

---

# Story 5.2: Mobile-First Shell (Kinetic theme)

Status: review

## Story

As a participant on a phone,
I want the Groupify "Kinetic" look,
so that the app feels like the brand from day one.

## Acceptance Criteria

1. GIVEN the app shell WHEN rendered THEN it uses the Kinetic dark palette and brand fonts.
2. GIVEN the theme tokens WHEN applied THEN they match docs/brand/brand-context.md (primary #4edea3, cyan, pink, surfaces, Inter/Plus Jakarta Sans/JetBrains Mono).

## Tasks / Subtasks

- [x] `resources/css/app.css` @theme: brand fonts (Inter, Plus Jakarta Sans, JetBrains Mono via bunny) + Kinetic color tokens + radii + dark body
- [x] Global `prefers-reduced-motion` reduction in CSS (5-4 overlap)
- [x] Shell verified in Chromium: Inter loaded, body bg #0e1511

## Dev Notes

- Binding UI contract: docs/brand/brand-context.md (dark-only, tokens verbatim). [Source: docs/brand/brand-context.md]
- Component-level polish (buttons/cards to exact token utilities) deferred to the user's polish pass — shell + tokens ready.

### References

- [Source: docs/planning/epics-groupify.md#E5S2]
- [Source: docs/brand/brand-context.md]

# Traceability

- FR: NFR-2 | CAP: CAP-9 | AD: AD-2

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None

### Completion Notes List

- Theme verified in Chromium: Inter loaded, bg rgb(14,21,17) = #0e1511.

### File List

- resources/css/app.css
- docs/stories/5-2-mobile-shell.md (this record)

---

# Story 5.3: Coming-Next Section

Status: review

## Story

As a user,
I want to see what is coming to Groupify,
so that the roadmap is visible in the product.

## Acceptance Criteria

1. GIVEN any session page WHEN rendered THEN a "Coming next" section lists the roadmap items.

## Tasks / Subtasks

- [x] `ComingNext` component (chat, approvals, proxy, auto-dissolve, match-me, device binding, quiz, guest lists)
- [x] Rendered on participant + admin pages

## Dev Notes

- FR-7.4. Keeps the preserved vision visible.

### References

- [Source: docs/prds/prd-groupify/prd.md#FR-7.4]

# Traceability

- FR: FR-7.4 | CAP: CAP-8 | AD: AD-9

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None

### Completion Notes List

- Browser-verified: section + all roadmap items render.

### File List

- resources/js/components/ComingNext.tsx
- resources/js/pages/Session/Show.tsx, Admin/Show.tsx
- docs/stories/5-3-coming-next.md (this record)

---

# Story 5.4: Accessibility Pass

Status: review

## Story

As a user with accessibility needs,
I want the app to honor reduced motion and non-color states,
so that the live board is usable by everyone.

## Acceptance Criteria

1. GIVEN `prefers-reduced-motion` WHEN membership changes THEN the flash animation is skipped (state still updates).
2. GIVEN full/empty group states WHEN rendered THEN they carry text, not color alone.

## Tasks / Subtasks

- [x] Flash guard: `matchMedia('(prefers-reduced-motion: reduce)')` skips the flash styling (board still refetches)
- [x] Global CSS `prefers-reduced-motion` reduction
- [x] Non-color states already text-backed (FULL / "N open" / lead label); banner uses role=status

## Dev Notes

- NFR-3: reduced motion + non-color-only state changes. [Source: docs/prds/prd-groupify/prd.md#NFR-3]
- Keyboard-operable admin controls are native buttons/selects.

### References

- [Source: docs/planning/epics-groupify.md#E5S4]

# Traceability

- FR: NFR-3 | CAP: — | AD: AD-6

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None

### Completion Notes List

- Reduced-motion guard + global CSS reduction in place; states are text-backed.

### File List

- resources/js/pages/Session/Show.tsx (flash guard)
- resources/css/app.css (global reduction)
- docs/stories/5-4-accessibility.md (this record)
