# Story 1.4: Auto-Rejoin by Device Token

Status: ready-for-dev

## Story

As a participant,
I want my device to remember my seat,
so that returning to a session skips name entry and puts me back in my exact seat.

## Acceptance Criteria

1. GIVEN a returning device with a stored participant token WHEN it opens the join URL or reconnects THEN name entry is skipped and the participant lands in its exact seat (same group or pool).
2. GIVEN a device that already holds a seat in a session WHEN a second device joins the same session THEN the second device is a separate seat (one seat per device per session).

## Tasks / Subtasks

- [ ] Persist the participant token (AC: 1)
  - [ ] On first join (story 1-2), generate a participant_token UUID and store it in localStorage under a stable key
  - [ ] Send the token with every session-scoped request (header/param) for authorization (AD-3)
- [ ] Auto-rejoin on load (AC: 1)
  - [ ] Join/landing route checks for a stored token; look up a participant row for (session_id, token) (AD-7)
  - [ ] If found, skip the name/email step and render the participant's seat directly from the session snapshot
  - [ ] If not found, show the normal code + PIN + name flow
- [ ] Enforce one seat per device per session (AC: 2)
  - [ ] Participant row keyed by (session_id, token); a second device generates its own token → its own row → its own seat even with the same display name (FR-2.5)
  - [ ] No seat reuse across devices — the stored token is the only thing that maps a device to a seat (AD-3)
- [ ] Verify auto-rejoin behavior (AC: 1, 2)
  - [ ] Reopen the join URL on the same device (and after a full page reload) → exact seat restored, no name prompt
  - [ ] Join from a second device with the same name → second seat appears, distinct from the first

## Dev Notes

- AD-3 Identity: participant identity = participant_token (UUID in localStorage) + display name + optional email; tokens are bearer; identity is per device, not per name.
- AD-7 Membership model: one participant row per (session, device token) — this row IS the seat; memberships are rows (participant, group, role, status).
- CAP-2 success: same device rejoins into its existing seat without re-entering identity; FR-2.5 = one seat per device per session.
- The only client-persisted state is the device token and a cached render (AD-1) — auto-rejoin reads the server snapshot, never client-side seat state.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md (E1S4)]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-2 (Join & identity)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-3 (Identity — device token + session, no accounts)]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7 (Membership model — seats)]
- [Source: docs/prds/prd-groupify/prd.md#F2 (Join & identity — FR-2.4, FR-2.5)]

# Traceability

- FR: FR-2.4, FR-2.5 | CAP: CAP-2 | AD: AD-3, AD-7

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/1-4-auto-rejoin.md
