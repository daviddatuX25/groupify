---
title: Groupify — UI/UX Sound, Motion & Avatar Plan
status: implemented
created: 2026-08-16
updated: 2026-08-16
---

> Status: P0 core loops + P1 depth delivered 2026-08-16 (sounds, motion,
> avatar layers, avatar hub, mute toggle, hotkey feedback). Deferred from
> this pass: tab crossfade wrapper (remount risk), mobile-nav layoutId,
> saved-room list stagger, scan-dialog state transitions, countdown pulse,
> focus rings — all P2 cosmetic, tracked in the audit tables below.

# UI/UX Enrichment Plan — Sound (snd-lib) · Motion (motion.dev) · Avatars (DiceBear)

Strategic plan for layered feedback across every page and feature. **No
implementation in this document** — it is the bounding + placement map for
story work. Stack decisions are grounded in the current codebase.

## Ground truth (verified 2026-08-16)

- **snd-lib** — not installed. Library is MIT; audio assets free for
  commercial/non-commercial use (copyright stays with the credited sound
  designer). API: `new Snd()`, `snd.play(Snd.SOUNDS.TAP)`, three kits
  (`SND01 sine`, `SND02 piano`, `SND03 industrial`), CSS-class easySetup
  (`snd__button`, `snd__select`, `snd__toggle`, `snd__type`, …), built-in
  mute + auto-mute on window blur + Web Audio init on first pointer event.
- **motion.dev** — already a dependency (`motion@^13.1.0`) and used in two
  places only: `welcome.tsx` (pointer spotlight, header entrance) and the
  `Admin/New.tsx` step cards (`animated`). **Zero motion on the two core
  interactive pages** (`Admin/Show`, `Session/Show` — 0 matches).
- **DiceBear** — already the avatar engine: `lib/avatars.ts` renders
  `api.dicebear.com/9.x/{initials|lorelei|adventurer|bottts-neutral}/svg`
  seeded per participant. No presentation layer (presence/leader/state), and
  `AvatarProfileDialog` (the customization UI) is orphaned — see
  `docs/reviews/e2e-found-bugs.md` #7.
- **Toasts** — sonner just landed (this session): `components/ui/sonner.tsx`,
  mounted in `app.tsx`, wired to admin actions + participant mutations.

## Design principles (binding)

1. **Causality** — every sound/motion is caused by a user action or a server
   event. Never ambient/background music; never on page load.
2. **Restraint** — quiet by default. Master volume ~0.3; short sounds
   (<300ms); no loops except where a real wait exists (bulk creation).
3. **Consistency** — one sound per semantic class, one motion per component
   class. The tables below are the single source of truth.
4. **Accessibility** — `prefers-reduced-motion` disables motion (motion.dev
   `MotionConfig reducedMotion="user"`); a persisted **mute toggle**
   (localStorage `groupify.sound_enabled`) silences all sounds; snd-lib's
   window-blur auto-mute stays on. Sounds never carry sole meaning —
   toasts/visuals always mirror them.
5. **Performance** — sprites loaded once (snd-lib kits are single-file
   audio sprites); motion only animates transform/opacity; `will-change`
   sparing.

## 1. Sound design system (snd-lib)

**Kit:** `SND01 "sine"` default — synthetic, subtle, matches the dark neon
Kinetic brand. Kit is a user preference (snd-lib supports switching at
runtime); store in localStorage.

**Volume policy:** master 0.3; `tap`/`type` at 0.5 relative; `caution` at
0.45; `celebration` at 0.4. Mute toggle in the app header (both admin +
participant), persisted.

**Semantic map — event → sound:**

