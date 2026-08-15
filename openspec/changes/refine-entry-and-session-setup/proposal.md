## Why

Groupify's entry surfaces still make people decode product rules from punctuation-heavy select options, stale helper text, and empty form space. A host should be able to launch a room by choosing a clear access card and a familiar duration, while a returning participant should be able to reopen a saved room without remembering a code or repeating setup.

## What Changes

- Replace compressed access-mode copy with plain-language choice cards that show who can enter, what happens next, and whether a PIN is needed.
- Make session duration a preset-first choice (`1 hour`, `12 hours`, `1 day`, `1 week`, `1 month`) with an explicit custom end-time path and manual-end option.
- Rework the homepage around two clear jobs: create a room and join a room, with locally saved participant rooms shown as a returning-user shortcut.
- Allow participants to save or remove a room in browser local storage; saved entries reopen the room's join flow and never store participant identity or admin secrets.
- Replace instructional placeholders and punctuation-dependent summaries with persistent labels, helper text, and complete sentences.
- Preserve the Kinetic dark visual system, no-account model, ephemeral sessions, and existing server-side access rules.

## Capabilities

### New Capabilities

- `saved-session-library`: Locally persisted participant room shortcuts with pin, open, remove, and expired-session states.
- `session-setup`: Card-first access and lifecycle choices for creating a session, including preset durations and custom end times.
- `entry-surface-copy`: Plain-language, accessible copy and form guidance across the homepage, join page, and session creation page.

### Modified Capabilities

- None.

## Impact

- Frontend: `resources/js/pages/welcome.tsx`, `resources/js/pages/Admin/New.tsx`, `resources/js/pages/Session/Join.tsx`, `resources/js/pages/Session/Show.tsx`, shared local-storage helpers, and e2e selectors.
- Backend: `SessionController::store` validation and end-time normalization; feature coverage for duration presets and existing join-mode behavior.
- OpenSpec: three new capability specs plus design and task artifacts.
- No new infrastructure or third-party dependency.
