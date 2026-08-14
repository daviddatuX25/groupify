---
title: Groupify — Epics & Stories
status: complete
created: 2026-08-14
updated: 2026-08-15
stepsCompleted: [epics, stories, acceptance-criteria, traceability]
---

# Groupify — Epics & Stories

Night-one build decomposed by user value. Traceability: FR = PRD `FR-N.M`,
CAP = SPEC `CAP-N`, AD = `ARCHITECTURE-SPINE.md` `AD-n`. Epics E1–E6 are
night-one; E7+ is the preserved vision (roadmap), listed without story detail.

---

## Epic E1 — Session Foundation (join, identity, lifecycle)

**E1S1 Create session** — FR-1.1, FR-1.2, CAP-1, AD-3
- Acceptance: admin opens `/new`; session created with unique 6-digit code + 4-digit PIN + admin token; defaults (min 3, max 6, join open, naming "Team Alpha…"); admin lands in the admin panel; wrong admin URL rejects.

**E1S2 Join by code + PIN** — FR-2.1, FR-2.3, CAP-2
- Acceptance: participant enters code + PIN → prompted for name (required) + email (optional); wrong PIN shows clear error; unknown code shows clear error; no lockout.

**E1S3 QR join** — FR-2.2, CAP-2
- Acceptance: admin panel renders QR encoding join URL with code; scanning lands on join screen with code pre-filled; PIN still required.

**E1S4 Auto-rejoin by device token** — FR-2.4, FR-2.5, CAP-2
- Acceptance: returning device (localStorage token) skips name entry and lands in its exact seat; a second device joining the same session is a separate seat.

**E1S5 Session states + archive/delete** — FR-1.3, FR-1.4, CAP-1
- Acceptance: live → frozen blocks all joins/leaves/swaps (board read-only, admin exempt); archive stops joins; delete purges rows.

**E1S6 Join-instruction bar** — FR-1.6, ADOPT(AhaSlides)
- Acceptance: every participant screen shows code + "enter PIN" hint persistently.

**E1S7 Auto-purge archived sessions** — FR-1.7, CAP-15
- Acceptance: daily job purges archived sessions older than 30 days; delete-now works immediately; purge never touches active sessions.

**E2S1 Unassigned pool** — FR-3.1, CAP-3
- Acceptance: joined-but-ungrouped participants visible in pool (self + admin); pool count on all screens.

**E2S2 Grid board** — FR-3.2, FR-3.4, CAP-3, ADOPT(OpenSpace)
- Acceptance: cards show name, slots (3/5), field values, join button or FULL; search by name/field value; "open slots only" filter.

**E2S3 Create group** — FR-4.1, FR-4.4, CAP-4
- Acceptance: leader names group (or auto per scheme); capacity bounded by session min/max; field form rendered from config; required fields block submit; leader = creator.

**E2S4 Join / leave group** — FR-4.2, FR-4.3, CAP-4, AD-7
- Acceptance: open mode = instant join; capacity + freeze re-checked in one transaction (no overfill, no joins while frozen); leave returns to pool; leader leave transfers leadership to next-joined member.

**E2S5 Live flashes + presence** — FR-3.3, FR-3.5, CAP-3, AD-6
- Acceptance: join → green flash, leave → red flash (~1s) derived from events; honors `prefers-reduced-motion`; online count updates live.

**E2S6 Snapshot resync** — FR-8.3, AD-6
- Acceptance: after reconnect the client fetches full session snapshot and renders from it — no stale cards, no duplicate seats.

## Epic E3 — Admin Control (god-mode)

**E3S1 Admin panel** — FR-1.5, FR-5.1, CAP-5
- Acceptance: QR + PIN always visible; live stats (online / pool / groups); group list with slots.

**E3S2 Force-move member** — FR-5.2, CAP-5, ADOPT(Zoom/Kahoot)
- Acceptance: admin moves a member to any group (bypasses join mode) or to the pool (= kick); change is live everywhere.

**E3S3 Dissolve** — FR-5.3, CAP-5
- Acceptance: dissolve-all returns everyone to pool; per-group dissolve works; activity feed records it.

