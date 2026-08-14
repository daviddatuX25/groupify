#!/usr/bin/env bash
# Load smoke: N joins, group formation, snapshot latency, realtime propagation.
# Usage: ./scripts/load-test.sh [COUNT] [BASE_URL]   (default 100, http://localhost:8081)
set -euo pipefail

COUNT="${1:-100}"
BASE_URL="${2:-http://localhost:8081}"
PY=python3
COOKIE="$(mktemp)"
TOKENS="$(mktemp)"

step() { printf '\n== %s\n' "$1"; }

step "create session"
curl -s -c "$COOKIE" "$BASE_URL/new" -o /dev/null
XSRF=$(grep XSRF-TOKEN "$COOKIE" | awk '{print $NF}' | "$PY" -c "import sys,urllib.parse;print(urllib.parse.unquote(sys.stdin.read().strip()))")
ADMIN=$(curl -s -b "$COOKIE" -H "X-XSRF-TOKEN: $XSRF" -X POST "$BASE_URL/sessions" -o /dev/null -w '%{redirect_url}')
SID=$(echo "$ADMIN" | grep -oE 'sessions/[0-9]+' | cut -d/ -f2)
ATOK=$(echo "$ADMIN" | grep -oE 'token=[a-zA-Z0-9]+' | cut -d= -f2)
PAGE=$(curl -s -b "$COOKIE" "$BASE_URL/admin/sessions/$SID?token=$ATOK")
CODE=$(echo "$PAGE" | grep -oE '"code":"[0-9]{6}"' | grep -oE '[0-9]{6}' | head -1)
PIN=$(echo "$PAGE" | grep -oE '"pin":"[0-9]{4}"' | grep -oE '[0-9]{4}' | head -1)
echo "session $SID code $CODE"

step "join $COUNT participants (sequential)"
START=$(date +%s.%N)
for i in $(seq 1 "$COUNT"); do
    T="$("$PY" -c 'import uuid;print(uuid.uuid4())')"
    echo "$T" >> "$TOKENS"
    curl -s -b "$COOKIE" -H "X-XSRF-TOKEN: $XSRF" -H 'Content-Type: application/json' \
        -X POST "$BASE_URL/join/$CODE" -d "{\"pin\":\"$PIN\",\"name\":\"U$i\",\"device_token\":\"$T\"}" -o /dev/null &
    # 25 concurrent curls, then wait
    [ $((i % 25)) -eq 0 ] && wait
done
wait
END=$(date +%s.%N)
echo "joins/s: $("$PY" -c "print(f'{$COUNT / ($END - $START):.0f}')")  (total $("$PY" -c "print(f'{$END - $START:.1f}')")s)"

step "snapshot latency at $COUNT participants (10 samples)"
LAT=$("$PY" - << EOF
import json, subprocess, time, statistics
import urllib.request
url = "$BASE_URL/api/sessions/$CODE/board"
samples = []
for _ in range(10):
    t0 = time.perf_counter()
    with urllib.request.urlopen(url) as r:
        data = json.load(r)
    samples.append((time.perf_counter() - t0) * 1000)
print(f"presence={data['presence']} median={statistics.median(samples):.0f}ms p95={sorted(samples)[8]:.0f}ms")
EOF
)
echo "$LAT"

step "group formation (20 groups x 5 members)"
# One leader per group (a participant can only be in one group — app invariant).
L="$(head -1 "$TOKENS")"
for g in $(seq 1 20); do
    LEADER="$(sed -n "${g}p" "$TOKENS")"
    curl -s -b "$COOKIE" -H "X-XSRF-TOKEN: $XSRF" -H "X-Device-Token: $LEADER" -H 'Accept: application/json' -H 'Content-Type: application/json' \
        -X POST "$BASE_URL/s/$CODE/groups" -d "{\"name\":\"G$g\"}" -o /dev/null
done
GIDS=$(curl -s -H "X-Device-Token: $L" "$BASE_URL/api/sessions/$CODE/board" | "$PY" -c "import json,sys; print(' '.join(str(g['id']) for g in json.load(sys.stdin)['groups']))")
I=21
for gid in $GIDS; do
    for m in 1 2 3 4; do
        T="$(sed -n "${I}p" "$TOKENS")"; I=$((I+1))
        curl -s -b "$COOKIE" -H "X-XSRF-TOKEN: $XSRF" -H "X-Device-Token: $T" -H 'Accept: application/json' -H 'Content-Type: application/json' \
            -X POST "$BASE_URL/s/$CODE/groups/$gid/join" -d '{}' -o /dev/null
    done
done
BOARD=$(curl -s -H "X-Device-Token: $L" "$BASE_URL/api/sessions/$CODE/board")
echo "$BOARD" | "$PY" -c "import json,sys; d=json.load(sys.stdin); print('groups:', len(d['groups']), 'members in g1:', d['groups'][0]['member_count'])"

rm -f "$COOKIE" "$TOKENS"
echo ""
echo "done"
