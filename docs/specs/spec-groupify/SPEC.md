---
title: Groupify — Session-Based Group Formation
slug: groupify
status: draft
created: 2026-08-14
updated: 2026-08-14
companions:
  - state-machines.md
  - flexibility-model.md
  - roadmap.md
sources:
  - ../../../forged-idea.md
---

# Why

In-person groups still form by shouting, count-offs, spreadsheets, and whiteboards. Facilitation (classrooms, workshops, meetups, events) lacks a lightweight, ephemeral tool that makes group formation visible, live, and controllable: no accounts, join by code, one screen showing who is grouped with whom, right now. Differentiation is the live-formation loop — visible, human-paced, facilitator-overridable — not feature count.

# Capabilities

## Core — night-one build + framework

- **CAP-1 Session lifecycle** — create, run, freeze, archive ephemeral sessions. Success: admin creates a session and shares join info; archived sessions stop accepting joins.
- **CAP-2 Join & identity** — join by code + PIN or QR; display name; per-device token auto-rejoin. Success: first join takes ≤5 taps; same device rejoins into its existing seat without re-entering identity.
- **CAP-3 Pool & live grid** — unassigned pool plus realtime group cards (name, slots 3/5, join/leave flash, field values, search + open-slots filter). Success: any membership change visible on all connected devices within ~1s.
- **CAP-4 Group formation** — create (sequential naming), join (open or approval-gated), leave; capacity bounds enforced. Success: caps and join mode are never violated; leader can delegate size-setting within session bounds (CAP-7).
- **CAP-5 Admin control** — force-move member, dissolve all, freeze grouping, CSV export (group / members / emails / fields). Success: each control takes effect live and is recorded in an activity feed.
- **CAP-6 Group fields** — admin-defined per-group metadata (text night-one; choice/number later), required/optional, shown on card, searchable, in CSV. Success: a field added in setup appears on group create, board cards, and export.
- **CAP-7 Permission engine** — role × action matrix (admin / leader / member; co-host and custom roles later), session overrides, delegation with bounds. Success: every action resolves session override → role default → system default; delegating an action affects only that session.
- **CAP-8 Extensions framework** — session-toggled modules (chat, approval queue, proxy, auto-dissolve, match-me, quiz, device binding) via hooks on session events + own screens/data; core grouping logic untouched. Success: enabling an extension on one session and not another requires zero core code changes.
- **CAP-9 Server-status UX** — realtime connection state with explicit "server offline" banner; heartbeat fallback. Success: a dead server is shown to every client within ~5s; the app never appears silently broken.

## Deferred — contracted, preserved (phased in roadmap.md)

- **CAP-10 Communication tiers** — announcements (admin, priority banner), global chat, group chat; moderation (kick/ban, global ban, ghost-group GC, ownership transfer).
- **CAP-11 Proxy mode** — admin registers others (bulk import, named slots, drag-and-drop); proxy-registered roles can be claimed.
- **CAP-12 Group dynamics** — auto-dissolve timer; match-me auto-assign to least-full eligible group.
- **CAP-13 Device binding** — fingerprint seat enforcement (convenience, not security).
- **CAP-14 Offline resilience** — cached session view + queued actions with sync on reconnect. Night one: offline banner + auto-rejoin only; full offline mode deferred to phase 3 (resolved 2026-08-14).
- **CAP-15 Retention & self-destruct** — archived sessions auto-purge after 30 days (default); delete-now; per-session retention config later (resolved 2026-08-14).
- **CAP-16 Custom roles** — admin-definable roles in the permission matrix.

# Constraints

- No user accounts; identity = per-device token + display name. Bends every downstream design.
- Ephemeral-first: no permanent profile store; sessions archived or deleted after use.
- Self-hosted single box (Dokploy, SQLite, one queue worker); host is an unreliable home server → client must degrade visibly, never silently.
- Mobile-first (phone browser, no install); admin surface also projected on big screens.
- Realtime: membership/presence changes propagate within ~1s.
- Security pragmatism: public internet → PIN gates joins; seat-binding is unenforceable on the open web, treated as convenience.
- Cost floor: free/self-hosted only (Reverb, SQLite); no paid external services.
- One-night MVP constraint: formation core only; data model must be extension-ready from day one (permission matrix, field definitions, extension slots).

# Non-goals

- User accounts, profiles, social graph
- Persistent chat history or DMs outside session windows
- Native mobile apps (PWA later)
- Multi-tenant SaaS hosting, tenancy, billing
- Heavy moderation tooling in night-one scope

# Success signal

Night-one: a facilitator creates a session; 20+ classmates join by QR/PIN on phones; groups form with a required "Chosen topic" field; facilitator exports CSV (group / name / topic) — end-to-end on groupify.dxtechph.online, live updates within ~1s, no crashes. Vision: enabling an extension (e.g. group quiz) on a session requires zero changes to core grouping code.
