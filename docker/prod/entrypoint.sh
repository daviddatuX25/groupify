#!/bin/sh
set -e
cd /var/www/html
mkdir -p database/data
touch database/data/database.sqlite

# Stale dev package-discovery cache (generated with dev deps like Pail) must
# not ship or boot — regenerate against the --no-dev vendor.
rm -f bootstrap/cache/packages.php bootstrap/cache/services.php

# Idempotent boot: package discovery, migrations, cache (route cache needs the
# /health controller — closures would break it)
php artisan package:discover --ansi || true
php artisan migrate --force
php artisan config:cache || true
php artisan route:cache || true

exec supervisord -c /etc/supervisor/supervisord.conf
