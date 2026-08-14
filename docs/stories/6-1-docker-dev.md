# Story 6.1: Docker Dev Environment

Status: ready-for-dev

## Story

As a developer,
I want a one-command Docker dev environment (`docker compose up`) running Laravel 13 + Vite + Reverb + SQLite with hot reload,
so that any machine can run the full Groupify stack without manual setup.

## Acceptance Criteria

1. GIVEN a fresh checkout WHEN I run `docker compose up` THEN Laravel 13, Vite, Reverb, and SQLite all start and the app is reachable in the browser.
2. GIVEN the running dev stack WHEN I edit a React component, Tailwind style, or server-side file THEN hot reload (Vite HMR / server refresh) applies the change without restarting containers.
3. GIVEN the stack WHEN I create a session and open a second client THEN realtime events flow via Reverb and queued broadcasts are processed by the one database queue worker (AD-10 envelope).
4. GIVEN the compose setup WHEN inspected THEN it matches the one-box envelope: SQLite file DB, database queue + one worker, Reverb on the same box, broadcast driver env-driven (reverb default).

## Tasks / Subtasks

- [ ] Compose the dev stack (AC: 1, 4)
  - [ ] docker-compose.yml: app (PHP 8.3 + Laravel 13), Vite/node, Reverb, SQLite file volume
  - [ ] .env.example with BROADCAST_CONNECTION=reverb and QUEUE_CONNECTION=database defaults (AD-10)
  - [ ] Ports + healthchecks; app reachable at the documented local URL
- [ ] Hot reload wiring (AC: 2)
  - [ ] Vite HMR host config so in-browser reload works from containers
  - [ ] Mount source so server-side (PHP/Blade) edits reflect without rebuild
  - [ ] Reverb config reload path for channel/broadcast changes
- [ ] Queue worker + broadcast smoke (AC: 3)
  - [ ] One database queue worker process in the stack (AD-10)
  - [ ] Smoke: create session → join → event delivered to a second client within ~1s
  - [ ] Verify worker failure keeps events queued in SQLite and drains on restart
- [ ] Setup ergonomics (AC: 1)
  - [ ] One-command bootstrap (compose up + migrate steps documented in the repo)
  - [ ] Verify from a clean clone with no host PHP/Node required

## Dev Notes

- AD-2: Laravel 13 monolith + Inertia 3 + React 19; versions pinned in the Stack table. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-2]
- AD-10: one box, env-driven — SQLite file DB; database queue + one worker; Reverb on the same box; broadcast driver from env (reverb default; pusher = swap). [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-10]
- Reverb is bundled with Laravel 13 (keep patched — CVE-2026-23524 class). [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#Stack]
- NFR-1: realtime changes propagate within ~1s — the smoke must observe that. [Source: docs/prds/prd-groupify/prd.md#NFR-1]
- Laravel 13 conventions: routes in routes/, controllers app/Http/Controllers, models app/Models, migrations database/migrations, Inertia pages resources/js/pages, components resources/js/components.

### Project Structure Notes

- Greenfield Laravel 13 app; scaffold story 6-1 establishes the layout — assume standard Laravel 13 + Inertia structure.

### References

- [Source: docs/planning/epics-groupify.md#E6S1]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-2]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-10]

# Traceability

- FR: NFR-1 | CAP: — | AD: AD-2, AD-10

# Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

- docs/stories/6-1-docker-dev.md