| Semantic | snd-lib key | Fires on |
|---|---|---|
| Generic click | `tap` | pool chips, tab dots, list items, dot-nav, close buttons |
| Functional press | `button` | Enter room, Create group, Join, Save, Freeze, Dissolve, Export, Match me, kick, approve/reject |
| Selection | `select` | wizard mode pick, group-size mode, destination select, role select, capacity radio |
| Switch | `toggle_on/off` | perms matrix, plugin toggles, config toggles, QR-pinless, saved-room bookmark |
| Typing | `type` | join name, PIN, code entry, board search (NOT room chat — typing sounds in chat are noise) |
| Modal open/close | `transition_up/down` | GroupCreateDialog, MemberActionDialog, ScanRoomDialog, AvatarProfileDialog, group detail |
| Step/wizard move | `swipe` | setup wizard step transitions, tab switches |
| Achievement | `celebration` | group formed (auto-named Team Alpha…), match-me success, auto-distribute done, session created |
| Alert (incoming) | `notification` | pending join request (approval mode), moderated message queued, announcement received |
| Error | `caution` | join blocked (banned/frozen/guest-list/wrong PIN), failed action toast, validation errors |
| Disabled | `disabled` | pressed disabled button (full group join, disabled toggles) |
| In-flight (rare) | `progress_loop` | bulk group creation (>1s), quiz grading — stop on completion |

