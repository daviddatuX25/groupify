# TLS Edge Rig (local)

Validates the production network path — TLS termination + WebSocket upgrade
through a real reverse proxy — without Dokploy.

## Build the edge variant (bakes wss://localhost:9443)

```bash
GROUPIFY_REVERB_PORT=9443 GROUPIFY_REVERB_SCHEME=https docker compose -f compose.prod.yaml build
docker compose -f compose.prod.yaml up -d --force-recreate
docker compose -f compose.edge.yaml up -d          # Caddy: https://localhost:9443 -> app
E2E_BASE_URL=https://localhost:9443 npx playwright test   # expect 8 passed + 1 skipped (sw-check self-skips with a message)
```

Verified 2026-08-15: HTTPS health 200, full suite 8/9, realtime propagation
576ms over wss through Caddy.

## Known limitation

`sw-check.spec.ts` skips itself over the self-signed edge: browsers validate the
service-worker script's certificate themselves, and Playwright's
`ignoreHTTPSErrors` cannot bypass that. Production (Let's Encrypt) is trusted,
so the SW test is meaningful only on the http rig (`E2E_BASE_URL=http://localhost:8081`).

## Restore the http rig

```bash
docker compose -f compose.prod.yaml build && docker compose -f compose.prod.yaml up -d --force-recreate
```
