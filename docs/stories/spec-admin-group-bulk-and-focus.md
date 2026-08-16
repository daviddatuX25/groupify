---
title: 'Admin group creation focus and bulk creation'
type: 'feature'
created: '2026-08-15'
status: 'done'
baseline_commit: e9c2852c9f8f1152761227da297fdd85d760c0dd
review_loop_iteration: 1
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The admin create-group dialog moves focus to its Close button after every keystroke because its mount effect focuses Close and re-runs when an inline `onClose` callback changes. Admins also need a fast way to create many empty groups without repeating the modal flow.

**Approach:** Keep the group-name input as the dialog's initial focus target and remove the focus-stealing behavior. Extend the admin group workflow with a bounded bulk endpoint and modal controls for count, shared capacity, and optional generated random names; preserve the existing single-group participant and admin flows.

## Boundaries & Constraints

**Always:** Admin token authorization and 404-on-mismatch remain enforced. Bulk creation validates count 1–200 and capacity against session limits, creates all groups transactionally, broadcasts each committed group through the existing `GroupCreated` event, and records one aggregate activity event. Generated names must be non-empty and unique within the request; blank single-group names continue using the configured sequential `GroupNamer` scheme. The dialog remains keyboard accessible with a visible label, Escape close, submit/cancel buttons, and focus staying in the active field while typing.

**Ask First:** None.

**Never:** Do not weaken authorization, create groups client-side only, add a schema migration for names, change participant group creation semantics, or replace the existing realtime event contract.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| SINGLE | Admin, count 1, optional name/capacity | One group is created; blank name uses configured sequential naming | Validation errors remain JSON 422 |
| BULK_RANDOM | Admin, count 2–200, random names enabled | Count groups are created atomically with distinct generated names | Entire transaction rolls back on failure |
| BULK_SEQUENTIAL | Admin, count 2–200, random names disabled | Count groups receive the next configured sequential names | Entire transaction rolls back on failure |
| INVALID_COUNT | count 0, 201, non-integer, or missing | No groups are created | JSON 422 |
| FOCUS | Dialog open, admin types multiple characters | Name input retains focus; Close is not activated | Escape still closes the dialog |

</frozen-after-approval>

## Code Map

- `resources/js/components/GroupCreateDialog.tsx` -- shared dialog; its `[onClose]` effect focuses Close and currently steals focus on parent re-renders.
- `resources/js/pages/Admin/Show.tsx` -- admin modal state/render and `createAdminGroup`; existing `act()` supplies admin token, XSRF, and board refetch.
- `app/Http/Controllers/Admin/AdminActionsController.php` -- authorized single-group creation and bulk participant precedent; add transactional bulk group action here.
- `app/Support/GroupNamer.php` -- configured sequential names; extend with batch sequencing and random generated names without changing participant `RandomName`.
- `routes/web.php` -- admin mutation routes; add a dedicated bulk route beside `admin.groups.store`.
- `app/Events/GroupCreated.php` -- existing realtime payload; reuse once per committed bulk group.
- `app/Services/EventRecorder.php` -- aggregate activity record for bulk operations.
- `tests/Feature/AdminActionsTest.php` -- admin mutation authorization and creation coverage.
- `tests/e2e/admin-flow.spec.ts` -- production admin browser flow coverage.

## Tasks & Acceptance

**Execution:**
- [x] `resources/js/components/GroupCreateDialog.tsx` -- keep initial focus on the name input, add accessible count/random-name controls, keep the name field usable at count 1 without random names, constrain the count input (min 1, max 200, step 1), and gate Escape/backdrop close while busy.
- [x] `resources/js/pages/Admin/Show.tsx` -- submit single or bulk creation, reset count and random-names state whenever the dialog or panel closes, validate count 0/empty/non-integer client-side, reset state only after request acceptance, show progress/error feedback, and ignore stale in-flight responses after close.
- [x] `app/Support/GroupNamer.php` -- provide batch sequential and random name generation; the random fallback must re-check collisions, stay unique, and avoid pathological re-rolls when the dictionary is nearly exhausted.
- [x] `app/Http/Controllers/Admin/AdminActionsController.php` -- add validated, transactional, authorized bulk creation with per-group broadcasts and one aggregate activity event that matches the single-create record shape (including `by`).
- [x] `routes/web.php` -- register the bulk admin endpoint.
- [x] `tests/Feature/AdminActionsTest.php` -- cover authorization, count bounds (including 0, 201, non-integer), capacity below and above session limits, sequential naming continuing from existing groups, distinct random names, exhaustion fallback uniqueness, transaction rollback, and aggregate recording.
- [x] `tests/e2e/admin-flow.spec.ts` -- cover typing focus retention, single named-group creation, bulk creation counts, random names observably distinct from the sequential scheme, a failed submission showing the in-dialog error, and a 10s request timeout that releases the busy state.

