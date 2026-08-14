---
baseline_commit: 3e21dc47aea9dbf81e12f02fdc5a36810cd11d38
---

# Story 6.2: Reverb + Queue

Status: review

## Story

As an operator,
I want the realtime + queue envelope configured,
so that broadcasts flow through one database queue worker (AD-10).

## Acceptance Criteria

1. GIVEN the stack WHEN broadcasts fire THEN the queue worker delivers them to Reverb.
2. GIVEN env-driven config WHEN changed THEN the broadcast driver swaps without code changes.

## Tasks / Subtasks

- [x] `install:broadcasting --reverb` wired (Echo + REVERB_* env) — landed in scaffold E6S1
- [x] `QUEUE_CONNECTION=database` + jobs table + `queue:listen` in the entrypoint
- [x] Env-driven: BROADCAST_CONNECTION=reverb default, pusher = swap
- [x] Real-time delivery proven: browser cross-client update (2-5) + admin live propagation (3-1) + 865ms join timing

## Dev Notes

- AD-10: one box — SQLite + database queue + one worker + Reverb. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-10]
- Broadcast fakes removed in Laravel 13 — tests use Event/Queue fakes.

### References

- [Source: docs/planning/epics-groupify.md#E6S2]

# Traceability

- FR: NFR-1 | CAP: CAP-3 | AD: AD-1, AD-6, AD-10

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- None

### Completion Notes List

- Envelope proven by realtime browser tests; record formalizes the 6-1 scaffold work.

### File List

- (no new files — landed in E6S1 scaffold)