**E3S4 Freeze/unfreeze** — FR-5.4, CAP-5
- Acceptance: toggle from live view; frozen state visible on all screens.

**E3S5 CSV export** — FR-5.5, CAP-5, AD-8
- Acceptance: export includes group, member name, email, and every configured field as a column; blanks omitted where optional; works for archived sessions.

**E3S6 Activity feed** — FR-5.6, CAP-5
- Acceptance: join/leave/create/dissolve/move events with timestamps, visible to admin.

**E3S7 Projection hotkeys** — FR-5.7, ADOPT(Mentimeter)
- Acceptance: admin live view hotkeys toggle join-info panel and hide/show board.

## Epic E4 — Flexibility Systems (config, fields, permissions, extensions)

**E4S1 Session config object** — FR-1.2, CAP-7, AD-4
- Acceptance: one validated config structure (rules / fields / perms / extensions); one resolver; rules changes apply live; adding a setting = config change only.

**E4S2 Fields system** — FR-4.4, CAP-6, AD-8
- Acceptance: admin adds text field (required, on card, in CSV, filterable); appears on group create/edit, board card, search, and CSV — no migrations.

**E4S3 Permission engine** — FR-6.1, FR-6.4, CAP-7, AD-5
- Acceptance: `can?(action, role)` resolves session override → role default → system default; UI renders only server-computed allowed actions.

**E4S4 Delegation toggles** — FR-6.2, FR-6.3, FR-6.5, CAP-7
- Acceptance: admin toggles `set group size` and `fill group fields` for leaders; leader-set size never exceeds session max; changes apply live.

**E4S5 Extensions framework** — FR-7.1, FR-7.2, CAP-8, AD-9
- Acceptance: extension registry + hook contract wired into session events; config-driven enablement; core code contains no extension references; no modules ship yet.

## Epic E5 — Reliability & UX Shell

**E5S1 Server-status UX** — FR-8.1, FR-8.2, CAP-9, AD-11
- Acceptance: Reverb drop → "reconnecting" then "server offline" banner within ~5s; /health heartbeat fallback; reconnect → snapshot resync.

**E5S2 Mobile-first shell** — NFR-2, CAP-9
- Acceptance: shadcn/ui theme + lucide icons; participant flows fully usable at 360px width; admin readable on projector (large type).

**E5S3 "Coming next" section** — FR-7.4
- Acceptance: app shows roadmap items (chat, approvals, proxy, quiz…); links/notes only, no dead interactions.

**E5S4 Accessibility pass** — NFR-3
- Acceptance: keyboard-operable admin controls; non-color-only state changes; reduced-motion honored; contrast passes on projection.

## Epic E6 — Deploy & Ops

**E6S1 Docker dev environment** — AD-2, AD-10
- Acceptance: `docker compose up` runs Laravel 13 + Vite + Reverb + SQLite; hot reload works.

**E6S2 Reverb + queue** — AD-6, AD-10
- Acceptance: broadcast driver env-driven (reverb default); database queue + one worker deliver events.

**E6S3 Dokploy deploy** — AD-10
- Acceptance: app live at groupify.dxtechph.online with SSL; WebSocket upgrade proxied correctly.

**E6S4 End-to-end smoke** — SPEC success signal
- Acceptance: facilitator creates session; 20+ classmates join by QR/PIN; groups form with required "Chosen topic"; CSV exports group/name/topic; live updates ≤1s; server kill shows offline banner, recovery resyncs.

---

## Epic E7+ — Preserved vision (not detailed; roadmap.md owns these)

Approval queue & applicant UI · chat tiers + announcements · moderation (kick/ban, global ban, ghost-GC, ownership transfer) · extensions shelf UI · activity/attendance report export · session config templates · proxy mode + bulk importer · auto-dissolve · match-me · device binding · group quiz extension · guest lists/gated entry · anonymous mode · async sessions · custom roles · PWA shell · offline resilience (needs design pass) · retention policy · presenter remote · avatar identity.
