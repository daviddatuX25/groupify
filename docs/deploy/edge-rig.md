# TLS Edge Rig (local)

Validates the production network path — TLS termination + WebSocket upgrade
through a real reverse proxy — without Dokploy.

## Build the edge variant (bakes wss://localhost:9443)

```bash
GROUPIFY_REVERB_PORT=9443 GROUPIFY_REVERB_SCHEME=https docker compose -f compose.prod.yaml build
docker compose -f compose.prod.yaml up -d --force-recreate
docker compose -f compose.edge.yaml up -d          # Caddy: https://localhost:9443 -> app
E2E_BASE_URL=https://localhost:9443 npx playwright test   # expect 9 passed + 2 skipped (sw-check + offline self-skip: SW requires trusted certs)
```

Verified 2026-08-15: HTTPS health 200, full suite 9 passed + 2 skipped,
realtime propagation 391ms over wss through Caddy.

## Known limitation

`sw-check.spec.ts` and `offline.spec.ts` skip themselves over the self-signed edge: browsers validate the
service-worker script's certificate themselves, and Playwright's
`ignoreHTTPSErrors` cannot bypass that. Production (Let's Encrypt) is trusted,
so the SW test is meaningful only on the http rig (`E2E_BASE_URL=http://localhost:8081`).

## Restore the http rig

```bash
docker compose -f compose.prod.yaml build && docker compose -f compose.prod.yaml up -d --force-recreate
```
