# Groupify — Brand & Design System ("Kinetic")

Source: user-provided UI mockups (2026-08-14) — Participant Live Room + Facilitator
Admin Dashboard. This is the binding visual contract for all UI work; story 5-2
(mobile shell) implements it.

## Identity

- Name: **Groupify** (locked placeholder; subdomain groupify.dxtechph.online)
- Design language: **Kinetic** — dark, electric, glassy. Live event energy:
  glowing status, tactile press feedback, ambient color fields.
- Logo: AI-generated placeholder in the mockups; USER finalizes later — shell
  must accept a drop-in logo asset, never hardcode the placeholder URL.
- Theme: **dark-only** (html.dark). No light theme designed; do not invent one.

## Color tokens (Tailwind config values, verbatim)

| Token | Hex | Use |
|---|---|---|
| primary | #4edea3 | actions, filled states, LIVE, lead markers |
| primary-container | #10b981 | primary fills |
| on-primary | #003824 | text on primary buttons |
| electric-cyan | #06B6D4 | info, search focus, live accents, QR |
| neon-pink | #EC4899 | PIN displays, FULL badges, alerts |
| background / surface | #0e1511 | page + surfaces |
| deep-ink | #0F172A | text-on-cyan buttons (Auto-Distribute) |
| slate-ground | #0B0F1A | admin canvas background |
| surface-container | #1a211d | cards, chips, pills |
| surface-container-high / -low | #242c27 / #161d19 | elevation steps |
| surface-variant | #2f3632 | hover fills |
| glass-border | rgba(255,255,255,0.1) | all borders |
| on-surface | #dde4dd | primary text |
| on-surface-variant | #bbcabf | secondary text |
| outline / outline-variant | #86948a / #3c4a42 | muted lines, empty slots |
| tertiary | #ffb3af | special chips (e.g. Emma), warn accents |
| tertiary-container / error-container | #fc7c78 / #93000a | destructive fills |
| error | #ffb4ab | destructive text/borders |
| error-container | #93000a | destructive button fill |

Ambient background: fixed radial gradients — cyan top-right, pink bottom-left,
~0.1 alpha, 400px radius (admin canvas).

## Typography

| Style | Font | Size/Line/Weight | Notes |
|---|---|---|---|
| display | Plus Jakarta Sans | 48/56/800, -0.03em | hero (admin H1) |
| headline-lg | Plus Jakarta Sans | 32/40/700, -0.02em | page titles |
| headline-lg-mobile | Plus Jakarta Sans | 24/32/700 | mobile titles |
| headline-md | Plus Jakarta Sans | 20/28/600 | card titles, section headers |
| body-lg | Inter | 18/28/400 | reading text |
| body-md | Inter | 16/24/400 | default body |
| label-md | JetBrains Mono | 14/20/600, +0.05em | buttons, nav, stat labels — UPPERCASE where styled |
| label-sm | JetBrains Mono | 12/16/500 | meta, member names, captions |

Google Fonts: Plus Jakarta Sans, Inter, JetBrains Mono, Material Symbols Outlined (icons).

## Radii & spacing

- Radii: DEFAULT 1rem · lg 2rem · xl 3rem · full. Cards/buttons = 1rem; pills = full.
- Spacing tokens: gap-xs .5rem · gap-sm 1rem · gap-md 1.5rem · gap-lg 2rem ·
  card-padding 1.25rem · margin-page 2.5rem.

## Motion & interaction

- `kinetic-flash`: :active scale 0.95–0.98 + glow ring — primary buttons, chips.
- `tactical-btn`: hover shine sweep (45° gradient translate) — admin controls.
- Slot dots: filled = primary glow (`0 0 8px`), empty = outline border; transitions 0.3s.
- Card hover: border-primary + top gradient bar reveal (h-1, primary→cyan, glow).
- Join/leave flashes must honor `prefers-reduced-motion` (NFR-3) — kinetic effects
  are decorative, never the only state signal.

## Component inventory (from mockups)

Participant:
- TopAppBar: logo + wordmark, LIVE pulse dot + badge, PIN pill (neon-pink).
- Status bar: avatar chip ("Maya (You)"), pool status dot, "Create New Group".
- Controls: search field (cyan focus ring), "Open slots only" checkbox.
- Group card: slot dots (filled/empty), Topic line, members pill, JOIN TEAM
  (primary, glow shadow); FULL state: strikethrough name, neon-pink FULL badge,
  disabled Closed button.
- BottomNavBar (mobile): Live Room / My Group / Settings.

Facilitator:
- TopAppBar: nav (Dashboard / Live Grid / Session History / Admin Controls —
  active item cyan + underline glow), Online count pill, PIN.
- Bento header: QR card (Scan to Join + Session code) + controls row
  (Freeze / Dissolve / Export) + stat tiles (PIN, Topics Set, In Pool, Groups).
- Live Groups grid: leader shield icon, member list, FULL glow card,
  EMPTY dashed card ("Pending Topic Assignment…" + Empty Canvas).
- Unassigned Pool docked footer: count pill, chips (drag cursor; status dot
  colors: primary = unassigned, tertiary = flagged), "Auto-Distribute" button
  (cyan → deep-ink text), "+ N more…", scrollbar-hide.

## Rules

- Dark-only; mono labels uppercase; pill/glass surfaces everywhere.
- Never color-only state (accessibility): FULL/EMPTY/LIVE carry text + shape.
- New UI follows these tokens; shadcn/ui components must be themed to them
  (CSS variables → these hex values), not used with defaults.
- Logo placeholder must be replaceable without code changes.
