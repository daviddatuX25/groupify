# Groupify — Comparable-Product Interface Research

Source: `InterfaceResearch` scout (web research, 2026-08-14, 13 products).
Purpose: evidence base for PRD validation; patterns tagged ADOPT / CONSIDER / REJECT.

## Products covered

Kahoot, Blooket, Quizizz/Wayground, Jackbox, Slido, Mentimeter, AhaSlides,
Team Shake, Team Picker Wheel + web generators, OpenSpace/unconference, Zoom
breakouts, Gather + Wonder.me, Plickers, Wordwall.

## Join flows & codes (reference)

| Product | Code | Entry URL | Account needed |
|---|---|---|---|
| Kahoot | numeric PIN (7 digits) [INFERENCE] | kahoot.it | no |
| Quizizz | 6-digit | joinmyquiz.com | no |
| Blooket | 6-digit Game ID | play.blooket.com | no |
| Jackbox | 4-char alphanumeric, case-sensitive | jackbox.tv | no |
| Slido | 7-digit, shown as `#code` | slido.com | no |
| Mentimeter | 8-digit | menti.com | no |
| AhaSlides | URL slug | ahaslides.com/<code> | no |
| Team Picker Wheel | join link | hosted page | no |
| Zoom | none (meeting ID/roster) | — | sign-in for pre-assign |
| Team Shake / Plickers / Wordwall | none / link / link | app / web | host only |

Winner pattern: **short numeric code + QR prefill + persistent join URL**
(Mentimeter/AhaSlides); resume-by-identity rejoin (Quizizz best-in-class);
reject 4-char case-sensitive codes (Jackbox — O/0 ambiguity).

## Participant UI patterns

- Kahoot: live name-level lobby presence; click-to-kick; nickname generator; reduced-motion podium.
- Blooket: avatar identity; random-names toggle.
- Jackbox: phones as input devices, TV as board; audience overflow bucket.
- Slido/Mentimeter: audience screen mirrors presenter; results live on main screen.
- AhaSlides: leaderboard snapshot-refreshes on navigation (cheap-refresh design).
- OpenSpace: **board = time × room grid; empty cells = open slots; self-post sessions** — the closest metaphor to a live grid board.
- Zoom breakouts: room assignment + countdown + "Return to Main Session".
- Gather/Wonder: spatial self-grouping (Wonder shut down 2023; legacy lives on).

## Admin dashboard patterns

- Kahoot: live player list, click-to-kick, reports stored indefinitely, XLSX export.
- Quizizz: per-student progress, reopen-for-absentees.
- Slido: moderation queue ("In review"), anonymous-with-host-identity, per-participant XLSX export.
- Mentimeter: presenter hotkeys (`i` join info, `h` hide results), phone remote.
- Zoom: move participants mid-session, broadcast banner, auto-close timers.
- Team Shake: constraints editor (buddies/avoid-pairs, absent toggle, balancing).
- Wooclap group maker: free, no login, CSV/PDF export.

## Session lifecycle

- Kahoot: live PIN expires on session end; reports kept indefinitely.
- Mentimeter: numeric code expires ~48h idle; QR/link keep working; historical sessions.
- Slido: code tied to event dates; retention policy knob (default 365d, min 1d).
- Quizizz: reopen ended sessions.
- Zoom: breakouts cease on meeting end.

## Realtime behavior

- Kahoot: WebSockets; reconnecting overlay; manual refresh can reset score (cautionary tale).
- Quizizz: **best rejoin — same name + code restores prior state**.
- Gather: audio/video degrade gracefully with proximity.
- None of the studied tools offer offline/PWA playback — open gap (CAP-14).

## Grouping mechanics matrix

