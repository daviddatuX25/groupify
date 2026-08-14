---
baseline_commit: 4e8613a822851f34b0c26ac85ec71af9615b21a6
date: 2026-08-15
---

# Review Pass 2 — Adversarial Gate (pre-deploy)

Three fresh-context adversarial layers (Blind Hunter backend, frontend hunter, spec/acceptance auditor) over the full build. 2 CRITICAL, 2 HIGH-frontend, 5 HIGH-backend, 13 MEDIUM. All fixed + regression-tested.

## CRITICAL (fixed)

1. **Public snapshot leaked quiz answers + private config** — `/api/sessions/{code}/board` (unauthenticated) serialized the full session config (perms, roles, quiz answers, guest list) and the live question WITH its correct answer → quiz cheating + config disclosure. Fixed: `SessionSnapshot::build(..., $admin)`; participants get `config.publicView()` (rules sans guest_list + fields only) and a question with the `answer` key stripped; admin payloads unchanged. Tests: `ReviewGateTest` (public vs admin shape).
2. **Participant page crashed on session end + on live quiz** — (F1) the `gone` early return sat before a `useMemo` → hooks-order violation → whole app unmounts when a session is deleted; (F2) `quizPick` referenced without a declaration (batch edit silently no-op'd) → ReferenceError the moment a quiz went live. Fixed: early return moved after all hooks; `quizPick` declared. Verified by a deterministic e2e (`quiz-crash.spec.ts`): renders the live quiz, no pageerrors, click grades 10 pts.

## HIGH (fixed)

3. **Anonymous mode leaked real names** — pending-join requests + member `real_name` went to every board fetcher. Now `display_name` for participants, real names admin-only (pending list too).
4. **CSV formula injection** — names/cells starting with `= + - @` exported raw. Now prefixed with `'`.
5. **`dissolve` wiped every group's leader** — single-group dissolve nulled `leader_id` for ALL session groups. Now scoped.
6. **Approval join ignored capacity + double-seating** — `approve()` could seat one participant in multiple groups / overfill. Now enforces both.
7. **Realtime wiring** — `GroupCreated` broadcast on `session.{id}` (nobody listens) → group creation never propagated; `QuizStateUpdated` on an unauthorized PrivateChannel with the Session model in the default payload (admin token/PIN leak). Now both on the public `session.{code}` channel; quiz payload whitelisted.
8. **Prod deploy blocker** — entrypoint created the SQLite file as root; php-fpm (www-data) would 500 on every write on a fresh Dokploy volume. Now `chown -R www-data` after migrate.

## MEDIUM (fixed)

- nginx custom `types` block replaced defaults → CSS served as octet-stream (unstyled app). Now `include mime.types` + webmanifest override.
- SQLite config hardcoded `null` busy_timeout/journal_mode + DEFERRED transactions → env vars dead. Wired: WAL + busy_timeout 30000 + IMMEDIATE from env.
- Quiz answers: `answer_index` unbounded (out-of-range 500), answering while frozen/archived allowed, duplicate-answer TOCTOU → unhandled unique-violation 500. Now bounded 422, status-guarded 404, race caught → 422.
- Config merges used `array_replace_recursive` → numeric lists (guest list, fields, quiz questions) could never be shrunk. Replaced with `SessionConfig::deepMerge` (replace semantics for lists).
- Join PIN brute-force: replaced the per-IP `throttle:20,1` (it blocked legit mass joins from one NAT) with a per-session failed-PIN limiter — 10 wrong PINs / 5 min lock the session (later moved to the session-scoped RateLimiter; tested in JoinSessionTest).
- Frontend: QR canvas blank after join-info toggle (callback ref), hotkeys firing while typing (editable-target guard), stale `chat_enabled` closure (refetch ref), device/admin tokens left in URL query strings (replaceState strip), silent fetch failures (error banner), shared chat draft across two inputs (split), overlapping snapshot refetches (sequence guard).

## Verified clean

- No XSS sinks; CSRF/XSRF handling correct; server re-checks all privileged actions (leader/kick/approve/quiz); no SQL injection (all whereRaw parameterized); admin tokens always `hash_equals`; 404-no-leak holds.

## Gate result

- Pest: **175 passed (615 assertions)** (168 before + 7 new review-gate tests; AnonymousModeTest updated to the admin-only real-name contract)
- Build: clean · e2e: **8/8** (incl. new quiz-crash + SW-activation)
- Live-verified: public snapshot has no `answer`/perms/roles; admin snapshot does; CSS `text/css`; manifest `application/manifest+json`.
