---
baseline_commit: a2eb60d294375900a87cb1413ab5302c9eed077a
phase: 2
---

# Phase 2 · Story N: Progressive Web App

Status: review

## Story

As a participant,
I want to install Groupify on my device and keep the app usable offline,
so that the session board survives flaky venues.

## Acceptance Criteria

1. GIVEN the web app WHEN viewed in a modern browser THEN it exposes install metadata (manifest, theme, icons) and a service worker.
2. GIVEN the service worker WHEN activated THEN the offline shell (app + icons) is precached and API reads fall back to the last snapshot.
3. GIVEN the prod stack THEN the manifest is served with the correct media type and the SW registers and activates.

## Tasks / Subtasks

- [x] `public/manifest.webmanifest` (standalone, dark theme, 192/512 icons incl. maskable)
- [x] Icons generated (Kinetic tile, primary #4edea3)
- [x] `public/sw.js` — versioned precache of the shell; network-first API GETs with cache fallback; cache-first static assets; skipWaiting + clientsClaim
- [x] Registration from the app entry (production only, non-blocking)
- [x] Manifest link + theme-color in the app shell head
- [x] nginx mime types (`application/manifest+json`) so installability works behind the prod stack
- [x] 4 Pest tests (manifest metadata, SW shell contents, icons on disk, shell link) + 1 e2e (SW registers and reaches `activated`)

## Dev Notes

- CAP-12 installability + offline resilience. SW is hand-rolled (no build dependency); the app shell is tiny, so versioned precache is trivial to maintain. [Source: docs/specs/spec-groupify/SPEC.md#CAP-12]

### References

- [Source: docs/specs/spec-groupify/roadmap.md (phase 2 — PWA)]

# Traceability

- FR: — (CAP-12) | CAP: CAP-12 | AD: AD-1

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Python batch-edit no-op'd twice on drifted anchors (blade @vite line gained a dynamic pages entry; nginx had no mime.types include) — both applied via the Edit tool
- Static public files 404 through the test kernel (nginx serves them in prod) → tests assert file existence + shell link, and live curl + e2e verify actual serving
- nginx defaults `webmanifest` to `application/octet-stream` → explicit types block (server-level, no mime.types include needed)

### Completion Notes List

- 4 tests green (162 total, 578 assertions); e2e 7/7 (SW activated in a real Chromium); prod-verified manifest/sw/icons with correct content types.

### File List

- public/manifest.webmanifest, public/sw.js, public/icons/icon-{192,512}.png
- resources/views/app.blade.php, resources/js/app.tsx
- docker/prod/nginx.conf
- tests/Feature/PwaTest.php (4 tests), tests/e2e/sw-check.spec.ts
- docs/stories/phase2-pwa.md (this record)
