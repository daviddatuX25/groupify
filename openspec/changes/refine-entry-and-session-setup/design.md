## Context

The homepage, join page, and session creation page share the Kinetic dark visual system, but their current information architecture makes users parse implementation-oriented summaries and select options. Session creation currently accepts a single `ends_at` date-time, while participants have no browser-local room library for returning to a room. Groupify has no account system, so any returning-user shortcut must remain device-local and must not become an authentication mechanism.

## Goals / Non-Goals

**Goals:**

- Make the first viewport explain the two real jobs: create a room or return to a room.
- Use complete sentences, persistent labels, and visible helper text instead of punctuation-dependent option values or instructional placeholders.
- Make access and lifecycle decisions scannable through choice cards with safe defaults.
- Persist explicit participant room pins in local storage without storing device tokens, admin tokens, PINs, names, or message content.
- Keep the existing server-side join-mode and QR-grant rules authoritative.

**Non-Goals:**

- No account system, server-side room directory, cross-device sync, or automatic session discovery.
- No new session-name field or database migration in this change.
- No redesign of the live board or admin dashboard beyond the small save-room affordance needed to complete the return flow.
- No change to the meaning of approval mode, QR PIN bypass, retention, archive, or purge behavior.

## Decisions

### 1. Use explicit browser-local saved-room records

Add a small typed helper at `resources/js/lib/savedSessions.ts` around one versioned local-storage key. A record contains only the six-digit code, a user-facing label derived from the code, the last-visited timestamp, and the last-known lifecycle status. The helper validates and bounds records on read, deduplicates by code, keeps the newest entries first, and exposes `list`, `isSaved`, `save`, and `remove` operations. Invalid or malformed local storage is treated as empty state.

The join page and participant board will expose an explicit save toggle. A successful join may update `lastVisitedAt` only when the room is already saved; it must not silently create a pin. The homepage is the primary place to reopen or remove saved rooms. The server remains the source of truth for whether a saved code still exists.

**Alternative considered:** store the device token with each room to auto-rejoin. Rejected because it turns a convenience list into a credential cache and conflicts with the existing token privacy model.

### 2. Make the homepage a return-oriented entry dock

Keep one prominent create action and one code-entry form, then place saved rooms directly beneath them when records exist. Each saved-room card shows the code, last-used relative time, a lifecycle badge when known, and one primary `Open room` action plus a labeled remove action. The empty state explains exactly where saved rooms come from and offers the code form as the next action. The explanatory three-step strip remains below the operational content and is secondary on repeat visits.

**Alternative considered:** a separate `/rooms` page. Rejected because the saved list is a lightweight local convenience and should not add navigation or a new route.

### 3. Use access choice cards, not a select

Replace the access-mode select with two radio-backed cards. `Open room` is the default and states that anyone with the link can enter and groups open immediately. `Review arrivals` states that the host controls entry and the direct link may ask for a PIN. The QR PIN bypass control appears only when review mode is selected. The selected card has a visible border, supporting text, and an accessible checked state.

### 4. Use duration presets with an explicit custom escape hatch

Replace the single date-time-first lifecycle control with radio-backed duration cards: `1 hour`, `12 hours`, `1 day`, `1 week`, `1 month`, and `Keep open until I end it`. A final `Choose a date and time` card reveals the `custom_ends_at` field only when selected. The default is `1 day`, matching the ephemeral session model while avoiding accidental immediate expiry. The backend receives `end_mode` plus an optional `custom_ends_at` and normalizes the actual `ends_at` server-side using the application clock.

**Alternative considered:** keep a date-time input as the primary control with preset buttons around it. Rejected because most hosts know the intended duration, not an exact timestamp, and date-time entry is slower and more error-prone on phones.

### 5. Keep display copy complete and translatable

Copy uses stable nouns and verbs: room, host, participant, PIN, group, save, remove, open, review. Avoid em dashes, semicolon-packed summaries, sentence fragments, concatenated variables, and instructions inside placeholders. Dynamic values appear in complete sentences or standalone metadata labels so translation can reorder them.

## Risks / Trade-offs

- **[Risk]** Saved codes can become stale after archive or purge. → Cards show a neutral saved state, opening still uses the server route, and failed opens provide a remove action; no local record is treated as proof of access.
- **[Risk]** Local storage may be unavailable or cleared. → The helper catches storage failures and the core code-entry flow remains fully usable.
- **[Risk]** Preset durations cross daylight-saving or month-length boundaries. → Compute server-side with Carbon's calendar-aware methods and test the allowed interval rather than relying on client timestamps.
- **[Risk]** A larger card-first form could feel long on small screens. → Keep one-column cards, collapse custom date-time until selected, and retain a sticky-feeling primary action at the end of the short form.

## Migration Plan

1. Deploy frontend and backend together because the create form changes its request keys.
2. Existing live sessions retain their stored `ends_at` and config unchanged.
3. Existing clients can continue joining through the current route; only new session creation uses `end_mode`.
4. If rollback is needed, revert the frontend and controller together. Browser-local saved-room data is versioned and can be ignored by the old build.

## Open Questions

- None blocking. A future session-label capability can add an optional local alias without changing this room-code contract.