**Acceptance Criteria:**
- Given the admin dialog is open, when the admin types in any text field, then focus remains in that field and the Close button is not highlighted or activated.
- Given an authorized admin submits a valid bulk count, when creation succeeds, then exactly that many empty groups appear on the live board.
- Given random naming is enabled, when a bulk request succeeds, then every created group has a distinct generated name.
- Given an unauthorized request or invalid count/capacity, when the endpoint is called, then it returns the existing 404/422 contract and creates no groups.

## Spec Change Log

- **Loop 1 (bad_spec):** Blind-hunter review finding — the bulk panel unmounted the manual name field, so a single named group could not be created from the expanded state, contradicting Design Notes "manual name stays available". Amended Design Notes to pin the exact behavior (name field visible at count 1 without random names; ignored only when count > 1 or random); expanded Tasks to cover the substantive patch findings (random-names state reset on collapse, client-side count 0/empty validation, collision-safe exhaustion fallback without pathological re-rolls, Escape/backdrop gated on busy plus stale-response guard, aggregate event shape parity incl. `by`, count input constraints, fetch timeout, and the test gaps: sequential continuation from existing groups, exhaustion fallback, capacity below min, single-create e2e, failed-submission error e2e, random observably distinct from sequential). Known-bad state avoided: shipping a dialog whose name field disappears in bulk mode and a random-names checkbox that hijacks later single submits. KEEP: the backend endpoint shape (count/capacity/random_names validation, transaction, per-group `GroupCreated` broadcasts, one `groups_created` aggregate event), `GroupNamer::batch()` start-offset logic, the focus fix (no close-button focusing; Escape via ref; `autoFocus` on the name/count input), busy/error dialog states with close-only-after-acceptance, route registration, and the passing feature/e2e coverage patterns.

## Design Notes

The dialog's default state is the compact single-group path: the manual name field is shown and count is 1. Expanding "Create multiple" keeps the manual name field visible while count is 1 and random names are off — a single named group can still be created from the expanded state — and the name field is ignored (hidden or disabled) only when count > 1 or random names are enabled. Closing the panel resets count to 1 and random-names to off so a later single submit never routes to the bulk endpoint. The backend remains the source of truth for limits, names, transactions, and authorization.

## Verification

**Commands:**
- `docker compose run --rm --entrypoint bash app -lc 'cd /var/www/html && ./vendor/bin/pest tests/Feature/AdminActionsTest.php'` -- expected: all relevant feature tests pass.
- `docker compose run --rm --entrypoint bash app -lc 'cd /var/www/html && npm run types:check && npx eslint resources/js/components/GroupCreateDialog.tsx resources/js/pages/Admin/Show.tsx tests/e2e/admin-flow.spec.ts && npm run build'` -- expected: typecheck, lint, and production build pass.
- `PLAYWRIGHT_BROWSERS_PATH=$PWD/.browsers E2E_BASE_URL=http://localhost:8081 npx playwright test tests/e2e/admin-flow.spec.ts` -- expected: admin focus and bulk flows pass against production assets.
</frozen-after-approval>

## Suggested Review Order

**Backend contract**

- Bulk endpoint: authorized, validated count/capacity/random_names, one transaction, per-group broadcast, one aggregate event
  [`AdminActionsController.php:57`](../../app/Http/Controllers/Admin/AdminActionsController.php#L57)

- Route registration beside the single-create route
  [`web.php:79`](../../routes/web.php#L79)

**Naming**

- Sequential batch continues from the current group count; random batch avoids session-wide collisions
  [`GroupNamer.php:34`](../../app/Support/GroupNamer.php#L34)

- Exhaustion fallback keeps unique names without pathological re-rolls
  [`GroupNamer.php:65`](../../app/Support/GroupNamer.php#L65)

**Dialog focus and bulk UI**

- Focus fix: once-subscribed Escape handler reads busy from a ref; name field stays focused while typing
  [`GroupCreateDialog.tsx:62`](../../resources/js/components/GroupCreateDialog.tsx#L62)

- Name field visibility rule pinned by Loop 1: visible at count 1 without random names, with a keep-draft hint otherwise
  [`GroupCreateDialog.tsx:152`](../../resources/js/components/GroupCreateDialog.tsx#L152)

- Client routing: digit-only count validation, single-vs-bulk payload, 10s abort with board refetch on timeout
  [`Show.tsx:427`](../../resources/js/pages/Admin/Show.tsx#L427)

- Activity feed renders the aggregate names line
  [`Show.tsx:2600`](../../resources/js/pages/Admin/Show.tsx#L2600)

**Tests**

- Feature: sequential/random batches, count and capacity bounds, wrong token 404, name-on-bulk 422, response shape
  [`AdminActionsTest.php:47`](../../tests/Feature/AdminActionsTest.php#L47)

- Feature: exhaustion-fallback and existing-name uniqueness
  [`AdminActionsTest.php:142`](../../tests/Feature/AdminActionsTest.php#L142)

- E2E: focus retention, expanded-panel named single, bulk-then-single reset, empty-count error, random distinctness, failed submission, busy-gated timeout
  [`admin-flow.spec.ts:97`](../../tests/e2e/admin-flow.spec.ts#L97)
