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

# Fresh named volumes arrive root-owned (docker volume create); the app runs
# as www-data, so hand the runtime dirs over before dropping privileges.
chown -R www-data:www-data database/data storage bootstrap/cache
chmod -R u+rwX,g+rwX database/data storage bootstrap/cache

# Everything after this point runs as www-data (nginx/php-fpm/queue/reverb/
# scheduler) — no long-lived root processes. setpriv (util-linux) is present
# in every Debian base; no extra package needed.
setpriv --reuid=www-data --regid=www-data --init-groups supervisord -c /etc/supervisor/supervisord.conf &
SUPERVISOR_PID=$!

# Stream the logs back to docker stdout (children cannot write the docker
# pipe directly as www-data — real files, tailed).
tail -F /tmp/supervisord.log /var/log/supervisor/*.log 2>/dev/null &
wait $SUPERVISOR_PID
