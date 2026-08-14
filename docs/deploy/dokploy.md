# Groupify — Dokploy Deployment (6-3)

Target: `https://groupify.dxtechph.online` on your Dokploy instance. Applying
the live deployment requires **your Dokploy credentials** — this document is the
config-level recipe, and everything here is locally tested via
`compose.prod.yaml` (the same image Dokploy will run).

## Prerequisites

- Your Dokploy server URL + API credentials (to create the application).
- DNS: `groupify.dxtechph.online` → your Dokploy server IP (A record).

## Steps (Dokploy UI)

1. **Create application** — Docker (Git) type:
   - Repository: your Groupify git remote, branch `main`.
   - Build type: **Dockerfile** with path `Dockerfile.prod`.
   - Build args (baked into the JS bundle — the browser's WS endpoint):
     - `VITE_REVERB_HOST=groupify.dxtechph.online`
     - `VITE_REVERB_APP_KEY=<your REVERB_APP_KEY>`
     - `VITE_REVERB_PORT=443`
     - `VITE_REVERB_SCHEME=https`
2. **Domain & SSL** — set `groupify.dxtechph.online`; Dokploy issues the
   Let's Encrypt certificate (AC 1).
3. **Environment variables** (see `.env.production.example`):
   - `APP_ENV=production`, `APP_URL=https://groupify.dxtechph.online`
   - `APP_KEY` (optional — the entrypoint generates a random one on first boot and persists it on the data volume; set it explicitly if you prefer a fixed key)
   - `DB_CONNECTION=sqlite`, `DB_DATABASE=/var/www/html/database/data/database.sqlite`
   - `QUEUE_CONNECTION=database`, `CACHE_STORE=database`, `SESSION_DRIVER=database`
   - `BROADCAST_CONNECTION=reverb`
   - `REVERB_APP_ID/KEY/SECRET` (real random values), `REVERB_HOST=127.0.0.1`, `REVERB_PORT=8080`, `REVERB_SCHEME=http`
   - `DB_BUSY_TIMEOUT=30000` (SQLite write contention with the queue worker + scheduler)
4. **Volumes** (persistence): mount two volumes at
   `/var/www/html/database/data` (the SQLite file — migrations live in the image,
   never shadow the whole `database` dir) and `/var/www/html/storage`.
5. **WebSocket proxying (AC 2)**: Dokploy's default Caddy reverse proxy passes
   HTTP/1.1 upgrade requests through; the in-container nginx already proxies
   `/app` → Reverb `127.0.0.1:8080` with upgrade headers and buffering off.
   If your Dokploy proxy blocks upgrades, add the Caddy snippet:
   ```
   reverse_proxy /app/* app:80 {
       header_up Connection {http.request.header.Connection}
       header_up Upgrade {http.request.header.Upgrade}
   }
   ```
6. **Scheduler (FR-1.7 purge)**: `schedule:work` runs inside the container
   (supervisord) — no external cron needed.

## Verification (after deploy — AC 3)

Automated acceptance (health, session, 20-join smoke, group flow, quiz grading,
CSV export, no answer-key leak):

```bash
./scripts/verify-prod.sh https://groupify.dxtechph.online
```

Manual checks:
1. `curl https://groupify.dxtechph.online/health` → `{"status":"ok"}`.
2. Open the URL → `/new` → create a session → admin panel renders QR + PIN.
3. Join by QR/code+PIN on a phone → board shows the seat; second device sees it ≤1s.
4. **Offline drill**: stop the container → banner within ~5s on clients; restart → resync, no duplicate seats.
5. **CSV**: form groups with a topic, export, confirm the topic column.

## Backups (one-file DB)

```bash
./scripts/backup.sh            # WAL-safe snapshot → ./backups/groupify-<ts>.sqlite
crontab: 0 3 * * * cd /home/<user>/groupify && ./scripts/backup.sh
```
Restore: stop the stack, replace `database/data/database.sqlite` (volume) with
the snapshot, delete `-wal`/`-shm` siblings, start the stack.

## Local test (no credentials needed)

```bash
docker compose -f compose.prod.yaml up -d --build
curl http://localhost:8081/health
# then the same flows against localhost:8081 (WS on the same port via /app)
```
