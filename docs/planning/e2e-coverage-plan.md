---
title: Groupify — E2E Coverage Plan
status: implemented
created: 2026-08-16
updated: 2026-08-16
---

# E2E Coverage Plan — every button, every flow, gated in CI

> Status: Phases 0–3 complete 2026-08-16. 55 tests, 32 tagged `@smoke`.
> Bugs found: `docs/reviews/e2e-found-bugs.md` (1 fixed, 6 open, 1 infra).
> Local runner: `npm run test:e2e` (force-recreates the prod stack).
> CI: e2e job in `.github/workflows/tests.yml` (full suite on push/PR).

Goal: every user-reachable action (button, form, dialog action, error path) is
verified by at least one Playwright test, and the suite runs in CI on every
push. Combinations and state logic stay in the server suite; e2e owns the UI
surface.

Definition of done:
- Every route in `routes/web.php` exercised by ≥1 e2e test or explicitly
  waived (server-only, e.g. `/health`).
- Every dialog/modal action executed, not just opened.
- Every tested action also covers its error path (failed request, timeout,
  validation) where a failure UI exists.
- `composer ci:check`-style gate runs e2e in GitHub Actions; suite green on
  `main`.
- No test scrapes the DOM for code/PIN via body-text regex; all specs use the
  shared fixtures.

## Ground truth (verified 2026-08-16)

- 32 e2e tests / 10 spec files; full run against prod stack = **32/32 green in
  40.1s** (`scripts/e2e.sh`, `E2E_BASE_URL=http://localhost:8081`).
- 227 Pest feature tests / 31 files (server logic healthy — AdminActionsTest
  30, QuizTest 16, GroupMutationsTest 15; weakest: HealthTest 1, BoardApiTest
  2, ExportCsvTest 2). **No empty shells** — earlier "empty file" reading was
  a grep artifact.
- CI (`.github/workflows/tests.yml`) runs `composer ci:check` = lint + format
  + types + phpstan + `artisan test`. **No e2e job.** Suite is manual-only →
  primary bug leak.
- No `test:e2e` npm script; `playwright.config.ts` has no projects, retries,
  or parallelism config.

## Coverage matrix — routes → status → action

Legend: ✅ covered · 🟡 partial · ❌ uncovered

| Route / surface | Status | Action (spec) |
|---|---|---|
| `GET /` (saved rooms, QR affordance) | ✅ | — |
| `GET /new`, `POST /sessions` | ✅ | — |
| `GET /join/{code}`, `POST /join/{code}` | ✅ | — |
| `GET /join/{code}/seat` | ❌ | misc-flows: seat page renders + redirects |
| `GET /s/{code}`, board API | ✅ | — |
| `PATCH /s/{code}/profile` | ❌ | profile: AvatarProfileDialog edit name/avatar, persists on reload, board reflects |
| `GET/POST /s/{code}/messages` (group chat) | 🟡 | messaging: send → appears to group + admin; error path |
| `POST /s/{code}/match-me` | ❌ | misc-flows: joins group with free slot |
| `POST groups`, `join`, `leave` | ✅ | — |
| `POST groups/{g}/members/{m}/kick` | ❌ | leader-flow: leader kicks member → pool, board updates |
| `POST requests/{p}/approve` | ✅ | — |
| `POST requests/{p}/reject` | ❌ | leader-flow: rejected requester sees declined state |
| `POST quiz answer`, `PUT quiz`, `quiz/start` | ✅ | — |
| `GET /admin/sessions/lookup/{code}` | ❌ | admin-tools: saved-room reopen via lookup; wrong browser → 404 |
| `GET /admin/sessions/{id}` | ✅ | — |
| `PUT config` (rules) | 🟡 | config-editor: timer, guest list, custom fields, perms matrix, plugins panel |
| `PATCH state` (freeze/unfreeze), `POST dissolve` | ✅ | — |
| `DELETE /admin/sessions/{id}` | ❌ | admin-tools: destroy → join 404s, board gone |
| `POST groups/{g}/leader` (transfer) | ❌ | leader-flow: leadership moves, new leader can kick |
| `POST participants` (create) | ❌ | misc-flows: bulk participant creation fills pool |
| `POST groups`, `groups/bulk` | ✅ | — |
| `POST ban` / `role` / `move` | ❌ | member-actions: execute each from action chooser + roster modal; move to pool + to group |
| `POST auto-distribute` | ❌ | misc-flows: participants land in sized groups |
| `GET export` (CSV) | ❌ | admin-tools: download, row contents, headers |
| `GET activity` | ❌ | admin-tools: feed renders session events |
| `GET admin messages`, `pending`, `POST decide` | ❌ | moderation: participant msg → pending queue → approve/reject; admin announcement broadcast |
| `GET/POST templates`, `apply` | ❌ | templates: save config → apply to new session → rules/perms/fields carry |
| ScanRoomDialog full flow | 🟡 | entry-ux addition: manual code entry + camera affordance |
| MemberActionDialog / ParticipantActionDialog actions | 🟡 | member-actions / leader-flow (execute, not just open) |
| `GET /health` | n/a | server-only (HealthTest); no e2e needed |

