# Groupify — PRD addendum (technical decisions, options considered)

## Stack decisions (locked)

- **Laravel 13** (verified current 2026-08: v13.25.x, PHP 8.3+) — user comfort + "super-latest" requirement; ecosystem covers realtime, session flows, queues, export.
- **Inertia + React** — SPA-grade navigation without an API layer; keeps future PWA/offline work on a familiar client surface.
- **Laravel Reverb over Pusher** — self-hosted WebSocket server, free, no connection caps; Pusher free tier caps ~100 concurrent connections, which dies against the wide-audience ambition, and adds an external dependency. Broadcast driver abstraction makes swapping to Pusher a one-env change if ever needed.
- **SQLite over Postgres/Redis** — ephemeral sessions, small scale; SQLite suffices. Reverb carries realtime, so Redis is unnecessary. Postgres migration is the phase-3+ scale-out.
- **shadcn/ui + lucide + Tailwind v4 (Vite)** — proven mobile-first primitives; avoids inventing design-system components.
- **Docker for dev; Dokploy deploy** at `groupify.dxtechph.online`; DB queue + one `queue:work` worker for broadcasts.

## Rejected alternatives

| Option | Rejected because |
|---|---|
| Pusher (free tier) | ~100 conn cap; external dependency; same downtime profile as self-hosted anyway |
| Postgres + Redis night one | Ops weight without scale need; SQLite is one-file simple on a home server |
| SPA-only (pure React, no Inertia) | Duplicate auth/session logic; Inertia keeps server-rendered simplicity + client interactivity |
| Django/Flask/Node | User comfort is Laravel; no feature gap worth switching |
| Heavy auth (accounts) | Kills the ephemeral no-accounts model (spec constraint) |

## Notes for the builder

- Realtime channels: session-scoped (`session.{code}` presence + events), admin-scoped for god-mode actions. Keep channel authorization to token check — no per-user auth tables.
- The session config object (`rules` / `fields` / `perms` / `extensions`) is the single source of truth — one serialized JSON column or a small set of tables; do not scatter config across ad-hoc flags.
- CSV export must include dynamic field columns (fields are config, not schema).
- Device token: localStorage UUID; rejoin matches token + session → seat.
- Offline banner driven primarily by Reverb connection state; heartbeat as fallback (FR-8.2).
