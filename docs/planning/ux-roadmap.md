# Groupify — UX Roadmap (2026-08-15)

## Status

P0-1, P0-2, and P0-3 are shipped in the current UX slice: group detail drawer with embedded group chat, discoverable messaging enabled by default for new sessions, and bite-size configuration hints. The remaining P1/P2 items stay on the shelf.

> Post-v1.1.0 improvement plan from real usage feedback. Priorities:
> **P0** = blocks comprehension/usage · **P1** = quality of life · **P2** = polish.

## P0-1 · Group detail view ("go inside a group")

Today a group is a card only — no interior. Plan: tapping a group opens a
detail panel/drawer (desktop: right sheet; mobile: full screen, also reachable
from the bottom-nav "My Group" tab).

```
┌────────────────────────────────────────────────────────┐
│ ◀ All groups                     Team Alpha ●●●○        │
│ ┌ TOPIC ──────────────────────────────────────────────┐ │
│ │ Chosen topic: AI for classrooms        [Edit (lead)]│ │
│ └─────────────────────────────────────────────────────┘ │
│ MEMBERS (4/5)                      leader: Maya  🛡      │
│   ● Maya (lead)         ● Leo            ● Ana   ● Ben  │
│   [kick] per member (leader only) · [transfer lead]     │
│ ── GROUP CHAT ───────────────────────────────────────── │
│   Maya: "meeting at 3?"              (live, no refresh)  │
│   [message your group…                    ]  [Send]      │
│ ── STATUS ───────────────────────────────────────────── │
│   Quiz: answered ✓ · 10 pts          Pending: Leo (join) │
│   [✓ approve] [✕ reject]                                │
│ [Join Team] / [Leave Team]                               │
└──────────────────────────────────────────────────────────┘
```

Scope: one route/view + navigation from cards, bottom nav, and notifications.

## P0-2 · Messaging that feels present

Chat exists but hides behind a collapsed toggle + a config flag. Plan:
- Persistent **chat dock**: right sidebar on desktop, bottom sheet on mobile,
  with an unread badge — never collapsed by default when enabled.
- Group chat lives INSIDE the group view (P0-1) — not a separate input below
  the board.
- Admin gets a "Communication" strip: announcements + moderation queue +
  room chat, always visible when the plugin is on.

```
desktop                             mobile
┌──────────────┬───────┐            ┌────────────────┐
│ board        │ 💬dock│            │ board          │
│              │ Maya  │            │ …              │
│              │ Leo   │            ├────────────────┤
│              │[msg… ]│            │ 💬 room · group│
└──────────────┴───────┘            └────────────────┘
```

## P0-3 · Bite-size explanations on every knob

New users can't decode Configuration/Permissions. Plan: every setting carries a
one-line "what/why" hint — plain English, example included. Pattern:

```
Allow participants to create groups      [ON]
  ⓘ If ON, anyone in the pool can start a team. If OFF, only the host creates
    and assigns groups.

Permission gate: approve_join
  ⓘ Leaders may accept or reject people asking to join their team.
     admin ●   leader ●   member ○
```

Same treatment for: join mode, anonymous mode, chat modes, auto-dissolve,
guest list, fields (each attribute), plugin toggles (already have blurbs —
keep, shorten), quiz options. Implementation: a `Hint` component (icon + copy)
under each control; copy table in one file so wording stays consistent.

## P1-4 · First-run host checklist

After creating a session, the admin sees a dismissible checklist:
```
Session is live ✓
□ Show the QR/PIN to the room (it's on your Live Grid)
□ Enable chat?  [Plugins → enable]   (1 min)
□ Want a quiz later? [Plugins → Group Quiz]
```
One time per session, dismissible, links deep into each tab.

## P1-5 · Empty states that teach

- No groups: "Create one or run Auto-Distribute →" (button).
- Pool empty: "Share the QR — joiners land here."
- No fields: "Add a field like 'Chosen topic' →" (link to Configuration).

## P2-6 · Small polish

- Session code + PIN copy button in the join card.
- Undo for accidental dissolve (5s snackbar).
- "Leader" shield icon (Material `shield`) instead of text tag.
- Toast notifications for admin actions instead of silent refetch.

## Notes on scope

- P0-1 + P0-2 together are the biggest lift (new view + dock) — worth doing as
  one slice since the group chat lives inside the group view.
- P0-3 is pure copy + one component — cheapest, highest comprehension win;
  do it first.