## Phases

### Phase 0 — Fixtures & helpers (no behavior change)

Create `tests/e2e/fixtures/`:

- `session.ts` — `createSession(page)`: POST `/sessions` via XSRF, returns
  `{ code, pin, adminToken, sessionId, adminUrl }`; no body-text regex.
- `participant.ts` — `join(page, code, pin, name)`: name/PIN entry, device
  token into localStorage, waits for `/s/{code}`.
- `errors.ts` — `collectErrors(page)`: pageerror + console.error capture,
  asserted empty at test end (quiz-crash pattern, applied everywhere).
- `xsrf.ts` — token read shared by all API-driver specs.

Refactor the 10 existing specs onto the fixtures in the same pass.

Acceptance: `npx playwright test` still 32/32; zero regex-scraped body reads
left; no test writes its own XSRF boilerplate.

### Phase 1 — Runner & CI gate

- `package.json`: `"test:e2e": "bash scripts/e2e.sh"`.
- `.github/workflows/tests.yml`: new `e2e` job — build prod image, up
  `compose.prod.yaml`, wait for health, run suite, upload Playwright traces on
  failure. Reuse `.browsers` cache via `PLAYWRIGHT_BROWSERS_PATH`.
- `playwright.config.ts`: `retries: 1`, `fullyParallel: true`, `workers: 4`.

Acceptance: PR with a deliberately broken component (one-line regression) is
red in CI; suite green on `main`.

### Phase 2 — Gap specs (bug hunt), in this order

Each spec: fixtures only, `collectErrors` asserted, error paths included.

1. `messaging.spec.ts` — group chat send/receive (real WS), announcement
   broadcast, moderation visibility.
2. `member-actions.spec.ts` — ban, move (group + pool), role assign; assert
   board + flash after each; failed action shows dialog error.
3. `profile.spec.ts` — name/avatar edit, reload persistence, board reflects.
4. `leader-flow.spec.ts` — kick, transfer leadership, reject path.
5. `moderation.spec.ts` — pending queue, approve/reject decide, announcement.
6. `admin-tools.spec.ts` — CSV export contents, activity feed, destroy → 404,
   lookup ownership.
7. `templates.spec.ts` — save → apply → config carries (rules/perms/fields).
8. `misc-flows.spec.ts` — seat page, match-me, auto-distribute,
   create-participants, lookup edge cases.
9. `config-editor.spec.ts` — timer, guest list, custom fields on join card,
   perms toggles, plugins panel save.

Acceptance per spec: test is red against a stubbed broken handler before it is
trusted; every bug found is filed as an issue (not silently fixed inside the
spec). Suite target: ~65 tests, < 2 min parallel.

### Phase 3 — Hardening

- Tags: `@smoke` (current 32 core flows) vs full suite; smoke runs on every
  PR, full suite nightly or on merge.
- `trace: 'retain-on-failure'` + trace upload in CI (already on locally).
- Screenshot smoke (`toHaveScreenshot`) for the three highest-traffic pages —
  explicit Phase-3 follow-up, not a first-class requirement.

## Conventions (binding for new specs)

- No DOM-scraping of code/PIN; fixtures only.
- API setup via `page.request` with shared XSRF header helper — UI assertions
  stay the point of the test.
- Realtime assertions use `expect.poll` on the board API or WS-visible UI
  state, never fixed sleeps (latency spec is the only deliberate timer).
- Every action test asserts both success state and the action's error path
  where an error UI exists.
- `pageerror`/console-error capture asserted empty in every flow spec.

## Non-goals

- No combinatorial UI testing — perms/state logic lives in the 227 Pest
  tests; e2e covers representative combinations.
- No visual regression suite in Phase 1–2 (optional Phase 3).
- No load/race testing — `scripts/load-test.sh` + latency spec own that.
- No testing of unbuilt features (ChatTiers/CustomRoles suites track the
  roadmap, not this plan).

## Rollout

1. Land Phase 0+1 together (fixtures + CI gate) — suite stays green, every
   later spec lands through CI.
2. Phase 2 specs one at a time, filed bugs fixed by story (or fixed in the
   same PR where the fix is the bug the spec was written to catch — flagged in
   the PR description).
3. Phase 3 after the gap suite is stable for one week.
