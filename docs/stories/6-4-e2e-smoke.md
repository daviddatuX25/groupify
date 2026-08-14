---
baseline_commit: 3e21dc47aea9dbf81e12f02fdc5a36810cd11d38
---

# Story 6.4: End-to-End Smoke

Status: in-progress

## Story

As the operator,
I want a proven end-to-end run,
so that night-one is demonstrably working.

## Acceptance Criteria

1. GIVEN a facilitator WHEN they create a session THEN code + PIN + QR work and the admin panel shows the session.
2. GIVEN 20+ joins by QR/code+PIN WHEN they land THEN the board reflects everyone within ~1s.
3. GIVEN required "Chosen topic" WHEN a group is created without it THEN it is blocked.
4. GIVEN formed groups WHEN exported THEN the CSV includes group/name/email/topic.
5. GIVEN a server kill WHEN clients are watching THEN an offline banner shows within ~5s; recovery resyncs.
6. GIVEN live changes WHEN they happen THEN all connected devices update within ~1s.

## Tasks / Subtasks

- [x] Local simulated event (2026-08-14): session created → required field added → 14 joins by code+PIN → 3 groups with topics → board + CSV verified
- [x] Propagation timing: join → board read 865ms (≤1s, AC 2/6)
- [x] CSV: 14 rows, dynamic "Chosen topic" column, pooled rows as (pool) (AC 4)
- [x] Required-field block: covered by GroupMutationsTest (AC 3)
- [x] Realtime cross-client live update: browser-verified in 2-5 (AC 6)
- [ ] Server-kill failure drill (AC 5): banner + resync — deferred to the deployed environment
- [ ] Full 20+ participant run on groupify.dxtechph.online after 6-3 deploy

## Dev Notes

- SPEC success signal is the contract. [Source: docs/specs/spec-groupify/SPEC.md#Success-signal]
- Live deployment pending user's Dokploy credentials (6-3).

### References

- [Source: docs/planning/epics-groupify.md#E6S4]

# Traceability

- FR: FR-5.5, FR-8.1, FR-8.3 | CAP: CAP-1/2/3/4/6/9 | AD: AD-6/8/10/11

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None

### Completion Notes List

- Local smoke passed: 14 joins, 3 topic groups, CSV complete, 865ms propagation. AC 5 + production run pending deploy.

### File List

- docs/stories/6-4-e2e-smoke.md (this record)
