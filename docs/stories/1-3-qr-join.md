---
baseline_commit: a0a10c42eb969cb8d2bb5ba55ae0f723fe9dca72
---

# Story 1.3: QR Join

Status: review

## Story

As a facilitator,
I want a QR code on the admin panel that encodes the join URL,
so that participants scan and land on the join screen with the code pre-filled (PIN still typed).

## Acceptance Criteria

1. GIVEN the admin panel WHEN it renders THEN a QR encoding the join URL (`/join/{code}`) is displayed.
2. GIVEN a participant scans the QR WHEN the join page opens THEN the session code is pre-filled (it is the URL path).
3. GIVEN the pre-filled join page WHEN the participant submits THEN the PIN is still required.

## Tasks / Subtasks

- [x] QR rendering (AC: 1)
  - [x] `npm i qrcode` (+ `@types/qrcode` dev) — client-side QR, no server dependency
  - [x] `Admin/Show.tsx`: canvas QR from `${origin}/join/{code}` (dark modules on white), join URL caption shown
- [x] Prefill + PIN (AC: 2, 3)
  - [x] Join URL carries the code in the path — `Session/Join` renders it (existing behavior, verified)
  - [x] PIN still validated server-side (existing 1-2 flow; no change)

## Dev Notes

- FR-2.2: QR encodes join URL with code; PIN remains a typed secret — never embedded in the QR. [Source: docs/prds/prd-groupify/prd.md#FR-2.2]
- Client-side QR (qrcode npm) keeps the backend dependency-free; the canvas renders in SSR guard (`typeof window`).
- No backend change → no new Pest tests; verification is browser-level (canvas pixel check + join page assertions).

### Project Structure Notes

- Admin/Show.tsx now carries the QR card; stats/controls arrive in story 3-1.

### References

- [Source: docs/planning/epics-groupify.md#E1S3]
- [Source: docs/prds/prd-groupify/prd.md#FR-2.2]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-2]

# Traceability

- FR: FR-2.2 | CAP: CAP-2 | AD: AD-3

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None — first-pass green; build ✓; browser verification script confirmed canvas content

### Completion Notes List

- All 3 ACs verified in a real Chromium: admin panel renders a non-blank QR canvas (45,000 non-white pixels), join URL caption shown, PIN + name fields present; scanning target `/join/805031` shows the code pre-filled with PIN entry intact.
- Gates: `npm run build` ✓ (browser + tests untouched otherwise).

### File List

- resources/js/pages/Admin/Show.tsx
- package.json / package-lock.json (qrcode, @types/qrcode)
- docs/stories/1-3-qr-join.md (this record)
