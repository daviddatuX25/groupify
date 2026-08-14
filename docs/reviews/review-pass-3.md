---
baseline_commit: 193ae81
date: 2026-08-15
---

# Review Pass 3 — Post-Delta Adversarial Gate (b4fe993..HEAD)

Two fresh-context layers (ops/security + e2e) over the 12-commit delta
(realtime fix, PIN limiter, rootless, edge rig, load/fan-out/restore tooling,
dev/prod coexistence). 1 CRITICAL, 2 HIGH, 4 MEDIUM — all fixed + tested.

## CRITICAL (fixed)

1. **Quiz answer leaked on the public WS channel** — `QuizStateUpdated` broadcast
   the full question WITH the `answer` key to `session.{code}` (participants
   subscribe). The snapshot was sanitized in pass 2; the event payload wasn't.
   Fixed: `QuizController::quizState()` strips `answer`; regression test asserts
   the payload contract (`QuizTest::never ships the correct answer...`).

## HIGH (fixed)

2. **Sticky merge in quiz save** — `QuizController::save` used
   `array_replace_recursive` → saving a shorter quiz kept the old tail
   questions/options (with their answers). Fixed: `SessionConfig::deepMerge`;
   regression test (`replaces the question set when saving a shorter quiz`).
3. **Latency test double-deadline (e2e)** — `started` captured before the POST +
   `expect(elapsed) < 2000` double-counted overhead → false-fail while Leo was
   already visible (recorded 2150ms failure with Leo present). Fixed: clock
   starts after the POST; the visibility timeout is the single deadline; the
   CAP-3 nominal 1000ms vs CI 2000ms split is logged, not asserted.

## MEDIUM (fixed)

4. **nginx `proxy_read_timeout 60s` == Reverb activity window** — idle WS
   connections raced the timeout and dropped. Now 300s.
5. **sw-check 30s hang** (e2e) — no guard when registration can't complete
   (dev build / untrusted cert). Now a 5s race with an actionable message +
   self-skip.
6. **quiz-crash leaderboard race** (e2e) — API GET could outrun the click's
   POST. Now synchronizes on the UI (question card unmounts) before asserting.
7. **fanout.mjs stale trigger file** — accepted any /tmp/fanout-ts regardless
   of age. Now requires a timestamp within 5 minutes.

## LOW (accepted, documented)

- AC4 unknown-keys-survive holds for assoc config sections; list sections
  (fields/quiz/roles) replace wholesale (removal works — the important bug).
- trusted-proxy `X-Forwarded-Proto` spoofing: URL scheme only, WS endpoint is
  build-time baked; accepted for the home-server single-proxy model.
- PIN limiter cleared by a correct PIN (wrong-guess-only throttle): accepted
  design — knowing the PIN ends the brute-force game anyway.
- backup VACUUM temp file: transient 2× disk on the volume; accepted.

## Gate result

- Pest: **180 passed (676 assertions)** (+2: WS payload, shrink merge)
- e2e: 3 consecutive full-suite runs green (9/9; propagation 94-1139ms)
- Edge rig: 8 passed + 1 self-skipped (SW requires trusted certs)