**Wiring:** imperative `snd.play(...)` at the action handlers (toasts already
have one choke point per page — the same handlers call sounds), NOT the CSS
class easySetup (classes can't gate on server success/failure). Init once in
`app.tsx` alongside the sonner Toaster; the snd-lib instance lives in
`lib/sound.ts` with the mute toggle.

## 2. Motion design system (motion.dev)

**Tokens** (align with Kinetic brand — `docs/brand/brand-context.md`):

| Token | Value | Use |
|---|---|---|
| `dur-fast` | 120ms | chips, dots, focus rings |
| `dur-base` | 220ms | cards, toasts-adjacent, hover lifts |
| `dur-slow` | 350ms | dialogs, page/section transitions |
| `ease-out` | `[0.22, 1, 0.36, 1]` (easeOutQuint-ish) | entrances |
| `spring` | `{ stiffness: 380, damping: 30 }` | layout + presence pulses |
| MotionConfig | `reducedMotion="user"` | global a11y gate |

**Component-class → animation map:**

| Class | Pattern |
|---|---|
| Group cards | `motion.div layout` — reflow on create/join/leave/kick; slot dots spring-fill; card entrance `opacity 0→1, y 8→0` |
| Membership flash | upgrade the existing flash state to a `layout` spring + ring pulse on the card; leave = fade/shrink-out via AnimatePresence |
| Pool chips | AnimatePresence enter (scale 0.9→1 + fade) / exit (scale→0.8 + fade); presence dot `animate={{ scale: [1, 1.3, 1] }}` pulse while online |
| Dialogs | scale 0.94→1 + fade enter, reverse exit (base-ui triggers already exist; wrap with motion) |
| Tabs (admin) | content crossfade + 8px slide on tab switch |
| Wizard (Admin/New) | AnimatePresence slide between steps (currently static swap) |
| Toasts | sonner's built-in motion — leave as-is |
| Presence count | number tick (quick y-slide on change) |
| Avatar | hover lift + slight scale; join = pop-in with ring; leader badge spring entrance |
| Mobile nav | active-tab indicator via `layoutId` spring |
| QR card | idle: none (restraint); on new join: 1 pulse of the code |
| Join success | screen-level transition into the board (brief fade) — NOT confetti |

## 3. Avatar system (DiceBear)

Already integrated — the plan **expands** it, doesn't add a new library:

- **Style shelf** (via the orphaned AvatarProfileDialog, which becomes the
  avatar hub): keep `initials|lorelei|adventurer|bottts-neutral`, add
  `fun-emoji`, `notionists`, `micah`, `open-peeps`, `pixel-art` (all
  supported by the same 9.x API; server-side validation in
  `ParticipantProfileController` must extend the allow-list to match).
- **Presentation layers** (Session/Show + Admin/Show `ParticipantAvatar`):
  - presence ring: green pulse when online (ties to the live presence count)
  - leader badge: crown/star chip (currently a text "lead" tag)
  - pooled vs grouped state: subtle ring color
  - banned: desaturated + opacity
  - joined-flash: ring pop on membership change
- **Seed flow**: seed input already exists in AvatarProfileDialog — wire the
  dialog (bug #7 fix) so participants can reach it from their profile card.
- **Determinism**: same seed → same avatar across devices (already true —
  keep; document as a feature).

## 4. Per-page audit — feedback recipes

Legend: M = motion pattern (§2), S = sound (§1), P0/P1/P2 = priority tier.

### welcome (home)
| Feature | M | S | P |
|---|---|---|---|
| Saved-room list | enter/exit stagger on save/remove | `select` on open, `transition_up` on remove | P1 |
| Join-by-code input | focus ring | `type` | P1 |
| Invalid code | shake? no — error text + `caution` | `caution` | P1 |
| QR scan affordance → dialog | dialog scale enter | `transition_up` + camera `button` | P2 |
| Pointer spotlight (exists) | keep | — | — |

### Admin/New (setup wizard)
| Feature | M | S | P |
|---|---|---|---|
| Step transitions | slide via AnimatePresence (new) | `swipe` | P1 |
| Mode/duration/retention pick | radio ring spring | `select` | P1 |
| Create room | button press + page fade | `celebration` (session born) | P1 |

### Session/Join
| Feature | M | S | P |
|---|---|---|---|
| PIN + name typing | — | `type` | P1 |
| Wrong PIN / banned / frozen / guest-list | error box entrance | `caution` | P0 |
| Auto-rejoin "Checking your seat" | spinner (exists) | none (quiet) | P2 |
| Save room bookmark | icon spring | `toggle_on/off` | P2 |

### Session/Show (participant) — the core page, currently motion-less
| Feature | M | S | P |
|---|---|---|---|
| Group card create/join/leave/kick | `layout` reflow + flash ring | `celebration` (formed) / `button` (join) | **P0** |
| Pool status chip | presence pulse | `tap` | P0 |
| Match me | card fly-to-group via `layout` | `celebration` | P1 |
| Chat drawer open/close | height/opacity transition | `transition_up/down` | P1 |
| Message send / receive | new-message slide-in | `tap` (send), `notification` (announcement) | P1 |
| Group detail dialog | scale enter | `transition_up` | P1 |
| Quiz card | answer pick ring | `select` + `celebration` on grade | **deferred** (quiz plugin deprioritized) |
| Session ended ("gone") | full-screen fade-in of the ended state | `notification` (once) | P1 |
| Late-join banner | slide-down entrance on page load | none | P2 |
| Auto-dissolve countdown | pulse the timer when <60s | none | P2 |
| Presence count tick | y-slide number on change | none | P2 |
| Mobile nav active tab | `layoutId` spring | `tap` | P2 |
| Avatar (self) | hover lift, profile hub link | — | P1 |

### Admin/Show — the other core page, also motion-less
| Feature | M | S | P |
|---|---|---|---|
| Group creation (single/bulk) | card entrance stagger; bulk = progress | `celebration` + `progress_loop` while bulk in flight | **P0** |
| Participant move/role/ban | card/chip `layout` reflow | `button` + toast | **P0** |
| Freeze/unfreeze/dissolve | header state chip pulse | `toggle_on/off` (freeze), `caution` (dissolve confirm) | P0 |
| Tab switches (grid/config/perms/plugins/chat/templates) | crossfade + slide | `swipe` | P1 |
| Moderation queue arrival | queue item slide-in | `notification` | P1 |
| Announcement send | toast (exists) | `button` + `notification` on receive | P1 |
| Pending request (approval) | row pulse on arrival | `notification` | P1 |
| Export | — | `button` | P2 |
| Auto-distribute | cards fly via `layout` | `celebration` | P1 |
| Leader transfer (API-only today) | crown spring on new leader | `select` | P2 |
| Banned participant | avatar desaturate | `caution` | P1 |
| Cards/table view toggle | segmented control spring | `select` | P1 |
| Board search + "OPEN ONLY" filter | result list crossfade on query change | `type` (search) | P1 |
| Bulk-select bar (Move/Role/Ban) | slide-up entrance when selection > 0 | `button` | P0 |
| Projection hotkeys `i`/`h` | toast flash on toggle (currently silent) | `select` | P1 |
| FROZEN state chip | slow pulse while frozen | `toggle_off` on freeze | P1 |
| Join-info panel toggle | crossfade | `toggle_on/off` | P2 |
| Header live stats (presence/pool counts) | number tick on change | none | P2 |

### Components (cross-page)
| Feature | M | S | P |
|---|---|---|---|
| GroupCreateDialog / MemberActionDialog / ParticipantActionDialog | scale enter/exit | `transition_up/down` | P0 |
| ScanRoomDialog | scale enter + camera idle | `transition_up` | P2 |
| AvatarProfileDialog (orphaned → wire) | scale enter | `transition_up` + `select` on style pick | P1 |
| ServerStatus | offline/online chip pulse | `caution` on offline | P1 |
| Toaster (sonner) | built-in | sounds at the same call sites as the toasts | P0 |

### Systemic states (cross-page, easy to miss)
| Feature | M | S | P |
|---|---|---|---|
| ServerStatus offline → reconnecting → back | banner slide-down on degrade, pulse while offline, fade-out on recovery | `caution` ONLY on the offline transition (not every heartbeat retry) | P0 |
| Avatar image failure → initials fallback | crossfade swap | none | P2 |
| Presence ring (participant online/offline) | green pulse on join, dim on leave | none | P1 |
| ComingNext "Shipped" chips | stagger entrance on page load | none | P2 |
| Session-deleted ("ended") screen | fade-in | `notification` | P1 |
| ScanRoomDialog scan states (starting/scanning/unsupported/denied/error) | state chip transitions; camera-feed vignette pulse while scanning | `transition_up` open, `caution` on denied/unsupported | P2 |
| Late-join banner (both pages) | slide-down entrance | none | P2 |
| Keyboard focus rings | motion `whileFocus` scale 1.02 | none | P2 |

## 5. Priority tiers & rollout

- **P0 — core loops** (next story batch): sounds + motion on join/group
  create/join/leave/kick, dialogs, admin participant actions, freeze/dissolve,
  toasts↔sounds pairing, bulk-select bar, ServerStatus offline transition.
  Value: the two core pages go from silent/static to alive.
- **P1 — depth**: wizard + tabs transitions, chat + moderation notification
  sounds, avatar presentation layers + AvatarProfileDialog wiring, match-me
  + auto-distribute celebrations, mute toggle in headers, presence pulses,
  hotkey feedback, search/filter + table-view motion.
- **P2 — polish**: scan dialog states, mobile nav, extra avatar styles
  (+ server allow-list), saved-room list motion, session-ended state,
  countdown pulse, focus rings.
- **Deferred (not prioritized)**: quiz plugin sounds/motion entirely —
  the quiz extension is out of scope for this enrichment work. Its rows stay
  in the audit tables for traceability but are not planned for delivery.

## 6. Rollout mechanics

1. **Infra story (P0)**: `lib/sound.ts` (snd-lib init + `play()` wrapper +
   mute toggle), MotionConfig in `app.tsx`, `useReducedMotion` guards.
2. Per-page stories follow the audit tables — one page per story, each with
   acceptance = the M/S columns for its features.
3. **Verification**: extend the e2e suite —
   - sound: assert `snd.play` is invoked on the key actions (instrument via
     a window hook in tests; no audio needed in CI — headless browsers don't
     output audio);
   - motion: assert the motion elements mount (`data-motion` attributes) and
     reduced-motion mode renders the final state (opacity/transform terminal
     values via `toHaveCSS`);
   - avatar: DiceBear URL assertions already exist implicitly — extend for
     new styles + presentation rings.
4. **Non-goals**: no ambient/background audio, no game-style sound design, no
   confetti, no full-page route transitions beyond fades, no new avatar
   library (DiceBear stays), no sound on page load.

## Traceability

- Sound vocabulary: snd-lib README (MIT; audio free for commercial use).
- Motion: motion.dev v13 (already a dependency) — `MotionConfig
  reducedMotion="user"` is the a11y gate.
- Avatars: DiceBear 9.x HTTP API (already in `lib/avatars.ts`).
- Related open bugs: AvatarProfileDialog wiring + avatar-style allow-list
  (e2e-found-bugs #7), moderation queue sounds depend on the queue-refresh
  fix (e2e-found-bugs #4) for correct causality.
