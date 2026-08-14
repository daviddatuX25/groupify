# Groupify — forged idea

Status: HARDENED · 2026-08-14 · One-night build, self-hosted, agent-built from this.

## Core identity

Ephemeral, session-based group-formation tool. No user accounts. Admin creates a
session → participants join by code/QR → unassigned pool → live grid board shows
groups filling in real time → create/join/leave groups → admin moves people and
dissolves groups. Like Kahoot/Jackbox for grouping.

Differentiation is the **live-formation loop** (visible, human-paced, admin
override) — not feature count. "Blue ocean" is marketing, not a moat.

## Night-one scope (locked)

- Session lifecycle: create → join → run → archive/delete. Short-lived container.
- Join: link + short code + PIN gate (public internet). QR encodes join URL.
  Admin panel shows QR + PIN for big-screen display.
- Participant identity: display name + per-device token (localStorage) for
  re-entry. No fingerprinting.
- Live grid board: cards (name, 3/5 slots, join/leave flash), open-slots filter.
- Group actions: create (auto-names sequentially), join, leave.
- Admin panel (creator token, no accounts): move member, dissolve all, freeze
  toggle, export CSV (name/group/email).
- Server-offline indicator: realtime connection state → "server offline" banner,
  heartbeat fallback. Home server is unreliable; treat that as a feature.
- Brand shell: placeholder Groupify brand, mobile-first, accessible, shadcn/ui +
  lucide. Polish after core works.

## Stack (locked)

- Laravel 13 (latest stable — verified 2026-08, v13.25.x) + Inertia + React
- Realtime: **Laravel Reverb** — decision over Pusher. Same box, free, no
  connection caps, fits "self-hosted, lean on frees". Pusher = one-env swap via
  broadcast driver if ever needed (free tier caps at ~100 conns — too small for
  the wide-audience ambition).
- shadcn/ui + lucide + Tailwind v4 (Vite)
- SQLite (ephemeral sessions; Postgres is the later scale-out, not night one)
- Docker for dev; deploy to Dokploy at `groupify.dxtechph.online`
- DB queue + one worker for broadcasts

## Deferred — vision preserved, do not lose (Q3)

- Device binding / fingerprinting (FingerprintJS). Weak by design — convenience, not security.
- Proxy mode + bulk importer (field-trip: 30 kids, no phones)
- Approval-required groups + applicant queue
- 3-tier chat (announcements / global / group) + moderation (kick & ban, global ban, ghost-group GC, ownership transfer)
- Auto-dissolve timer (speed-networking mode)
- Match-me auto-assign to least-full group
- **Offline mode**: PWA shell + offline join + sync queue; server-down resilience. "Banger" quirk — needs its own design pass before build.
- Session retention / self-destruct policy
- "Coming next" section in the UI listing the above (keeps vision visible to users)

## Rejected now (why)

- User accounts / heavy auth — kills the ephemeral session model
- Postgres + Redis — SQLite suffices at this scale
- Pusher — external dep + connection cap; Reverb is free and self-hosted
- Chat tiers night one — biggest scope item; formation is the product

## First real user

Classmates, demo-grade but must actually work (Q1: B-with-A). Ambition: wide
audience later. Keep stack boring and swappable.

## Wedge

BYOD facilitated events. Field-trip proxy and speed-networking are later modes,
not the core.
