# Performance Measurements (2026-08-15, prod stack)

| Scenario | Result | Budget |
|---|---|---|
| Snapshot fetch @ 100 participants | median 10ms, p95 11ms | n/a |
| Snapshot fetch @ 300 participants | median 13ms, p95 15ms | n/a |
| Join throughput (25 concurrent) | 49-52 joins/s | n/a |
| Realtime propagation (1 client, browser) | 180-700ms | CAP-3: 1000ms |
| Realtime propagation (full parallel e2e) | 1093ms worst | 2000ms (test) |
| Realtime propagation (dev stack, standalone) | 354ms | n/a (dev is single-threaded; e2e targets prod) |
| Reverb fan-out to 100 sockets | p50 677ms, p95 679ms | CAP-3: 1000ms |

Tooling: `scripts/load-test.sh [count] [base]`, `scripts/fanout.mjs <code> [count] [key]`
(write epoch-ms to /tmp/fanout-ts and broadcast from the app to trigger).
