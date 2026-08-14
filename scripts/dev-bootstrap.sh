#!/bin/bash
# Groupify dev bootstrap — idempotent scaffold of the Laravel 13 stack inside the container.
# Run: docker compose run --rm app bash scripts/dev-bootstrap.sh
set -euo pipefail
cd /var/www/html

if [ ! -f composer.json ]; then
  echo "==> Scaffolding laravel/blank-react-starter-kit (no auth, per AD-3)..."
  composer create-project laravel/blank-react-starter-kit /tmp/gf-scaffold \
    --stability=dev --prefer-dist --no-interaction
  rsync -a --exclude='.git' /tmp/gf-scaffold/ ./
  rm -rf /tmp/gf-scaffold
fi

echo "==> Composer install..."
composer install --no-interaction --prefer-dist

[ -f .env ] || cp .env.example .env
php artisan key:generate --force || true

echo "==> NPM install..."
npm install --no-audit --no-fund

echo "==> shadcn/ui init..."
npx -y shadcn@latest init -y -d || npx -y shadcn@latest init -y --base-color neutral

echo "==> Broadcasting (Reverb)..."
php artisan install:broadcasting --reverb --no-interaction || php artisan install:broadcasting --reverb

echo "==> Queue table + migrate..."
php artisan queue:table || true
php artisan migrate --force

echo "==> Dev environment ready."
echo "Start: docker compose up"
echo "One-off: docker compose run --rm app bash -lc 'php artisan ...'"
