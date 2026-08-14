---
project_name: 'Groupify'
user_name: 'BMad'
date: '2026-08-14'
sections_completed: ['technology_stack', 'critical_implementation_rules']
existing_patterns_found: 0
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when
implementing code in this project. Focus on unobvious details that agents might
otherwise miss._

---

## Technology Stack & Versions

- Laravel ^13.25 (PHP ^8.3) — latest stable, verified 2026-08-14
- Inertia ^3 (React adapter) + React ^19
- Laravel Reverb (bundled with Laravel 13) — WebSocket realtime; keep patched (CVE-2026-23524 class)
- Tailwind CSS ^4 + shadcn/ui (latest, Tailwind v4 compatible) + lucide-react
- SQLite (bundled) — ephemeral sessions; Postgres is the later scale-out, not night one
- Vite (latest, Laravel starter default)
- Docker for dev; Dokploy deploy at `groupify.dxtechph.online`
- Broadcast driver env-driven: reverb default, pusher = one-env swap

## Critical Implementation Rules

Read `BUILD-PLAN.md` first; it is the entry point and lists every artifact.

1. **Single-writer monolith (AD-1).** All state mutations run in the Laravel app
   via HTTP actions; SQLite is the only source of truth; broadcasts fire only
   after committed mutations. Clients never write state directly.
2. **No user accounts (AD-3).** Participant identity = device token (UUID in
   localStorage) + display name + optional email. Admin identity = per-session
   admin_token. No users table, no login.
3. **Session config object is the single source of truth (AD-4).** Rules
   (min/max, join mode, allow-creation, naming, freeze), fields, permissions,
   and extensions live in one validated config structure per session. Adding a
   setting = config change, never ad-hoc columns.
4. **Centralized permission resolution (AD-5).** `can?(action, role, session)`
   resolves session override → role default → system default in one service.
   UI renders only the server-computed allowed-action set; the client never
   runs a second check.
5. **Realtime: two channel classes + snapshot resync (AD-6).** `session:<code>`
   (presence + events) and `admin:<code>` (god-mode). After any reconnect the
   client fetches the full session snapshot. Flashes derived client-side from
   events, honoring `prefers-reduced-motion`.
6. **Seats membership model (AD-7).** One participant row per (session, device
   token); memberships = rows (participant, group, role leader/member, status
   pending/active); capacity = count of active memberships, enforced
   transactionally with the freeze flag.
7. **Fields are config, not schema (AD-8).** Field definitions live in session
   config; values stored as JSON keyed by field id; CSV export builds columns
   dynamically. Adding a field = no migration.
8. **Extensions never touch core (AD-9).** Extensions = hooks on session events
   + own screens + own namespaced tables. Core grouping code is
   extension-agnostic.
9. **Server-status UX (AD-11).** Online / reconnecting / offline states from
   Reverb connection + /health heartbeat. Never a silent failure.
10. **6-digit numeric session code + 4-digit PIN.** No case-sensitive
    alphanumerics (Jackbox O/0 ambiguity rejected).

## Documentation Map

- Spec contract: `docs/specs/spec-groupify/SPEC.md` (+ state-machines.md,
  flexibility-model.md, roadmap.md)
- Requirements: `docs/prds/prd-groupify/prd.md` (+ addendum.md)
- Architecture: `docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md` (AD-1..AD-11)
- Stories: `docs/stories/` (dev-story loop) + `docs/stories/sprint-status.yaml`
- Epics: `docs/planning/epics-groupify.md`
- Research: `research/interface-research.md`
- **Brand & UI: `docs/brand/brand-context.md` — "Kinetic" dark design system;
  binding for all UI work (colors, type, motion, components). Read before any frontend story.**

## Workflow

- Implementation loop: `bmad-dev-story` → `bmad-code-review` (fresh context) →
  next story. Story files live in `docs/stories/`.
- OpenSpec (implementation-phase overlay for spec→code tracing): change
  proposals in `openspec/changes/`, specs in `openspec/specs/`; every
  implementation must trace to a spec requirement.
- Memlogs are append-only decision records; never edit them, only append.
