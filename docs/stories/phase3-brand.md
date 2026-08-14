---
baseline_commit: c12232a6fc94eb4564e842d1e12ca9e5ae583e3e
phase: 3
---

# Phase 3 · Story B: Brand Polish — Kinetic Logo

Status: review

## Story

As Groupify,
I want a distinctive Kinetic mark everywhere,
so that the product reads as designed, not defaulted.

## Acceptance Criteria

1. GIVEN any surface WHEN it shows the brand THEN it uses the Kinetic mark (three nodes on an orbit, primary #4edea3).
2. GIVEN the landing page WHEN loaded THEN it presents the product, not the framework.
3. GIVEN install flows THEN icons and favicons carry the mark.

## Tasks / Subtasks

- [x] `public/logo.svg` + favicon.svg — Kinetic mark (orbit ring, three phased nodes)
- [x] PWA icons (192/512, maskable tile) + apple-touch-icon regenerated from the mark
- [x] `Logo` component (inline SVG, no extra request) in the Session and Admin headers
- [x] Landing page rebuilt: mark, tagline, Start-a-session CTA, dark Kinetic shell (replaces the stock Laravel welcome)
- [x] Gates: 168 Pest / 593 assertions, build, e2e 7/7 (landing renders, SW still activates)

## Dev Notes

- Brand system: docs/brand/brand-context.md (Kinetic, dark-only, primary #4edea3). Mark concept: three nodes at 120° on an orbit — motion + formation, matching the product.

### References

- [Source: docs/brand/brand-context.md]

# Traceability

- FR: — (brand) | CAP: — | AD: —

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- The home route served the stock Laravel welcome page (framework slop) — replaced with the product landing

### Completion Notes List

- All gates green; landing + favicon verified live; e2e 7/7.

### File List

- public/logo.svg (new), public/favicon.svg, public/icons/icon-{192,512}.png, public/apple-touch-icon.png
- resources/js/components/Logo.tsx (new)
- resources/js/pages/welcome.tsx, Session/Show.tsx, Admin/Show.tsx
- docs/stories/phase3-brand.md (this record)
