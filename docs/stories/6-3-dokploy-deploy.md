---
baseline_commit: 5f1dc16a297e395af354e3cd5ff222b3421a5b1c
---

# Story 6.3: Dokploy Deploy

Status: in-progress (config complete + locally verified; live apply awaits user credentials)

## Story

As an operator,
I want the app deployed to Dokploy at groupify.dxtechph.online with SSL and correctly proxied WebSocket upgrades,
so that the night-one success signal runs on a real public URL.

## Acceptance Criteria

1. GIVEN the Dokploy project WHEN the deployment config is applied THEN the app is configured to serve at groupify.dxtechph.online with an SSL certificate (Let's Encrypt via Dokploy).
2. GIVEN the Dokploy proxy WHEN Reverb WebSocket traffic arrives on the domain THEN upgrade requests are proxied correctly so Echo connects.
3. GIVEN the deployed app WHEN the deploy config is verified THEN /health returns OK and the server-status UX reports online. **Config-level acceptance: live apply requires the user's Dokploy credentials.**

## Tasks / Subtasks

- [x] Production container (AC: 1)
  - [x] `Dockerfile.prod` — multi-stage (node assets → composer vendor → php:8.4-fpm + nginx + supervisord: nginx, php-fpm, queue:work, reverb:start, schedule:work)
  - [x] `docker/prod/nginx.conf` — Laravel public/ + WS upgrade proxy /app → Reverb 127.0.0.1:8080 (HTTP/1.1 upgrade, buffering off) + HTTP_HOST passthrough + forwarded-proto
  - [x] `docker/prod/entrypoint.sh` — clears stale dev discovery cache, package:discover, migrate, config/route cache
  - [x] `docker/prod/supervisord-groupify.conf` — one-box envelope (AD-10)
  - [x] `compose.prod.yaml` — local test rig with SQLite + storage volumes; image `groupify-app-prod` (separate from dev)
  - [x] `docs/deploy/dokploy.md` — full recipe: app creation, build args (VITE_REVERB_HOST/PORT/SCHEME), env vars, volumes, Caddy WS snippet, verification plan
- [ ] Live Dokploy apply (AC: 1, 2, 3) — requires user's Dokploy credentials + DNS
  - [x] Domain/SSL/WS config steps documented (config-level)
  - [ ] Actual domain apply + certificate issuance
  - [ ] Live /health + Echo handshake + offline drill on groupify.dxtechph.online

## Dev Notes

- AD-10: single box, SQLite, one queue worker, Reverb same box. [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-10]
- Trusted proxies configured (`trustProxies(at: '*')`) — required behind nginx/Caddy for correct URL generation + HTTPS scheme.
- Stale dev package-discovery cache (bootstrap/cache/packages.php with Pail) breaks `--no-dev` boots — cleared + regenerated in the entrypoint.
- `/health` converted from a closure to `HealthController` so `route:cache` works in production.
- Wayfinder vite plugin removed (beta; requires PHP in the assets stage; generated files gitignored).

### References

- [Source: docs/planning/epics-groupify.md#E6S3]
- [Source: docs/architecture/spine-groupify/ARCHITECTURE-SPINE.md#AD-10]
- [Source: docs/prds/prd-groupify/prd.md#NFR-5]

# Traceability

- FR: NFR-5 | CAP: CAP-9 | AD: AD-10, AD-11

# Dev Agent Record

### Agent Model Used

opencode-go/deepseek-v4-flash (in-loop, 2026-08-14)

### Debug Log References

- Pail discovery-cache boot crash with --no-dev vendor → entrypoint clears + regenerates
- Wayfinder needs PHP in the node stage → plugin removed (unused typed routes)
- fastcgi_param names must be HTTP_-prefixed; XFH injection conflicted with the client passthrough → minimal config: HTTP_HOST $http_host + HTTP_X_FORWARDED_PROTO $http_x_forwarded_proto
- Prod build overwrote the shared image tag → prod image named `groupify-app-prod`

### Completion Notes List

- **Local production-image verification (full pass):** /health OK · SSR /new 200 · WS /app proxied · create session → redirect with port · join 302 · board 200 · create-group 200, on SQLite volumes.
- Gates green (82 tests, 318 assertions).
- Remaining: live Dokploy apply with the user's credentials (steps in docs/deploy/dokploy.md).

### File List

- Dockerfile.prod, compose.prod.yaml
- docker/prod/{nginx.conf, supervisord-groupify.conf, entrypoint.sh}
- docs/deploy/dokploy.md
- app/Http/Controllers/HealthController.php
- routes/web.php, bootstrap/app.php (trustProxies)
- vite.config.ts (wayfinder removal), .dockerignore
- docs/stories/6-3-dokploy-deploy.md (this record)
