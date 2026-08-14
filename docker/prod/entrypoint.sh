#!/bin/sh
set -e
cd /var/www/html
mkdir -p database/data
touch database/data/database.sqlite

# Per-deploy APP_KEY: generated once and persisted on the data volume, so
# restarts keep the same key (session cookies stay valid) and the baked
# fallback never ships to a real deployment.
if [ -z "${APP_KEY:-}" ] && [ ! -f database/data/.env-app-key ]; then
    php artisan key:generate --show > database/data/.env-app-key
fi
if [ -z "${APP_KEY:-}" ] && [ -f database/data/.env-app-key ]; then
    export APP_KEY="$(cat database/data/.env-app-key)"
fi

# Stale dev package-discovery cache (generated with dev deps like Pail) must
# not ship or boot — regenerate against the --no-dev vendor.
rm -f bootstrap/cache/packages.php bootstrap/cache/services.php

# Idempotent boot: package discovery, migrations, cache (route cache needs the
# /health controller — closures would break it)
php artisan package:discover --ansi || true
php artisan migrate --force
php artisan config:cache || true
php artisan route:cache || true

# Rootless: the whole container runs as www-data (Dockerfile USER), so
# volumes, caches, and the SQLite file are naturally www-data-owned.
exec supervisord -c /etc/supervisor/supervisord.conf
