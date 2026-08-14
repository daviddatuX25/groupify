# Groupify — Roadmap

Phasing preserves the full vision (locked decision: cut scope, never the vision).

## Night one (locked — the build)

- Session: create, join (code + PIN + QR), live/frozen states, archive/delete
- Identity: display name + per-device token auto-rejoin; no accounts
- Pool + live grid board: cards (name, 3/5, join/leave flash), open-slots filter, search
- Groups: create (sequential naming), join, leave; min/max enforced
- Admin: move member, dissolve all, freeze, CSV export (group/name/email/fields)
- Fields: admin adds text fields (required, on card, in CSV, filterable); "Chosen topic" use case
- Permissions: model + backend resolution (CAP-7); delegation used by `set group size` and `fill group fields`
- Server-status banner (CAP-9): Reverb connection state + heartbeat
- Retention: archived sessions auto-purge after 30 days (FR-1.7)
- UI: mobile-first, shadcn/ui + lucide, placeholder Groupify brand; "Coming next" section showing roadmap
- Stack: Laravel 13 + Inertia + React + Reverb + SQLite; Docker dev; Dokploy deploy at `groupify.dxtechph.online`

## Phase 2

- Full permission matrix UI (all actions × roles, per-session toggles)
- ~~Approval queue for join requests~~ — **SHIPPED (phase-2 story A, 2026-08-14)**; admin-side queue view still pending
- Communication tiers: announcements (priority banner), global chat, group chat + announcements (Reverb-ready)
- Moderation: kick & ban from group, global ban/blacklist, ghost-group GC + ownership transfer
- Extensions shelf UI (toggle modules per session)
- Activity/attendance report export (join-time, presence duration, group-hopping — from activity feed)
- Session config templates (save/replay rules + fields + perms — Wordwall/Mentimeter pattern)

## Phase 3+

- Proxy mode + bulk importer (field-trip use case)
- Auto-dissolve timer (pending); ~~match-me auto-assign~~ — **SHIPPED with Auto-Distribute (phase-2 story B, 2026-08-14)**
- Device binding (FingerprintJS; convenience-grade)
- Group quiz extension, custom roles
- PWA shell
- Gated entry / guest lists (invite-only, pre-allowed names — AhaSlides passcode / Zoom roster pattern)
- Anonymous mode (random names, host retains identity — Slido/Blooket pattern)
- Async sessions (reopen for absentees, deadline joins — Quizizz/Wordwall pattern)
- Avatar/visual identity (Blooket-style) — optional engagement layer
- Presenter remote control (Mentimote pattern)
- Scale-out: migrate SQLite → Postgres when load demands (Redis not required — Reverb carries realtime; rejected for night one: SQLite suffices at this scale)

## Resolved / deferred

- **Offline resilience (CAP-14)**: DECIDED — night one ships banner + auto-rejoin only; full offline mode (PWA cache/sync or local-host) is phase 3, revisit after real usage.
- **Retention (CAP-15)**: DECIDED — auto-purge archived sessions after 30 days (daily job, FR-1.7); per-session config later.
- **Branding**: placeholder = Groupify (repo + subdomain); user generates core brand later, polish after.
