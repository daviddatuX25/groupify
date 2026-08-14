# Groupify — Build Plan (handoff)

One-night build of an ephemeral, session-based group-formation web app. Self-hosted.
Start here; every artifact below is part of the contract.

## The product in one line

Admin creates a session → people join by code/PIN/QR from their phones → groups
form live on a realtime board → admin sees, filters, overrides, and exports —
flexible per session (permissions, fields, extensions), no accounts.

## Artifacts (read in this order)

| # | Artifact | What it pins |
|---|----------|--------------|
| 1 | `docs/specs/spec-groupify/SPEC.md` | Why, 16 capabilities, constraints, non-goals, success signal |
| 2 | `docs/specs/spec-groupify/state-machines.md` | Participant / session / group state invariants |
| 3 | `docs/specs/spec-groupify/flexibility-model.md` | Permission matrix, fields spec, extension taxonomy |
| 4 | `docs/prds/prd-groupify/prd.md` | All FRs (with IDs), NFRs, journeys, metrics, assumptions |
| 5 | `docs/prds/prd-groupify/addendum.md` | Stack rationale, rejected alternatives, builder notes |
| 6 | `docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md` | 11 binding ADs — paradigm, identity, config, realtime, seats, fields, extensions, ops |
| 7 | `docs/planning/epics-groupify.md` | 26 night-one stories with acceptance criteria + traceability |
| 8 | `research/interface-research.md` | Competitive grounding (adopted patterns tagged) |
| 9 | `docs/specs/spec-groupify/roadmap.md` | Night-one vs phase 2/3; what must not be lost |
| 10 | `forged-idea.md` | The original hardened contract (superseded by 1–9) |

## Stack (locked)

Laravel 13 (v13.25.x, PHP 8.3+) · Inertia 3 · React 19 · Laravel Reverb (WS) ·
Tailwind v4 + shadcn/ui + lucide-react · SQLite · Docker dev · Dokploy at
`groupify.dxtechph.online`. Broadcast driver env-driven (reverb default, pusher
= swap). One queue worker (database driver).

## Build order (dependency-sequenced)

1. **E6S1** — Docker dev scaffold (Laravel 13 + Inertia + React + Vite + Reverb)
2. **E4S1** — Session config object (rules/fields/perms/extensions) — everything reads it
3. **E1** — Session foundation: create, join (code/PIN), QR, device-token rejoin, states, join bar
4. **E2** — Pool + grid board + create/join/leave groups + flashes + snapshot resync
5. **E3** — Admin control: panel, force-move, dissolve, freeze, CSV, activity feed, hotkeys
6. **E4S2–E4S5** — Fields wiring (card/search/CSV), permission engine, delegation toggles, extension registry
7. **E5** — Server-status UX, mobile shell, "Coming next", accessibility pass
8. **E6S2–E6S4** — Reverb/queue config, Dokploy deploy, end-to-end smoke

## Night-one acceptance (the smoke test)

Facilitator creates a session → 20+ classmates join by QR/PIN on phones → groups
form with required "Chosen topic" field → CSV exports group/name/topic →
end-to-end on groupify.dxtechph.online, live updates ≤1s, no crashes. Server
killed mid-session → offline banner ≤5s; server back → snapshot resync, no
duplicate seats.

## Locked decisions you must not silently reverse

- No user accounts — device token + display name only (AD-3)
- Single-writer: all mutations via Laravel transactions, then broadcast (AD-1)
- Session config object is the single source of truth (AD-4)
- Fields are config, not schema — no migrations per field (AD-8)
- Permission checks centralized; UI renders server-computed allowed actions (AD-5)
- Extensions never touch core grouping logic (AD-9)
- SQLite + database queue + Reverb on one box; nothing external required (AD-10)

## Explicitly deferred (do not build night one)

Chat tiers · approval queue UI · moderation · proxy mode · auto-dissolve ·
match-me · device binding · quiz extension · guest lists · anonymous mode ·
async sessions · templates · activity report export · custom roles · PWA ·
full offline mode (banner + auto-rejoin ships night one) · per-session
retention config. All captured in `roadmap.md` — the vision must survive the cut.

## Resolved decisions (2026-08-14)

- Offline: night one = banner + auto-rejoin only; full offline mode phase 3.
- Retention: archived sessions auto-purge after 30 days (daily job).
- Brand: **"Kinetic" dark design system locked** — full tokens/type/motion/components in `docs/brand/brand-context.md`; name Groupify; final logo pending (shell must accept drop-in logo).
- Approval: night one = pending state + admin accept/decline; leader queue phase 2.

## Tooling (installed 2026-08-14)

- BMad core v6.11.0 + Method + Builder → `_bmad/` (54 skills → `.claude/skills`)
- Config `_bmad/config.toml`: output_folder=docs · planning=docs/planning · implementation=docs/stories
- OpenSpec 1.6.0 → `openspec/` (changes + specs), wired for Oh My Pi + Claude Code — implementation-phase overlay for spec→code tracing
- Story files: `docs/stories/*.md` (27, ready-for-dev) + `docs/stories/sprint-status.yaml`
- Standing context for all runs: `project-context.md` (stack, ADs, doc map, workflow)

## The loop

1. `bmad-dev-story` — pulls the next ready-for-dev story from `docs/stories/sprint-status.yaml`, implements TDD, marks `review`
2. `bmad-code-review` — fresh context window, ideally a different model
3. Fix follow-ups → next story (story order: E1 → E2 → E3 → E4 → E5 → E6)
4. OpenSpec: each implementation tracked as a change proposal tracing spec→code (`/opsx:propose`)
5. Phase 2+ resumes from `roadmap.md` — vision preserved, never lost

## Next steps

Scaffold first (6-1 Docker dev env), then 4-1 session config object, then E1–E3 in order — see build order above.
