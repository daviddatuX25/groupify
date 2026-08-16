# Deferred Work

## Deferred

- source_spec: `docs/stories/spec-admin-group-bulk-and-focus.md`
  summary: Unify the six parallel XSRF/admin-token fetch helpers in `Admin/Show.tsx` into one shared mutation helper.
  evidence: Blind-hunter review found `submitGroupRequest` is a sixth copy of the cookie-split/decode/header dance; CSRF/token changes must now be repeated in every copy.
- source_spec: `docs/stories/spec-admin-group-bulk-and-focus.md`
  summary: Prevent duplicate sequential group names under concurrent bulk/single creates.
  evidence: `GroupNamer::batch()`/`next()` read the group count without locking and `groups` has no unique name constraint; a pre-existing single-create race amplified by the new bulk endpoint.
- source_spec: `docs/stories/spec-admin-group-bulk-and-focus.md`
  summary: Decide app-wide policy for broadcast failures after commit (AD-1 commit-then-broadcast currently leaves partial-failure states).
  evidence: Review noted that if `broadcast(new GroupCreated(...))` throws mid-loop the DB is committed, later groups go un-broadcast, the response 500s, and the aggregate event is never recorded; applies to single-create and dissolve too.
- source_spec: `docs/stories/spec-admin-group-bulk-and-focus.md`
  summary: Add full focus management (trap + restore-to-trigger) to every modal dialog in the app.
  evidence: Second-round review found Tab can move behind the admin create-group dialog and focus is not restored to the trigger on close; the same gap exists in ScanRoomDialog, MemberActionDialog, and AvatarProfileDialog — a shared dialog-shell concern beyond this feature.
- source_spec: `docs/stories/spec-admin-group-bulk-and-focus.md`
  summary: Add a CI job that builds production assets and runs the Playwright e2e suite.
  evidence: `.github/workflows/tests.yml` runs only `composer ci:check`; the dialog focus fix and bulk UX are pinned solely by a manual e2e command, so regressions pass the automated gate. Requires the prod stack in CI — repo-wide infrastructure, not this feature.

