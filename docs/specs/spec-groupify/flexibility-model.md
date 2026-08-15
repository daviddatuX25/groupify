# Groupify — Flexibility Model

Flexibility is the core driving purpose (locked decision). Three session-scoped
systems compose it; grouping logic is the never-changing core.

## 1. Permission engine (CAP-7)

### Roles
`admin` (session creator) · `leader` (group creator) · `member` · `co-host` (later) · `custom roles` (CAP-16)

### Default matrix (per session, admin-editable)

| action               | admin | leader | member | co-host ▸ |
|----------------------|:-----:|:------:|:------:|:---------:|
| create group         |   ✓   |   ✓    |   ✓    |     ✓     |
| set group size       |   ✓   |   ▣    |   –    |     ✓     |
| approve join         |   ✓   |   ✓    |   –    |     ✓     |
| move members         |   ✓   |   –    |   –    |     ✓     |
| dissolve all groups  |   ✓   |   –    |   –    |     ✓     |
| fill group fields    |   ✓   |   ✓    |   ▣    |     ✓     |
| announce      ▸      |   ✓   |   –    |   –    |     ✓     |
| kick & ban    ▸      |   ✓   |   ✓    |   –    |     ✓     |
| export CSV           |   ✓   |   –    |   –    |     ✓     |

▣ = delegated on · – = off

### Resolution order
```
can?(action, role):
    session override → role default → system default
```
Delegation is always bounded: a leader's `set group size` still respects session
hard limits (min/max). Delegation changes one session, never the system default.

### Data shape (night-one)
`session_permissions: { action → { role → on/off } }` merged over
`role_defaults: { action → { role → on/off } }`. One source of truth for every
UI affordance: an action is hidden or shown by `can?(action, role)`.

## 2. Fields system (CAP-6)

Per-group metadata defined by the session admin.

| attribute     | night-one | later         |
|---------------|-----------|---------------|
| types         | text      | choice, number|
| required      | ✓         | optional      |
| filled by     | leader    | members ▸     |
| on card       | ✓         | toggle        |
| in CSV        | ✓         | toggle        |
| filterable    | ✓         | toggle        |

Surfaces: group create/edit form · board card · board search · CSV export.

## 3. Extension taxonomy (CAP-8)

| layer      | definition                                             |
|------------|--------------------------------------------------------|
| **Core**   | always-on grouping: session, join, pool, grid, groups, admin controls, fields, permissions |
| **Plugins** | session-toggled modules — ONE term, two origins: |
|            | — Communication: chat tiers, announcements            |
|            | — Formation: approval queue, proxy mode, auto-dissolve, match-me |
|            | — Trust: device binding, moderation, ghost-group GC    |
|            | — Data: retention policy, export                       |
|            | — Event: group quiz, timers                           |
|            | — `first_party`: in-built with Groupify            |
|            | — `authored`: admin-created / installed (future SDK) |

### Extension contract
A plugin = hooks on session events + own screens + own data. It never mutates
core grouping logic. Enabling is per-session (`plugins: []`), so one session can
run with chat+quiz while another runs bare. Implemented first-party keys
(PluginRegistry, 2026-08-15): `quiz`, `match_me`, `proxy`, `announcements`,
`moderation` — all `origin: first_party`. Authored plugins (admin-created /
installed) land in the same registry with `origin: authored` when the SDK
ships; the contract is pinned in [plugin-sdk.md](plugin-sdk.md).

### Admin panel surface map (shipped, 2026-08-15)

| Tab | Contents | Visibility |
|---|---|---|
| **Live Grid** (core) | QR join card, PIN, presence, Freeze/Dissolve/Export, auto-dissolve timer, guest list, stat tiles, live groups grid, pool bar (roles + ban + auto-distribute) | always |
| **Configuration** (core) | Session Rules editor (group size, join mode, naming, anonymous, chat modes, freeze) + Group Fields editor (add/remove/attribute) | always |
| **Permissions** (core) | action × role matrix (overrides system defaults) + custom session roles (define + assign) | always |
| **Plugins** (one term) | first-party shelf with toggles; enabled modules' panels render here (quiz builder, proxy importer, announcements, moderation queue); authored section below (coming-soon SDK slot) | per-session toggle |
| **Templates & Activity** (core) | config templates + event log | always |

### Session config object (one source of truth)
```
session {
  rules:      { min_members, max_members, join_mode, allow_user_creation, freeze }
  fields:     [ { name: "Chosen topic", type: text, required, filled_by, on_card, in_csv, filterable } ]
  perms:      { action → role → on/off }
  plugins:    [ ... ]
}
```
Every UI action → `can?(action, role)`; every card render → `fields`; extension
slots read session events. This object is the data model — the matrix UI,
extension shelf, and configuration interface are shipped surfaces (above), not
later architecture.
