# Groupify

Ephemeral, session-based group formation for live rooms. A host creates a
session; participants join by 6-digit code + PIN (or QR); groups form live on
a realtime board everyone sees; the host controls, overrides, and exports
results — then the session expires and disappears.

Built for a home server: one container runs the whole app.

## Features

- **Sessions** — create, freeze/unfreeze, archive, auto-purge (30 days), QR + PIN join, auto-rejoin
- **Group formation** — live pool + grid board, create/join/leave groups, leadership transfer, auto-distribute, per-group capacity, exact-size or range sizing
- **Admin panel** — QR/PIN/stats, force-move, dissolve, bulk group creation (sequential or random names), CSV export with dynamic columns, activity feed, projection hotkeys (`i`/`h`)
- **Flexibility** — session config object as single source of truth: fields as config, permission matrix (delegable), custom roles, plugins with toggles
- **Phase-2 features** — approval queue, guest lists, anonymous mode, templates, chat tiers (announcements + group chat + global hub with moderation), quiz, proxy mode, PWA offline shell, custom roles
- **Realtime** — Laravel Reverb WebSockets; snapshot resync on reconnect
- **No user accounts** — device-token identity; admin = per-session bearer token

## Stack

Laravel 13 (PHP 8.4) · Inertia 3 · React 19 · TypeScript · Tailwind v4 ·
Reverb (WebSockets) · SQLite (WAL) · Pest / Playwright

## Repository layout

```
app/                  Laravel app (controllers, services, events, models)
resources/js/         React/Inertia frontend (pages, components, lib)
resources/css/        Tailwind + Kinetic dark theme
routes/web.php        All routes (web + admin API)
database/             Migrations; runtime SQLite lives in database/data/ (volume)
docker/prod/          Production image: nginx, php-fpm, supervisord, entrypoint
scripts/              Dev, test, e2e, verify, backup helpers
docs/deploy/          Dokploy deployment recipe
openspec/             OpenSpec change traces
```

## Quick start (local development)

Prerequisites: Docker with the compose plugin.

```bash
docker compose up -d --build          # Laravel :8000, Vite :5173, Reverb :8082
docker compose run --rm app bash scripts/dev-bootstrap.sh   # first run: deps + .env + migrate
```

- App: http://localhost:8000
- Realtime (dev): ws://localhost:8082 (Vite proxies are already configured)
- The dev entrypoint starts Vite, the queue worker, Reverb, and the scheduler
  inside the container — `docker compose logs -f app` shows everything.

## Quality gates

```bash
# Backend: Pint + PHPStan + Pest (200+ tests)
docker compose run --rm --entrypoint bash app -lc 'cd /var/www/html && composer run test'

# Frontend: typecheck + lint + production build
docker compose run --rm --entrypoint bash app -lc 'cd /var/www/html && npm run types:check && npx eslint resources/js tests/e2e && npm run build'

# End-to-end (runs against the PROD stack on :8081 — see below)
./scripts/e2e.sh
```

## Production deployment

The production image is a single self-contained container: nginx + php-fpm +
**queue worker** + **Reverb** + **scheduler**, all supervised by supervisord
and dropped to `www-data`. There is **no external cron, no separate queue
process, no separate WS server** — one container is the whole deployment.

On first boot the entrypoint:
1. creates the SQLite file, runs migrations, regenerates caches
2. generates a random `APP_KEY` once and persists it on the data volume
3. drops privileges and starts supervisord (nginx, php-fpm, queue, reverb, scheduler)

### Option A — Dokploy (recommended)

Full click-through recipe: **`docs/deploy/dokploy.md`**. Summary:

1. Push this repo to GitHub/Gitea and use that remote in Dokploy.
2. New application, Docker (Git) type: path `Dockerfile.prod`, branch `main`.
3. **Build args** (Dokploy build section): `VITE_REVERB_APP_KEY=<your REVERB_APP_KEY>` — the only baked value. Host/port/scheme are *not* baked: the WS endpoint follows the page origin, so LAN phones and the public domain both get realtime.
4. **Domain + SSL**: `groupify.dxtechph.online` (Let's Encrypt via Dokploy).
5. **Environment variables** (see `.env.production.example`): the four secrets
   (`APP_KEY`, `REVERB_APP_ID`, `REVERB_APP_KEY`, `REVERB_APP_SECRET` —
   generate with `openssl rand -base64 24` / `openssl rand -hex 16`) plus the
   settings below.
6. **Volumes** (persistence — both required):
   - `/var/www/html/database/data` — the SQLite file
   - `/var/www/html/storage` — logs, exports, avatars
7. WebSocket proxying: the in-container nginx proxies `/app` → Reverb with
   upgrade headers; Dokploy's default Caddy proxy passes them through (snippet
   in `docs/deploy/dokploy.md` if your proxy blocks upgrades).
8. The scheduler runs inside the container — no external cron needed.

### Option B — image registry (no git remote)

