#!/usr/bin/env bash
# WAL-safe SQLite backup for Groupify — the whole session DB is one file.
# Runs VACUUM INTO inside the prod app image (PDO sqlite), then copies the
# consistent snapshot out. Safe to run while the stack is live.
# Usage: ./scripts/backup.sh [OUT_DIR]   (default ./backups)
# Restore: stop the stack, replace database/data/database.sqlite with the
# snapshot, delete database/data/database.sqlite-wal and -shm, start the stack.
set -euo pipefail

cd "$(dirname "$0")/.."
OUT_DIR="${1:-backups}"
mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$OUT_DIR/groupify-$STAMP.sqlite"

docker compose -f compose.prod.yaml run --rm --entrypoint php app-prod -r '
    $db = new PDO("sqlite:/var/www/html/database/data/database.sqlite");
    $out = "/var/www/html/database/data/backup.sqlite";
    @unlink($out);
    $db->exec("VACUUM INTO " . $db->quote($out));
    echo "snapshot ok\n";
'

# The volume is a named docker volume — stream the snapshot out of it.
docker compose -f compose.prod.yaml run --rm --entrypoint sh app-prod -lc \
    'cat /var/www/html/database/data/backup.sqlite; rm -f /var/www/html/database/data/backup.sqlite' > "$OUT"

ln -sf "$(basename "$OUT")" "$OUT_DIR/latest.sqlite"

echo "backup written: $OUT ($(du -h "$OUT" | cut -f1))"
echo "latest symlink: $OUT_DIR/latest.sqlite"
