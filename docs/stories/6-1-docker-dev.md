---
baseline_commit: c70c427be60c820f19ac760c7131413b3326b8bf
---

# Story 6.1: Docker Dev Environment

Status: in-progress

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

- [x] Compose the dev stack (AC: 1, 4)
  - [x] Dockerfile: php:8.4-cli + Node 22 + Composer + rsync; pcntl/sqlite/intl/zip extensions
  - [x] compose.yaml: one service, ports 8000 (Laravel) / 8081→8080 (Reverb — host 8080 occupied) / 5173 (Vite); bind mount; env-driven broadcast (reverb default)
  - [x] scripts/dev-bootstrap.sh: idempotent scaffold (create-project → composer/npm install → shadcn init → install:broadcasting --reverb → queue:table → migrate)
  - [x] scripts/entrypoint.sh: one-box runtime — npm run dev + queue:listen + reverb:start + artisan serve
  - [x] App reachable: `curl localhost:8000` → 200 (Laravel 13.25.0, Inertia SSR working)
- [x] Hot reload wiring (AC: 2)
  - [x] Vite dev server on 5173 with HMR (observed: optimizer bundling + Inertia SSR module graph warmup in logs)
  - [x] Source bind-mounted — PHP/Blade/TSX edits reflect without rebuild
  - [x] Env: VITE_REVERB_* host-visible ports (8081) wired through compose env
- [ ] Queue worker + broadcast smoke (AC: 3) — BLOCKED on E1 session domain
  - [x] One database queue worker in the stack (entrypoint `queue:listen --tries=1`); jobs table migrated
  - [ ] Smoke: create session → join → event delivered to a second client within ~1s (needs E1 sessions; covered by E6S4)
  - [ ] Verify worker failure keeps events queued in SQLite and drains on restart
- [x] Setup ergonomics (AC: 1)
  - [x] One-command bootstrap documented: `docker compose run --rm --entrypoint bash app scripts/dev-bootstrap.sh` then `docker compose up`
  - [x] Verified with no host PHP/Composer — everything inside the container

## Dev Notes

- AD-2: Laravel 13 monolith + Inertia 3 + React 19; versions pinned in the Stack table. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-2]
- AD-10: one box, env-driven — SQLite file DB; database queue + one worker; Reverb on the same box; broadcast driver from env (reverb default; pusher = swap). [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-10]
- Reverb is bundled with Laravel 13 (keep patched — CVE-2026-23524 class). [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#Stack]
- NFR-1: realtime changes propagate within ~1s — the smoke must observe that. [Source: docs/prds/prd-groupify/prd.md#NFR-1]
- Guidelines (source-verified 2026-08-15): [Source: research/laravel-guidelines.md] — Pest 4 needs PHP 8.4+ (image uses 8.4-cli); install:broadcasting --reverb sets BROADCAST_CONNECTION=reverb but its env generation can be bypassed by hand-writing REVERB_* vars; SQLite WAL + busy_timeout + transaction_mode IMMEDIATE set in config/database.php; broadcast fakes removed in Laravel 13 (use Event/Queue fakes).

### Project Structure Notes

- Standard Laravel 13 blank-react starter: app/, bootstrap/, config/, database/, public/, resources/, routes/, tests/.
- shadcn/ui initialized (components.json, base-nova style, lucide) — button.tsx added as smoke; theme to Kinetic brand in story 5-2.
- Pest 4.7 installed (kit ships PHPUnit by default; --pest conversion is installer-only — added via composer require).
- phpstan memoryLimit moved to composer script (`--memory-limit=1G`) — neon key rejected by this phpstan version.
- .env holds dev Reverb credentials (gitignored); VITE_REVERB_PORT=8081 on host.

### References

- [Source: docs/planning/epics-groupify.md#E6S1]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-2]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-10]
- [Source: research/laravel-guidelines.md]

# Traceability

- FR: NFR-1 | CAP: — | AD: AD-2, AD-10

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Vite manifest missing → 500 on `/` (fixed: npm run build; asset manifest now committed)
- install:broadcasting --reverb died pre-env: reverb:install is an artisan command and every command crashed until REVERB_* vars existed — hand-wrote dev keys to .env (chicken-and-egg resolved)
- shadcn init picked pnpm (ENOENT) — installed pnpm in image; init with `-t laravel -y -f --reinstall`
- Rolldown build failure: `@laravel/echo-react` import injected by install:broadcasting but deps never installed (its npm step never ran) — `npm i -D laravel-echo pusher-js @laravel/echo-react`
- phpstan parallel worker OOM in container — pinned --memory-limit=1G in composer script
- chown 1000 → 1001 (host uid) fixed host edit permission; files now owned by host user

### Completion Notes List

- Dev environment complete and verified: Laravel 13.25.0 (200 + Inertia SSR), Vite HMR bundling, Reverb listening on 8081, queue worker running, SQLite migrated with WAL.
- Gates green: `composer run test` (pint 31 files + phpstan 0 errors + pest 2/2), `npm run build` ✓.
- AC3 realtime event-flow smoke deferred to E1/E6S4 (no session domain yet) — task left open, story in-progress.

### File List

- Dockerfile, compose.yaml, .dockerignore, scripts/entrypoint.sh, scripts/dev-bootstrap.sh
- Laravel 13 scaffold: app/, bootstrap/, config/, database/, public/, resources/, routes/, tests/, artisan, composer.json, composer.lock, package.json, package-lock.json, phpstan.neon, pint.json, phpunit.xml, vite.config.ts, tsconfig.json, components.json, .gitignore, .editorconfig, .github/, eslint.config.js, .prettierrc, .prettierignore, .npmrc, pnpm-workspace.yaml, .gitattributes, .env.example
- Modified: config/database.php (SQLite WAL + busy_timeout + IMMEDIATE), composer.json (phpstan memory flag, Pest dev deps), phpstan.neon, resources/js/app.tsx (Echo via install:broadcasting)
- docs/stories/6-1-docker-dev.md (this record)
