# Story 1.2: Join by Code + PIN

Status: ready-for-dev

## Story

As a participant,
I want to join a session by entering the code and PIN,
so that I can get into the session with my name and participate.

## Acceptance Criteria

1. GIVEN a participant on the join screen WHEN they enter a valid session code and the correct 4-digit PIN THEN they are prompted for a display name (required) and email (optional).
2. GIVEN a participant WHEN they enter a wrong PIN THEN a clear error is shown and they are not locked out.
3. GIVEN a participant WHEN they enter an unknown code THEN a clear error is shown.

## Tasks / Subtasks

- [ ] Create the join screen page (AC: 1)
  - [ ] `resources/js/pages/Join.tsx` with code + PIN inputs; accessible labels and mobile-first layout (360px usable)
  - [ ] Submit code+PIN to the verify endpoint; prefill code from the `?code=` query param when present
- [ ] Implement the code+PIN verify endpoint (AC: 2, 3)
  - [ ] `POST /sessions/{code}/verify` in app/Http/Controllers; unknown code returns a clear "session not found" error (AC: 3)
  - [ ] Wrong PIN returns a clear error; no lockout — repeated wrong attempts never block the session or device (FR-2.1, AC: 2)
  - [ ] PIN = 4 digits, admin-set with random default (PRD assumption); compare stored `pin` on the session row
- [ ] Implement the identity step (AC: 1)
  - [ ] After successful verify, show name (required) + email (optional, for CSV) form
  - [ ] `POST /sessions/{code}/join` creates the participant row: participant_token (UUID in localStorage) + name + optional email (AD-3)
  - [ ] Enforce one participant row per (session, device token); join re-checks join mode before committing (AD-7)
  - [ ] On success, broadcast a join event on the `session:<code>` presence channel and land the participant in the pool
- [ ] Wire the join flow into the session snapshot render (AC: 1)
  - [ ] After joining, render from the session snapshot (pool + board) via Inertia shared props or snapshot endpoint
  - [ ] Show validation errors inline on the join form without losing the entered code

## Dev Notes

- AD-3 Identity: participant identity = participant_token (UUID in localStorage) + display name + optional email; no users table; every session-scoped request is authorized by the participant token.
- AD-7 Membership model: one participant row per (session, device token); join is a single transaction that re-checks join mode before committing.
- FR-2.1 assumption: PIN = 4 digits, admin-set, default random; wrong PIN → clear error, no lockout.
- FR-2.3: display name required, email optional (for CSV).
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md (E1S2)]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-2 (Join & identity)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-3 (Identity — device token + session, no accounts)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7 (Membership model — seats)]
- [Source: docs/prds/prd-groupify/prd.md#F2 (Join & identity — FR-2.1, FR-2.3)]

# Traceability

- FR: FR-2.1, FR-2.3 | CAP: CAP-2 | AD: AD-3, AD-7

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/1-2-join-code-pin.md
