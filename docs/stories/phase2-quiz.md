---
baseline_commit: d97f1230fbbaff8f315dbcf00ecf83e547f150ec
phase: 2
---

# Phase 2 · Story M: Group Quiz Extension

Status: review

## Story

As a facilitator,
I want a live group quiz with auto-grading and a leaderboard,
so that sessions get a competitive realtime activity.

## Acceptance Criteria

1. GIVEN the admin WHEN they save quiz questions THEN they live in the session config (fields-as-config).
2. GIVEN a live run WHEN a group leader answers the current question THEN it grades instantly (correct → points, wrong → 0) and records one answer per group.
3. GIVEN all active groups have answered THEN the run auto-advances; after the last question it finishes.
4. GIVEN a live run THEN the snapshot exposes status, current question, the viewer's answer, and a leaderboard.

## Tasks / Subtasks

- [x] `quiz_runs` + `quiz_answers` tables (one answer per group per question, unique constraint)
- [x] Config `quiz.questions` (q, options, answer, points) + validation through the config endpoint and the dedicated save route
- [x] `QuizController` — save (admin), start (admin), answer (group leader, `answer_quiz` permission)
- [x] Auto-advance when all active groups answered; finish after the last question; broadcast `quiz.updated`
- [x] Snapshot `quiz` block (status, current_index, total, question, my_answer, leaderboard)
- [x] Admin UI: quiz editor (questions/options/correct/points), save, start, status + top-3 leaderboard
- [x] Participant UI: live question card for leaders, answered states, live leaderboard
- [x] 10 Pest tests (save, start, grading, wrong answer, duplicate, non-leader, auto-advance, finish, snapshot, auth)

## Dev Notes

- CAP-8 extension delivered as a core feature with config toggle — questions are config data (AD-8); runtime state (run/answers) is relational. [Source: docs/specs/spec-groupify/SPEC.md#CAP-8]

### References

- [Source: docs/specs/spec-groupify/flexibility-model.md#3-extensions-framework-cap-8]

# Traceability

- FR: — (CAP-8) | CAP: CAP-8 | AD: AD-1, AD-6, AD-8

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Missing `QuizController` import in routes → 500 "Target class does not exist"
- `Request::validated()` does not exist → capture the validated array once
- `answer_quiz` missing from the RoleDefaults matrix → 404s (permission denial)
- Test bugs: config `quiz()` returns the questions list (not wrapped); single-group auto-advance makes "already answered" unreachable (needs 2 groups); object keys in PHP arrays invalid
- PHPStan: generics/docblocks on QuizRun::answers, quizState, event payload

### Completion Notes List

- 10 tests green (158 total, 568 assertions); e2e 6/6; live-verified: save → start → grading (10/0) → auto-advance → leaderboard → done.

### File List

- database/migrations/…000014_create_quiz_runs_and_answers_tables.php
- app/Models/QuizRun.php, QuizAnswer.php; app/Events/QuizStateUpdated.php
- app/Http/Controllers/QuizController.php; routes/web.php
- app/Services/SessionSnapshot.php; app/Support/SessionConfig.php; app/Support/RoleDefaults.php
- resources/js/pages/Admin/Show.tsx, Session/Show.tsx
- tests/Feature/QuizTest.php (10 tests)
- docs/stories/phase2-quiz.md (this record)
