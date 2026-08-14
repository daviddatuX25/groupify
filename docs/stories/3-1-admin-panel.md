# Story 3.1: Admin Panel

Status: ready-for-dev

## Story

As a facilitator (session admin),
I want an always-available admin panel showing join info and live session state,
so that I can run the session from the projector without hunting for controls.

## Acceptance Criteria

1. GIVEN I am the session admin and the session is live WHEN I open the admin panel THEN the QR code (encoding the join URL with the session code) and the 4-digit PIN are always visible.
2. GIVEN the admin panel is open WHEN participants join, leave, or groups change THEN live stats (online count / pool count / group count) update in real time.
3. GIVEN groups exist in the session WHEN I view the admin panel THEN the group list shows every group with its current slots (e.g. 3/5).
4. GIVEN a request lacks a valid admin token WHEN it targets an admin route THEN it is rejected and no admin data is returned.

## Tasks / Subtasks

- [ ] Admin panel route, controller, and Inertia page (AC: 1, 4)
  - [ ] Add `GET /sessions/{code}/admin` route behind per-session admin-token authorization; controller in `app/Http/Controllers/Admin`.
  - [ ] Create Inertia page `resources/js/pages/admin/Panel.tsx` rendered from server state (AD-2).
- [ ] Join-info block (AC: 1)
  - [ ] Render QR encoding the join URL incl. code (reuse the E1S3 QR component) with the PIN alongside, persistently visible (FR-1.5).
  - [ ] Lay out for projector use: large type, high contrast (NFR-2, E5S2).
- [ ] Live stats (AC: 2)
  - [ ] Subscribe to the `admin:<code>` channel (AD-6); derive online / pool / groups counts from the server snapshot and re-render on events.
  - [ ] Compute pool count from active memberships with no group (AD-7); resync full snapshot on any reconnect.
- [ ] Group list with slots (AC: 3)
  - [ ] Render each group with member count vs capacity (e.g. 3/5) from memberships, capacity from session config `rules` (AD-4).
  - [ ] Refresh the list from the snapshot after every admin-channel event (AD-6).
- [ ] Allowed-action gating (AC: 4)
  - [ ] Server computes the allowed-action set via `can?` (AD-5); panel renders only permitted admin controls — no dead buttons.

## Dev Notes

- AD-3: admin identity = per-session `admin_token`; every session-scoped admin request is authorized by that token.
- AD-5: UI affordances render only from the server-computed allowed-action set; the client never runs a second check.
- AD-6: two channel classes — the admin channel (`admin:<code>`) carries god-mode events; reconnect always ends in a full snapshot resync.
- AD-7: seats model — stats and slots derive from `memberships` rows, never from client-side counts.
- AD-4: group capacity and naming come from the validated session config object, read through the one resolver.
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#epic-e3--admin-control-god-mode]
- [Source: docs/prds/prd-groupify/prd.md#f5--admin-control]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-5]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-3]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-4]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-5]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-7]

# Traceability

- FR: FR-1.5, FR-5.1 | CAP: CAP-5 | AD: AD-3, AD-4, AD-5, AD-6, AD-7

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/3-1-admin-panel.md
