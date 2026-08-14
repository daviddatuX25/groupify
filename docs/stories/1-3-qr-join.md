# Story 1.3: QR Join

Status: ready-for-dev

## Story

As a participant,
I want to join a session by scanning a QR code,
so that I don't have to type the session code manually.

## Acceptance Criteria

1. GIVEN the admin panel WHEN it renders THEN it displays a QR code encoding the join URL including the session code.
2. GIVEN a participant WHEN they scan the QR code THEN they land on the join screen with the code pre-filled.
3. GIVEN the join screen reached via QR WHEN the participant enters the PIN THEN joining proceeds exactly like a code+PIN join (PIN still required).

## Tasks / Subtasks

- [ ] Render the QR code on the admin panel (AC: 1)
  - [ ] `resources/js/components/QRCode.tsx` using a QR generation library (e.g. `qrcode` npm package)
  - [ ] Encode the join URL with the code: `<app-url>/join?code=XXXXXX` (FR-2.2, FR-1.5)
  - [ ] Place the QR on the admin panel page (`resources/js/pages/Admin/Show.tsx`) next to the code + PIN, always visible on the projector view
- [ ] Pre-fill the code on the join screen (AC: 2)
  - [ ] `resources/js/pages/Join.tsx` reads the `code` query param and pre-fills the code input on load
  - [ ] Keep the code pre-filled across validation errors (e.g. wrong PIN) so the participant only retries the PIN
- [ ] Verify PIN-gated QR join (AC: 3)
  - [ ] QR landing still requires the 4-digit PIN before identity entry — reuse the verify endpoint from story 1-2
  - [ ] After PIN + name/email, participant lands in the pool with a broadcast join event (AD-7)
- [ ] Manual verification pass (AC: 1, 2, 3)
  - [ ] Scan the admin-panel QR with a phone camera and confirm the code is pre-filled
  - [ ] Confirm wrong PIN shows the clear error and correct PIN proceeds to the identity step

## Dev Notes

- FR-2.2: join by scanning QR — join URL pre-fills the code; PIN still required (no bypass of the PIN gate).
- AD-3 Identity: QR join still creates the standard participant identity (token + name + optional email); session-scoped authorization unchanged.
- CAP-2 success path: first join takes ≤5 taps — QR removes code entry, leaving PIN + name as the only steps.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md (E1S3)]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-2 (Join & identity)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-3 (Identity — device token + session, no accounts)]
- [Source: docs/prds/prd-groupify/prd.md#F2 (Join & identity — FR-2.2)]

# Traceability

- FR: FR-2.2 | CAP: CAP-2 | AD: AD-3

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/1-3-qr-join.md
