#!/usr/bin/env bash
# Deploy handoff: certify the repo is push-ready and print the exact next
# commands. Run from the repo root after `git remote add origin <url>`.
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0
note() { printf '  %s %s\n' "$([ "$2" = ok ] && echo 'ok:' || echo 'FAIL:')" "$1"; [ "$2" = ok ] || fail=1; }

echo "== repo state"
[ -z "$(git status --porcelain)" ] && note "working tree clean" ok || note "working tree clean" bad
BR="$(git branch --show-current)"
[ "$BR" = main ] && note "on main ($(git describe --tags))" ok || note "on main (on '$BR')" bad

echo "== secrets hygiene"
git ls-files | grep -qE '^\.env$' && note "no committed .env" bad || note "no committed .env" ok
git log --all --diff-filter=A --name-only --pretty=format: | sort -u | grep -qx '.env' \
    && note "no .env in history" bad || note "no .env in history" ok

echo "== docs
  deploy recipe:   docs/deploy/dokploy.md
  build:           Dockerfile.prod (build args: VITE_REVERB_HOST/PORT/SCHEME/APP_KEY)
  env example:     .env.production.example
  verify:          ./scripts/verify-prod.sh https://<your-domain>
  backup:          ./scripts/backup.sh (cron: 0 3 * * *)
  ops notes:       docs/deploy/edge-rig.md, docs/performance.md"

if [ "$fail" = 1 ]; then
    echo
    echo "FIX the items above before pushing."
    exit 1
fi

echo
echo "== NEXT (after git remote add origin <url>)"
cat << 'EOF'
  1. git push -u origin main --tags
  2. Dokploy → New Application → Docker (Git):
       Repository: <your remote> · Branch: main · Build path: Dockerfile.prod
       Build args: VITE_REVERB_HOST=<domain> VITE_REVERB_PORT=443
                   VITE_REVERB_SCHEME=https VITE_REVERB_APP_KEY=<random hex>
  3. Environment: APP_URL=https://<domain> REVERB_APP_ID/KEY/SECRET=<random>
       (REVERB_APP_KEY must equal the VITE build arg) + the rest from .env.production.example
  4. Volumes: /var/www/html/database/data + /var/www/html/storage
  5. Domain + SSL (Let's Encrypt) → Deploy
  6. ./scripts/verify-prod.sh https://<domain>
EOF
echo "certified: READY TO PUSH"
