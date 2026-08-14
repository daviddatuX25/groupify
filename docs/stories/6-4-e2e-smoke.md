# Story 6.4: End-to-End Smoke

Status: ready-for-dev

## Story

As a developer/operator,
I want an end-to-end smoke that replicates the SPEC success signal — create session, 20+ joins by QR/PIN, groups with required "Chosen topic", CSV export, live updates ≤1s, offline banner + resync,
so that night-one is provably working end-to-end on groupify.dxtechph.online.

## Acceptance Criteria

1. GIVEN a facilitator WHEN they create a session THEN they get a 6-digit code + 4-digit PIN + QR and land in the admin panel.
2. GIVEN the join info WHEN 20+ participants join by QR or code+PIN THEN they land in the pool and every connected screen reflects the change within ~1s.
3. GIVEN groups forming with a required "Chosen topic" field WHEN the field is left empty on create THEN submission is blocked; when filled, the topic shows on the board card.
4. GIVEN formed groups WHEN the facilitator exports CSV THEN the export includes group, member name, email, and every configured field column, with optional blanks omitted.
5. GIVEN a running session WHEN the server is killed THEN every client shows the offline banner within ~5s; after recovery, clients resync from the full snapshot with no stale cards or duplicate seats.
6. GIVEN live membership changes WHEN they occur THEN all connected devices see them within ~1s.

## Tasks / Subtasks

- [ ] Smoke runbook (AC: 1, 2)
  - [ ] Script the flow: create session → capture code/PIN → open the QR on the projector view
  - [ ] Join with 20+ simulated devices (incognito tabs or browser automation) by QR and code+PIN
  - [ ] Verify pool counts and presence propagate within ~1s on all screens
- [ ] Group formation + Chosen topic drill (AC: 3)
  - [ ] Create groups with the required "Chosen topic" field; verify required blocks empty submit
  - [ ] Verify the topic renders on board cards and is searchable
- [ ] CSV export check (AC: 4)
  - [ ] Export after groups form; verify group/name/email/field columns and omitted optional blanks
  - [ ] Repeat the export on an archived session (works per FR-5.5)
- [ ] Failure drill (AC: 5)
  - [ ] Kill the server/worker → observe the offline banner within ~5s on clients
  - [ ] Restart → verify snapshot resync (AD-6): no stale cards, no duplicate seats
- [ ] Realtime timing check (AC: 6)
  - [ ] Measure join → visible change on a second device ≤1s
  - [ ] Record results in the smoke log

## Dev Notes

- SPEC success signal: "a facilitator creates a session; 20+ classmates join by QR/PIN on phones; groups form with a required 'Chosen topic' field; facilitator exports CSV (group / name / topic) — end-to-end on groupify.dxtechph.online, live updates within ~1s, no crashes." [Source: docs/specs/spec-groupify/SPEC.md#Success-signal]
- AD-6: reconnect always ends in a full snapshot resync — no stale cards, no duplicate seats. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]
- AD-11: offline banner within ~5s; /health heartbeat fallback. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-11]
- AD-8: CSV export builds columns dynamically from config; optional blanks omitted. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-8]
- AD-10: the smoke runs on the one-box envelope (SQLite, database queue + one worker, Reverb same box). [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-10]
- NFR-1: membership/presence changes propagate within ~1s (target 200 concurrent). [Source: docs/prds/prd-groupify/prd.md#NFR-1]
- E6S4 is a smoke/runbook, not a unit test suite — evidence is the executed drill log.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#E6S4]
- [Source: docs/specs/spec-groupify/SPEC.md#Success-signal]
- [Source: docs/prds/prd-groupify/prd.md#FR-5.5]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]

# Traceability

- FR: FR-5.5, FR-8.1, FR-8.3 | CAP: CAP-1, CAP-2, CAP-3, CAP-4, CAP-6, CAP-9 | AD: AD-6, AD-8, AD-10, AD-11

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/6-4-e2e-smoke.md
