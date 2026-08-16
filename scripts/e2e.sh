#!/bin/bash
# Run the Playwright e2e suite from the HOST against the production stack
# (the prod image serves built assets + a real WS path; the dev stack's
# single-threaded artisan serve cannot handle browser concurrency).
#
# The stack is force-recreated each run: the in-container Reverb accumulates
# ghost WebSocket connections under sustained test load and stops delivering
# events (jobs report DONE but clients never receive them). A fresh container
# also gives CI-equivalent state (clean SQLite volume persists via named
# volume, but Reverb/queue processes restart).
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose -f compose.prod.yaml up -d --force-recreate >/dev/null
echo "waiting for app health…"
for i in $(seq 1 30); do
    if curl -fsS http://localhost:8081/health >/dev/null 2>&1; then
        break
    fi
    sleep 2
done
PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers" \
E2E_BASE_URL=http://localhost:8081 \
  npx playwright test "$@"
