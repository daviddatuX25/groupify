---
title: Groupify — Session-Based Group Formation
status: draft
created: 2026-08-14
updated: 2026-08-14
spec: ../../specs/spec-groupify/SPEC.md
---

# 1. Overview

Groupify is a lightweight, ephemeral, session-based group-formation web app for
in-person facilitation: classrooms, workshops, meetups, hackathons. No accounts.
A facilitator creates a session; participants join by code, PIN, or QR from
their phones; groups form live on a realtime board the facilitator can see,
filter, override, and export. Flexibility is the core: permissions are
delegable per session, groups carry admin-defined fields (e.g. "Chosen topic"),
and optional extension modules plug in without touching core grouping logic.

Built in one night, self-hosted on the facilitator's own server, designed to
stay boring and swappable while the audience grows.

# 2. Goals & Non-goals

## Goals

- **G1** Make formation visible and live — everyone sees who is grouped with whom, right now.
- **G2** Zero-friction join — ≤5 taps from phone browser to seat; rejoin = same seat automatically.
- **G3** Facilitator control without shouting — move, freeze, dissolve, export from one screen.
- **G4** Flexibility by default — permissions, fields, and extensions are session config, not code changes.
- **G5** Never silently broken — a flaky home server degrades visibly, with an explicit offline state.

## Non-goals (night one — phased in `spec-groupify/roadmap.md`)

- User accounts, profiles, social graph
- Persistent chat history / DMs outside session windows
- Native mobile apps (PWA later)
- Multi-tenant hosting, billing, monetization
- Heavy moderation tooling (kick/ban, global ban, ghost-group GC)

# 3. Users & Journeys

Two roles night one: **facilitator** (session admin) and **participant**
(pool → member → possibly leader).

**UJ-1 — Maya, teacher.** Maya opens the session on the classroom projector;
the admin panel shows QR + PIN + live count. She adds a required field "Chosen
topic" in setup. Students scan the QR, type a name, land in the pool. Maya
enabled "anyone may create groups"; three students create groups and fill their
topic. The board fills live; the class sees Team Alpha: "AI Healthcare App",
3/5. One group's topic is blank — Maya's board flags it; she reminds them.
At the bell, she exports CSV: group / member / topic. (This is the user's own
use case — primary.)

**UJ-2 — Vince, workshop lead.** 200 participants, strict rules: min 3 / max 6,
join requires approval. Group leaders screen requests in a queue; Vince watches
the live board for lopsided groups, drags two people from Team Alpha to Team
Bravo, freezes grouping during the announcement, dissolves all groups for the
second round. Exports attendance + group rosters at the end.

**UJ-3 — Diego, first-time participant.** Scans QR, types "Diego", is in.
Sees the grid, joins Team Bravo with one tap, sees the card flash and fill to
4/5. Closes the tab; next day reopens the link and is back in his seat with no
name prompt. Server hiccups for a minute — he sees a "server offline — you're
in a safe spot, reconnecting…" banner instead of a dead screen.

# 4. Feature Requirements

## F1 — Session management

- **FR-1.1** Create a session; session gets a short code + admin token; creator becomes admin.
- **FR-1.2** Configure session rules at creation and live: min/max members, join mode (open/approval), allow user group creation, naming scheme (Team Alpha… / Table 1…).
- **FR-1.3** Freeze/unfreeze grouping; frozen = no join/leave/swap, board read-only.
- **FR-1.4** Archive/delete a session; archived sessions stop accepting joins; delete purges data (retention policy deferred, CAP-15).
- **FR-1.5** Admin panel surfaces join info: QR (join URL incl. code) + PIN, always visible on the projector view.
- **FR-1.6** Join-instruction bar pinned on every participant screen (code + join hint) so latecomers and lost tabs recover without asking — ADOPT from AhaSlides.
- **FR-1.7** Archived sessions auto-purge after 30 days (daily scheduled job); delete-now always available; per-session retention config is phase 2 (CAP-15).

## F2 — Join & identity

- **FR-2.1** Join by code + PIN; wrong PIN → clear error, no lockout. [ASSUMPTION: PIN = 4 digits, admin-set, default random]
- **FR-2.2** Join by scanning QR (join URL pre-fills code; PIN still required).
- **FR-2.3** First join: display name (required) + email (optional, for CSV).
- **FR-2.4** Per-device token (localStorage) → same device rejoins into its exact seat without re-entering identity.
- **FR-2.5** One seat per device per session (token-based; fingerprinting is CAP-13, deferred).

## F3 — Pool & live board

- **FR-3.1** Unassigned pool: every joined-but-ungrouped participant visible to admin (and to themselves).
- **FR-3.2** Live grid cards: group name, slots (3/5), field values, join button (or FULL).
- **FR-3.3** Join/leave feedback: card flashes green on join, red on leave, ~1s (accessibility-safe: flash + count change, not color alone).
- **FR-3.4** Board search by group name / field value; "open slots only" filter toggle.
- **FR-3.5** Online presence: total connected + pool count visible on participant and admin screens.

## F4 — Groups

- **FR-4.1** Create group: name (or auto per scheme), leader = creator; capacity bounded by session min/max.
- **FR-4.2** Join: open mode = instant; approval mode = Pending → leader/admin approves/rejects (queue UI is phase 2 — night one ships open mode + pending state with admin-side accept/decline).
- **FR-4.3** Leave group freely; leader leaving transfers leadership to next-joined member [ASSUMPTION].
- **FR-4.4** Group create/edit form renders all session-defined fields; required fields block submit until filled.
- **FR-4.5** Delegation: if session config grants it, leaders may set their group's size within session hard limits (CAP-7).

