#!/bin/sh
set -e
cd /var/www/html

if [ ! -f vendor/autoload.php ] || [ ! -f node_modules/.bin/vite ]; then
  echo "[entrypoint] dependencies missing — bootstrap first:"
  echo "  docker compose run --rm app bash scripts/dev-bootstrap.sh"
  exit 1
fi

# One-box dev envelope (AD-10): Vite + queue worker + Reverb + Laravel
npm run dev -- --host 0.0.0.0 --port 5173 &
php artisan queue:listen --tries=1 &
php artisan reverb:start --host=0.0.0.0 --port=8080 &

exec php artisan serve --host=0.0.0.0 --port=8000
