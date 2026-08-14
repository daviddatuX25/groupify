#!/bin/bash
# Run the Playwright e2e suite from the HOST against the production stack
# (the prod image serves built assets + a real WS path; the dev stack's
# single-threaded artisan serve cannot handle browser concurrency).
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose -f compose.prod.yaml up -d >/dev/null
sleep 8
PLAYWRIGHT_BROWSERS_PATH="$PWD/.browsers" \
E2E_BASE_URL=http://localhost:8081 \
  npx playwright test "$@"