```bash
docker build -f Dockerfile.prod \
  --build-arg VITE_REVERB_APP_KEY=<random hex> \
  -t <your-user>/groupify:1.0.0 .
docker push <your-user>/groupify:1.0.0
```

Then in Dokploy: **New Application → Docker (Image) type**, same env +
volumes + domain.

### Local test of the production image (no credentials needed)

```bash
docker compose -f compose.prod.yaml up -d --build
curl http://localhost:8081/health    # {"status":"ok"}
```

Then open http://localhost:8081 — full flow including WebSockets on the same
port via the `/app` proxy.

### Environment variables (production)

| Variable | Required | Notes |
|---|---|---|
| `APP_KEY` | no* | *entrypoint generates + persists one on first boot; set explicitly to pin it |
| `APP_URL` | yes | e.g. `https://groupify.dxtechph.online` |
| `REVERB_APP_ID` / `REVERB_APP_KEY` / `REVERB_APP_SECRET` | yes | random values; `REVERB_APP_KEY` must match the build arg |
| `DB_CONNECTION` | yes | `sqlite` |
| `DB_DATABASE` | yes | `/var/www/html/database/data/database.sqlite` |
| `QUEUE_CONNECTION` | yes | `database` |
| `CACHE_STORE` / `SESSION_DRIVER` | yes | `database` |
| `BROADCAST_CONNECTION` | yes | `reverb` |
| `REVERB_HOST` / `REVERB_PORT` / `REVERB_SCHEME` | yes | `127.0.0.1` / `8080` / `http` (in-container) |
| `DB_BUSY_TIMEOUT` | yes | `30000` — SQLite write contention with the worker + scheduler |
| `DB_JOURNAL_MODE` | yes | `wal` |

### Services running inside the container (supervisord)

| Program | Command | Purpose |
|---|---|---|
| `nginx` | nginx daemon off | HTTP entry + `/app` WS proxy → Reverb |
| `php-fpm` | php-fpm -F | Laravel app |
| `queue` | `artisan queue:work --sleep=1 --tries=3` | broadcasts + jobs (chat, auto-distribute, …) |
| `reverb` | `artisan reverb:start --host=0.0.0.0 --port=8080` | WebSocket server |
| `scheduler` | `artisan schedule:work` | purge archived sessions, auto-dissolve timers |

Logs: `docker logs groupify-app-prod -f` (entrypoint tails all supervisor
logs to stdout). App-level logs: `storage/logs/laravel.log`.

## Verification after deploy

```bash
./scripts/verify-prod.sh https://groupify.dxtechph.online
```

Manual: `/health` → `{"status":"ok"}`; create a session; join by QR/code+PIN
from a phone; second device sees seats update ≤1 s; stop the container and
clients show the offline banner within ~5 s; restart → resync without
duplicate seats.

## Scripts

| Script | Purpose |
|---|---|
| `scripts/dev-bootstrap.sh` | First-run dev setup (deps, .env, migrate) |
| `scripts/entrypoint.sh` | Dev container entrypoint (Vite + queue + reverb + scheduler) |
| `scripts/e2e.sh` | Playwright e2e against the prod stack on :8081 |
| `scripts/verify-prod.sh` | Post-deploy acceptance drill against a URL |
| `scripts/backup.sh` | WAL-safe SQLite snapshot → `backups/groupify-<ts>.sqlite` |
| restore | manual — see `docs/deploy/dokploy.md` (stop stack → replace file → start) |
| `scripts/push-ready.sh` | Pre-push sanity (gates + build + e2e smoke) |
| `scripts/load-test.sh` / `scripts/fanout.mjs` / `scripts/ws-probe.mjs` | Load / WebSocket stress helpers |

## Backups

```bash
./scripts/backup.sh
# crontab: 0 3 * * * cd /home/<user>/groupify && ./scripts/backup.sh
```

Restore: stop the stack, replace `database/data/database.sqlite` on the
volume with the snapshot, delete `-wal`/`-shm` siblings, start.

## Troubleshooting

- **SQLite "database is locked"** — the queue worker and scheduler write
  concurrently; `DB_BUSY_TIMEOUT=30000` must be set in production env.
- **Blank admin page after deploy** — `VITE_REVERB_APP_KEY` build arg missing
  or mismatched with `REVERB_APP_KEY`; rebuild the image with the build arg.
- **Supervisord "Illegal seek" log noise** — known supervisord quirk with pipe
  stdout; the app is unaffected, real logs are in `storage/logs/laravel.log`.
- **Volume shadowing** — mount only `database/data` (not the whole
  `database/` dir); migrations live in the image.

## Documentation

- Deployment: `docs/deploy/dokploy.md`
- Architecture spine (AD-1..11): `docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md`
- Spec / PRD / roadmap / reviews: `docs/specs`, `docs/prds`, `docs/planning`, `docs/reviews`
- Brand: `docs/brand/brand-context.md`
- Build plan: `BUILD-PLAN.md`
