# Groupify — Review Pass 1 (in-loop, 2026-08-14)

Adversarial pass over the night-one build (baseline `c70c427` → HEAD). Focus:
permission enforcement, config dead-flags, transaction/capacity races, token
handling, CSRF, concurrency. Fresh-context review with a different model is
still recommended before production deploy.

## Fixed in this pass

1. **HIGH — `allow_user_creation` was dead config.** The flag existed in the
   config object but no mutation read it. Any member could create groups with
   creation disabled. Now enforced in `GroupController@store` (+ 2 tests).
2. **HIGH — `create_group` permission never enforced.** Session overrides of
   `perms.create_group.member=false` were silently ignored (matrix defaults
   only). Now enforced via `PermissionService::can('create_group', 'member')`
   (+ 2 tests). Same pattern as the already-enforced `set_group_size` /
   `fill_group_fields` — the delegation surface is now complete.

## Verified clean

- Capacity races: join/move use `lockForUpdate` + active-count/openSlots check
  inside the transaction (AD-7) — no overfill window.
- Leadership transfer (leave/move): next-joined member by `orderBy id`,
  `leader_id` updated in the same transaction.
- Token auth: `hash_equals` everywhere; 404 (no existence leak) policy uniform.
- CSRF: `PreventRequestForgery` active; React client sends XSRF cookie;
  tests bypass per-file only.
- SQLite: WAL + busy_timeout + `IMMEDIATE`; one queue worker.
- Rejoin: `firstOrCreate` by (session, token) — no duplicate seats.
- XSS surface: React escapes all dynamic text (field values, names, topics).

## Deferred (documented, not blocking)

- **Rate limiting**: no throttling on join/create endpoints — acceptable for a
  home-server LAN-scale tool; add `RateLimiter` before any public marketing.
- **N+1**: `SessionSnapshot` issues one members query per group — fine at
  ≤200 participants; eager-load if it grows.
- **Admin token in URL query**: `?token=` lands in browser history — acceptable
  for the threat model; a header-cookie flow is a later hardening.
- **Broadcast auth**: channels are public (`session.{code}`) — the code IS the
  capability token; revisit if sessions need secrecy.
- **Review gate**: 32 stories remain in `review` in sprint-status — run
  `bmad-code-review` in a fresh context before production deploy.

## Evidence

- Gates: 84 tests, 324 assertions; pint + phpstan + build clean.
- Commits: `f779e2e` (deploy package) + this pass (creation enforcement).
