# Groupify — Plugin SDK Contract (design for the authored layer)

> Status: DESIGN (2026-08-15). First-party plugins ship today; the authored layer
> is future. This doc pins the contract so the repo can be published and an SDK
> built on it without reworking the core. Grounded in the standard Laravel
> package-development playbook (service providers + auto-discovery + events +
> contracts — see Laravel docs "Packages").

## 1. One term: Plugins, two origins

| origin | meaning | ships when |
|---|---|---|
| `first_party` | in-built with Groupify | today (quiz, match_me, proxy, announcements, moderation) |
| `authored` | created by an admin (or installed third-party) | future SDK |

Both share ONE slot contract. The session config holds a single enabled list:

```
session.plugins = [ "quiz", "spin-the-wheel" ]   // keys only — origin is registry metadata
```

## 2. The slot contract (what a plugin is)

A plugin, whether first-party or authored, is exactly:

1. **A manifest** — machine-readable definition:

```json
{
  "key": "spin-the-wheel",
  "name": "Spin the Wheel",
  "version": "1.0.0",
  "origin": "authored",
  "capabilities": ["wheel.spin", "wheel.configure"],
  "config_schema": {
    "type": "object",
    "properties": { "entries": { "type": "array", "items": { "type": "string" } } }
  },
  "screens": ["participant.board.widget", "admin.configure"]
}
```

2. **A service provider** (Laravel package convention) that:
   - `register()` → binds the plugin's services into the container;
   - `boot()` → registers event listeners, routes, and the manifest with the
     `PluginRegistry`.

3. **Event hooks only** — a plugin subscribes to the core session event surface
   (`SessionCreated`, `SessionStateUpdated`, `SessionConfigUpdated`,
   `MembershipChanged`, `GroupCreated`, `MessageCreated`, `QuizStateUpdated`,
   `SessionDeleted`). It never mutates core grouping logic (AD-9).

4. **Own screens + own data** — plugin routes render into registered screen
   slots (`participant.board.widget`, `admin.configure`, …); plugin data lives in
   plugin-owned tables, never in core tables.

## 3. Permission grains are core (the SDK's capability surface)

The `perms` matrix in the session config is the single authority for *what a
role may do* — including plugin capabilities:

```
session.perms = {
  "create_group":     { admin: true, leader: true,  member: true  },
  "kick_ban":         { admin: true, leader: true,  member: false },
  "wheel.spin":       { admin: true, leader: true,  member: true  },
  "wheel.configure":  { admin: true, leader: false, member: false }
}
```

Contract for SDK authors:

- A plugin's manifest lists its **capability grains** (`capabilities`).
- Grains must be namespaced by the plugin key (`wheel.spin`), never bare verbs.
- On enable, the plugin's provider registers its grains with
  `PluginRegistry::registerCapabilities($key, [...])`; core merges them into the
  permission matrix. Authored defaults come from the manifest
  (`capabilities_defaults: { "wheel.spin": ["admin","leader","member"] }`);
  session admins can still override per role in the Permissions tab — the same
  grain UI covers core and plugin capabilities alike.
- **One enforcement point**: plugins call the same
  `PermissionService::can('wheel.spin', $role, $session->config)` as core code.
  The SDK never invents its own authorization path.

## 4. Config shape (plugins are config-driven)

Plugin-specific settings live under a namespaced key of the session config
object — the single source of truth (AD-4, AD-8):

```
session {
  rules:    { ... }
  fields:   [ ... ]
  perms:    { ... }
  plugins:  [ "quiz", "spin-the-wheel" ]
  plugin_cfg: {
    "quiz":          { questions: [...] },
    "spin-the-wheel": { entries: [...] }
  }
}
```

- Validation: the core validates the `plugin_cfg` shape against the manifest's
  `config_schema` (today: the quiz's hand-rolled rules; the SDK generalizes this
  to schema validation).
- Enabling/disabling never touches `plugin_cfg` — config persists across toggles.

## 5. Authored storage model (future)

| table | purpose |
|---|---|
| `authored_plugins` | the admin's plugin library: key, name, version, manifest JSON, provider class or bundle, enabled-by-default, timestamps |
| plugin-owned tables | each plugin migrates its own data via its provider |

- **Global library, per-session enabling**: an authored plugin is installed
  once, enabled per session via the same `plugins: []` list.
- SDK distribution: a composer package (auto-discovered provider) OR an
  admin-authored bundle validated against the manifest schema. Both paths land
  in `PluginRegistry::registered()` with `origin: authored`; enabling is
  identical to first-party.

## 6. What the SDK will expose (later surface, already-architecture)

1. `PluginRegistry::register(array $manifest)` — authored registration.
2. `PluginRegistry::registerCapabilities(string $key, array $grains, array $defaults)`.
3. Core event classes as the hook surface (already fired today).
4. Screen slots for participant board widgets + admin configure panels
   (the admin Plugins tab already renders first-party panels — authored panels
   mount into the same place).
5. `PermissionService::can()` as the single grain enforcement API.
6. Manifest schema validator for `plugin_cfg`.

**Non-goals**: plugins never mutate core grouping code, never write core tables,
and never bypass the permission matrix (AD-9, AD-5).
