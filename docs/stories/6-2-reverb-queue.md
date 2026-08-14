# Story 6.2: Reverb + Queue

Status: ready-for-dev

## Story

As an operator,
I want broadcasts driven by env (Reverb default, pusher-swappable) with a database queue and one worker delivering session events,
so that realtime updates propagate within ~1s on a single box with no external paid services.

## Acceptance Criteria

1. GIVEN the app configuration WHEN BROADCAST_CONNECTION is at its default THEN the reverb driver is used; setting it to pusher swaps the driver with no code change (AD-10).
2. GIVEN a session event (join/leave/create/move/dissolve) WHEN it is broadcast THEN the queued broadcast is processed by the single database queue worker and delivered to connected clients.
3. GIVEN the queue worker WHEN it is stopped THEN events remain queued in SQLite and are delivered once the worker returns (no loss).
4. GIVEN connected clients WHEN an event fires THEN they receive it within ~1s (NFR-1).

## Tasks / Subtasks

- [ ] Env-driven broadcast config (AC: 1)
  - [ ] BROADCAST_CONNECTION env (reverb default; pusher swap) wired in config/broadcasting.php
  - [ ] .env.example documents both drivers; no code path references a driver directly
  - [ ] Verify driver swap takes effect on config change without code edits
- [ ] Database queue + one worker (AC: 2, 3)
  - [ ] QUEUE_CONNECTION=database; session events broadcast as queued jobs after committed mutations (AD-1)
  - [ ] Events carry entity IDs + revision numbers (AD-6) for resync
  - [ ] One worker (AD-10) — documented start command and container wiring
- [ ] Delivery verification (AC: 4)
  - [ ] Smoke: join/leave/move event visible on a second client within ~1s
  - [ ] Worker-down drill: events queue in SQLite; drain on restart with no loss

## Dev Notes

- AD-6: two channel classes (session presence + admin); events carry entity IDs + revision numbers; reconnect always ends in snapshot resync. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]
- AD-10: broadcast driver from env (reverb default; pusher = swap); database queue + one worker; Reverb on the same box; nothing external required. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-10]
- AD-1: broadcasts fire only after committed mutations; SQLite is the only source of truth. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-1]
- NFR-1: membership/presence changes propagate to all connected devices within ~1s. [Source: docs/prds/prd-groupify/prd.md#NFR-1]
- CAP-3: any membership change visible on all connected devices within ~1s. [Source: docs/specs/spec-groupify/SPEC.md#CAP-3]
- Reverb is bundled with Laravel 13 (keep patched — CVE-2026-23524 class). [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#Stack]
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#E6S2]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-6]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-10]
- [Source: docs/specs/spec-groupify/SPEC.md#CAP-3]

# Traceability

- FR: NFR-1 | CAP: CAP-3 | AD: AD-1, AD-6, AD-10

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/6-2-reverb-queue.md
