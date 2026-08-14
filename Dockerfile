# syntax=docker/dockerfile:1
# Groupify dev environment — Laravel 13 (PHP 8.4) + Node 22 + Composer + Reverb
FROM php:8.4-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
    git unzip zip curl xz-utils rsync libsqlite3-dev libicu-dev libzip-dev \
    && docker-php-ext-install pdo_sqlite intl zip \
    && docker-php-ext-configure pcntl --enable-pcntl \
    && docker-php-ext-install pcntl \
    && curl -fsSL https://nodejs.org/dist/v22.23.2/node-v22.23.2-linux-x64.tar.xz \
        | tar -xJ -C /usr/local --strip-components=1 \
    && curl -fsSL https://getcomposer.org/installer \
        | php -- --install-dir=/usr/local/bin --filename=composer \
    && npm i -g @playwright/test >/dev/null 2>&1 \
    && npx playwright install-deps chromium >/dev/null 2>&1 \
    && npm rm -g @playwright/test >/dev/null 2>&1 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html
COPY scripts/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8000 8080 5173
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