## F5 — Admin control

- **FR-5.1** Admin panel: QR + PIN, live stats (online / pool / groups), group list.
- **FR-5.2** Force-move member between groups (drag-and-drop or picker); lands in target group regardless of its join mode; moving to the pool = effective kick. Click-level control on the board, not menu hunts (Zoom/Kahoot pattern).
- **FR-5.3** Dissolve all groups → everyone to pool; per-group dissolve too.
- **FR-5.4** Freeze/unfreeze (FR-1.3) accessible from live view.
- **FR-5.5** CSV export: group, member name, email, all field columns.
- **FR-5.6** Activity feed: join/leave/create/dissolve/move events, timestamped (feeds future audit + moderation).
- **FR-5.7** Projection-mode hotkeys for the admin live view: toggle join-info panel, hide/show board (Mentimeter `i`/`h` pattern).

## F6 — Permissions engine

- **FR-6.1** Every action resolves `can?(action, role)`: session override → role default → system default (see `flexibility-model.md`).
- **FR-6.2** Admin toggles per action per role for the session; changes take effect live.
- **FR-6.3** Delegation is bounded by session rules (leader-set size can never exceed session max).
- **FR-6.4** UI hides/disabled non-permitted actions — no dead buttons, no 403 screens for normal users.
- **FR-6.5** Night-one surface: backend resolution + setup toggles for `set group size` and `fill group fields` (leaders); full matrix UI is phase 2.

## F7 — Extensions framework

- **FR-7.1** Session config carries `extensions: []`; enabling is per-session and requires zero core changes (CAP-8).
- **FR-7.2** Extension contract: hooks on session events + own screens + own data; core grouping logic is never mutated.
- **FR-7.3** Extensions shelf UI (list + toggles) ships in phase 2; night one ships the data model + one reference implementation [ASSUMPTION: none — pure framework, validated by tests].
- **FR-7.4** "Coming next" section in the app UI lists the roadmap (chat, approvals, proxy, quiz…) — keeps the vision visible to users.

## F8 — Reliability & server status

- **FR-8.1** Realtime connection loss → "server offline" banner within ~5s, with reconnecting state and retry.
- **FR-8.2** Heartbeat (client → health endpoint) as fallback when WebSocket state is ambiguous.
- **FR-8.3** On reconnect: participant re-syncs to current session state (seat, group, board) without page reload.

# 5. Non-Functional Requirements

- **NFR-1 Realtime**: membership/presence changes propagate to all connected devices within ~1s (target 200 concurrent).
- **NFR-2 Mobile-first**: participant flows fully usable on small phones, no install; admin flows usable on projector-sized screens (large type, high contrast).
- **NFR-3 Accessibility**: WCAG 2.1 AA basics — keyboard-operable admin controls, non-color-only state changes, readable contrast on projection, `prefers-reduced-motion` honored for join/leave flashes (Kahoot pattern).
- **NFR-4 Security pragmatism**: PIN gates public sessions; tokens are bearer-only; no PII beyond name/email; session delete purges rows.
- **NFR-5 Operability**: single-box deploy (Dokploy), SQLite, one queue worker; deploy must not require external paid services.
- **NFR-6 Data**: ephemeral-first; sessions archived/retained per policy (CAP-15, deferred); CSV export is the data exit hatch.
- **NFR-7 Boring stack**: Laravel 13 + Inertia + React + Reverb + shadcn/ui; every choice swappable via config (broadcast driver, DB).

# 6. Success Metrics

Primary (night-one demo): facilitator creates session → 20+ classmates join by
QR/PIN → groups form with required "Chosen topic" → CSV exported — end-to-end
on groupify.dxtechph.online, live updates ≤1s, no crashes.

Secondary: median join-to-seat time ≤ 30s; time from "session created" to
"first group formed" ≤ 2 min; zero silent-failure reports (offline banner
observed instead).

Counter-metrics to watch: time spent explaining the tool (proxy for bad UX);
group-formation chaos time (proxy for missing visibility/control).

# 7. Open Questions

All previously open items resolved 2026-08-14:

1. **Offline resilience** (CAP-14) → night one ships banner + auto-rejoin only (FR-8.1–8.3); full offline mode is phase 3, revisit after real usage.
2. **Retention & self-destruct** (CAP-15) → archived sessions auto-purge after 30 days (FR-1.7); per-session config later.
3. **Brand** → placeholder = Groupify (repo + subdomain); user generates core brand later, polish after.
4. **Approval-mode surface** → night one = pending state + admin-side accept/decline; leader queue UI is phase 2 (FR-4.2).
5. **PIN policy** → 4-digit, manual entry (see Section 8).

# 8. Assumptions

- [DECISION] Session code = 6-digit numeric (dominant convention: Quizizz 6, Blooket 6, Slido 7, Mentimeter 8); PIN = 4 digits. Jackbox-style case-sensitive alphanumerics rejected (O/0 ambiguity).
- [ASSUMPTION] Leadership transfer on leader leave = next-joined member (simple; ghost-GC is CAP-10).
- [ASSUMPTION] Participant sees only their own seat; no per-user admin delegation in night one.
- [ASSUMPTION] Email optional everywhere; CSV omits blanks.
- [ASSUMPTION] One active session per admin account window; multi-session admin is phase 3.
- [ASSUMPTION] 200 concurrent is the design ceiling; no sharding before that.
