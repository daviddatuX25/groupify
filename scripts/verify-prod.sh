#!/usr/bin/env bash
# AC3 acceptance verification for a running Groupify deployment.
# Usage: ./scripts/verify-prod.sh [BASE_URL]   (default http://localhost:8081)
set -euo pipefail

BASE_URL="${1:-http://localhost:8081}"
COOKIE="$(mktemp)"
PY=python3
fail=0

step() { printf '\n== %s\n' "$1"; }
ok()   { printf '   ok: %s\n' "$1"; }
bad()  { printf '   FAIL: %s\n' "$1"; fail=1; }

step "health"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/health")
[ "$code" = "200" ] && ok "health 200" || bad "health $code"

step "create session"
curl -s -c "$COOKIE" "$BASE_URL/new" -o /dev/null
XSRF=$(grep XSRF-TOKEN "$COOKIE" | awk '{print $NF}' | "$PY" -c "import sys,urllib.parse;print(urllib.parse.unquote(sys.stdin.read().strip()))")
ADMIN=$(curl -s -b "$COOKIE" -H "X-XSRF-TOKEN: $XSRF" -X POST "$BASE_URL/sessions" -o /dev/null -w '%{redirect_url}')
SID=$(echo "$ADMIN" | grep -oE 'sessions/[0-9]+' | cut -d/ -f2)
ATOK=$(echo "$ADMIN" | grep -oE 'token=[a-zA-Z0-9]+' | cut -d= -f2)
[ -n "$SID" ] && [ -n "$ATOK" ] && ok "session $SID" || bad "no session redirect"
PAGE=$(curl -s -b "$COOKIE" "$BASE_URL/admin/sessions/$SID?token=$ATOK")
CODE=$(echo "$PAGE" | grep -oE '"code":"[0-9]{6}"' | grep -oE '[0-9]{6}' | head -1)
PIN=$(echo "$PAGE" | grep -oE '"pin":"[0-9]{4}"' | grep -oE '[0-9]{4}' | head -1)
[ -n "$CODE" ] && [ -n "$PIN" ] && ok "code $CODE pin $PIN" || bad "code/pin missing"

step "20-participant join smoke"
JOIN_HEADERS=(-b "$COOKIE" -H "X-XSRF-TOKEN: $XSRF" -H 'Content-Type: application/json')
declare -a TOKENS
for i in $(seq 1 20); do
    T="$("$PY" -c 'import uuid;print(uuid.uuid4())')"
    TOKENS+=("$T")
    curl -s "${JOIN_HEADERS[@]}" -X POST "$BASE_URL/join/$CODE" -d "{\"pin\":\"$PIN\",\"name\":\"P$i\",\"device_token\":\"$T\"}" -o /dev/null
done
PRESENCE=$(curl -s "$BASE_URL/api/sessions/$CODE/board" | "$PY" -c "import json,sys;print(json.load(sys.stdin)['presence'])")
[ "$PRESENCE" -ge 20 ] && ok "presence $PRESENCE" || bad "presence $PRESENCE < 20"

step "group flow (leader creates, member joins)"
L="${TOKENS[0]}"
M="${TOKENS[1]}"
curl -s -b "$COOKIE" -H "X-XSRF-TOKEN: $XSRF" -H "X-Device-Token: $L" -H 'Accept: application/json' -H 'Content-Type: application/json' \
    -X POST "$BASE_URL/s/$CODE/groups" -d '{"name":"Smoke"}' -o /dev/null
GID=$(curl -s -H "X-Device-Token: $L" "$BASE_URL/api/sessions/$CODE/board" | "$PY" -c "import json,sys;print([g['id'] for g in json.load(sys.stdin)['groups'] if g['name']=='Smoke'][0])")
curl -s -b "$COOKIE" -H "X-XSRF-TOKEN: $XSRF" -H "X-Device-Token: $M" -H 'Accept: application/json' -H 'Content-Type: application/json' \
    -X POST "$BASE_URL/s/$CODE/groups/$GID/join" -d '{}' -o /dev/null
BOARD=$(curl -s -H "X-Device-Token: $L" "$BASE_URL/api/sessions/$CODE/board")
echo "$BOARD" | "$PY" -c "import json,sys; d=json.load(sys.stdin); g=[x for x in d['groups'] if x['name']=='Smoke'][0]; assert g['member_count']==2, g; print('   ok: group has 2 members')" || bad "group members"

step "quiz (enable extension, save, start, grade, leaderboard)"
curl -s -b "$COOKIE" -H "X-XSRF-TOKEN: $XSRF" -H "X-Admin-Token: $ATOK" -H 'Accept: application/json' -H 'Content-Type: application/json' \
    -X PUT "$BASE_URL/admin/sessions/$SID/config" -d '{"plugins":["quiz"]}' -o /dev/null
Q='{"questions":[{"q":"1+1?","options":["2","3"],"answer":0,"points":10}]}'
curl -s -b "$COOKIE" -H "X-XSRF-TOKEN: $XSRF" -H "X-Admin-Token: $ATOK" -H 'Accept: application/json' -H 'Content-Type: application/json' \
    -X PUT "$BASE_URL/admin/sessions/$SID/quiz" -d "$Q" -o /dev/null
curl -s -b "$COOKIE" -H "X-XSRF-TOKEN: $XSRF" -H "X-Admin-Token: $ATOK" -H 'Accept: application/json' \
    -X POST "$BASE_URL/admin/sessions/$SID/quiz/start" -o /dev/null
ANS=$(curl -s -b "$COOKIE" -H "X-XSRF-TOKEN: $XSRF" -H "X-Device-Token: $L" -H 'Accept: application/json' -H 'Content-Type: application/json' \
    -X POST "$BASE_URL/s/$CODE/groups/$GID/quiz/answer" -d '{"question_index":0,"answer_index":0}')
echo "$ANS" | grep -q '"correct":true' && ok "graded correct" || bad "quiz grading: $ANS"

step "CSV export"
CSV=$(curl -s -b "$COOKIE" -H "X-Admin-Token: $ATOK" "$BASE_URL/admin/sessions/$SID/export")
echo "$CSV" | head -2 | grep -q "group,name" && ok "csv header" || bad "csv: $(echo "$CSV" | head -1)"

step "public snapshot does not leak quiz answers"
LEAK=$(curl -s "$BASE_URL/api/sessions/$CODE/board" | "$PY" -c "import json,sys; q=json.load(sys.stdin)['quiz']['question']; print('answer' in q)")
[ "$LEAK" = "False" ] && ok "no answer key" || bad "answer key leaked!"

rm -f "$COOKIE"
printf '\n%s\n' "RESULT: $([ "$fail" = 0 ] && echo 'ALL CHECKS PASSED' || echo 'FAILURES PRESENT')"
exit "$fail"