| Product | Mechanic | Admin override? | Metadata |
|---|---|---|---|
| Kahoot Team | auto-assign (manual paid) | paid only | team names |
| Quizizz Team | auto-assign 2–8 teams | team count/size | collective score |
| Zoom breakouts | auto/manual/pre-assigned | full | room names, CSV roster |
| Team Shake | auto-random w/ constraints | full | buddies, skill, absent flags |
| Team Picker Wheel | self-join → auto-assign | count/size | balancing labels |
| OpenSpace | self-select sessions | grid only | title, host, room+slot |
| Gather/Wonder | spatial self-grouping | space design | area labels |

**Market gap (validates the wedge):** nobody combines live join-by-code +
admin-controlled grouping constraints + per-group custom fields +
ephemeral-then-archived lifecycle + self-hosting.

## Patterns to adopt

**ADOPT**
- Short numeric code + QR prefill + persistent join URL
- Resume-by-identity rejoin (Quizizz)
- Name-level presence + click-to-kick (Kahoot)
- OpenSpace grid as the board (open/closed slots)
- Countdown + broadcast banner (Zoom) — phase the session
- Move/dissolve/freeze as grid clicks (Zoom/Kahoot)
- Constraints engine (Team Shake) — opt-out/avoid-pairs, per-participant
- Post-session export (CSV/XLSX, aggregate + per-participant)
- Session archive + explicit retention (Slido policy knob)
- Anonymous mode with host-side identity (Slido)
- Presenter hotkeys (Mentimeter)

**CONSIDER**
- Join-instruction bar pinned on every screen (AhaSlides)
- Moderation queue (Slido) — only once chat exists
- Snapshot-refresh instead of continuous push (AhaSlides)
- Audience overflow bucket (Jackbox) → unassigned pool
- Self-paced/async mode (Quizizz/Wordwall)
- Avatar/visual identity (Blooket)
- Spatial self-move grouping (Gather/Wonder)

**REJECT**
- 4-char case-sensitive codes (Jackbox)
- Auto-assign without admin override (Kahoot free)
- Login-required participation (Zoom pre-assign)
- Points/leaderboard as the core loop (gamification → extension)
- 2D spatial map as default board (opt-in mode at most)

## Use cases beyond the original vision

1. Attendance & engagement tracking (join-time, presence duration, group-hopping → reportable log)
2. Timer-driven phases ("join a group in 60s" → auto-freeze)
3. Gated entry / guest lists (passcodes, pre-allowed names, seat limits)
4. Self-paced asynchronous sessions (reopen for absentees)
5. Anonymous / nicknamed modes (host retains identity)
6. Session templates & reuse (save config, replay)
7. Roster import (pre-seed participants from CSV)
8. Presenter remote control (second device drives board)
9. No-device participation (proxied presence — cousin of proxy mode)
10. Accessibility (prefers-reduced-motion, high-contrast join flow)

## Source links

Kahoot join: https://support.kahoot.com/hc/en-us/articles/4409807867539
Quizizz sessions: https://help.wayground.com/support/solutions/articles/158000404965
Blooket: https://play.blooket.com
Jackbox join: https://support.jackboxgames.com/hc/en-us/articles/15794759479959
Slido join/moderation/retention: https://community.slido.com (join 472, Q&A 477, retention 1814)
Mentimeter code validity: https://help.mentimeter.com/en/articles/2780681
AhaSlides sharing/auth: https://help.ahaslides.com/portal/en/kb/articles/sharing-a-presentation-to-your-participants
Team Picker Wheel: https://pickerwheel.com/tools/random-team-generator/
Team Shake: https://www.rhine-o.com/www/iphone-apps/team-shake/
OpenSpace: https://unconference.net/methods-2/ · https://martinfowler.com/bliki/OpenSpace.html
Zoom breakouts: https://support.zoom.com/hc/en-us/articles/206476313
Wonder legacy: https://blog.veertly.com/wonderme-shutdown-alternatives
Plickers: https://help.plickers.com/hc/en-us/articles/360009395854
Wordwall: https://wordwall.net
Wooclap group maker: https://tool.wooclap.com/en/free-group-maker
