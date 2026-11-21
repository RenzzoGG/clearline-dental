#!/usr/bin/env bash
# End-to-end smoke test of the auth + booking flow against a running API.
#
# Usage:   scripts/jwt_flow.sh
# Env:     API_URL (default http://localhost:8000/api),
#          DENTIST_ID / SERVICE_ID (default: first active ones from the public API)
#
# Registers a throwaway patient (flow.<random>@example.com), books the first free slot,
# checks role-based access, cancels the booking and checks refresh token rotation.
# Exits non-zero if any check fails. Requires curl and python3.
set -uo pipefail

API_URL="${API_URL:-http://localhost:8000/api}"
EMAIL="flow.$(date +%s).$RANDOM@example.com"
PASSWORD="Sm1le-Brightly-2030"
FAILURES=0

json() { python3 -c "import sys, json; d = json.load(sys.stdin); print($1)"; }
post() { curl -s -H "Content-Type: application/json" -X POST "$@"; }
status_of() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

check() {
    local name="$1" expected="$2" actual="$3"
    if [[ "$actual" == "$expected" ]]; then
        printf 'PASS  %-34s %s\n' "$name" "$actual"
    else
        printf 'FAIL  %-34s expected %s, got %s\n' "$name" "$expected" "$actual"
        FAILURES=$((FAILURES + 1))
    fi
}

next_open_day() {
    local offset=2 day
    while :; do
        day=$(date -d "+${offset} day" +%F)
        [[ "$(date -d "$day" +%u)" != 7 ]] && { echo "$day"; return; }
        offset=$((offset + 1))
    done
}

first_public_id() {
    curl -s "$API_URL/$1/" | json "d['results'][0]['id'] if d.get('results') else ''"
}
DENTIST_ID="${DENTIST_ID:-$(first_public_id dentists)}"
SERVICE_ID="${SERVICE_ID:-$(first_public_id services)}"
if [[ -z "$DENTIST_ID" || -z "$SERVICE_ID" ]]; then
    echo "No active dentist/service found. Seed data first: python manage.py seed" >&2
    exit 1
fi
echo "API $API_URL | dentist $DENTIST_ID | service $SERVICE_ID"
echo

# 1. Register + log in
registration=$(post "$API_URL/auth/register/" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"first_name\":\"Flow\",\"last_name\":\"Test\",\"phone\":\"+52 662 000 0000\"}")
check "register role" "patient" "$(echo "$registration" | json "d.get('role')")"

tokens=$(post "$API_URL/auth/token/" -d "{\"username\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
access=$(echo "$tokens" | json "d.get('access', '')")
refresh=$(echo "$tokens" | json "d.get('refresh', '')")
AUTH=(-H "Authorization: Bearer $access")
check "login returns tokens" "yes" "$([[ -n "$access" && -n "$refresh" ]] && echo yes || echo no)"
check "me role" "patient" "$(curl -s "${AUTH[@]}" "$API_URL/auth/me/" | json "d.get('role')")"

# 2. Book the first free slot (sending another patient's id, which must be ignored).
#    Look ahead up to two weeks: a busy calendar can leave the next open day fully booked.
day=$(next_open_day)
slot=""
for _ in $(seq 1 14); do
    slot=$(curl -s "$API_URL/availability/?dentist=$DENTIST_ID&service=$SERVICE_ID&date=$day" | json "d['slots'][0]['starts_at'] if d.get('slots') else ''")
    [[ -n "$slot" ]] && break
    day=$(python3 -c "import datetime as d; print(d.date.fromisoformat('$day') + d.timedelta(days=1))")
done
check "availability has a slot ($day)" "yes" "$([[ -n "$slot" ]] && echo yes || echo no)"

booking=$(post "${AUTH[@]}" "$API_URL/appointments/" -d "{\"patient\":1,\"dentist\":$DENTIST_ID,\"service\":$SERVICE_ID,\"starts_at\":\"$slot\"}")
appointment_id=$(echo "$booking" | json "d.get('id', '')")
check "booking status" "pending" "$(echo "$booking" | json "d.get('status')")"
check "booked for self (patient ignored)" "Flow Test" "$(echo "$booking" | json "d.get('patient_name')")"

# 3. Role-based access
check "patient sees only own list" "1" "$(curl -s "${AUTH[@]}" "$API_URL/appointments/" | json "d.get('count')")"
# The previous id belongs to another patient in any seeded DB. A missing id is also a 404,
# by design: the API never reveals whether someone else's appointment exists.
check "someone else's appointment" "404" "$(status_of "${AUTH[@]}" "$API_URL/appointments/$((appointment_id - 1))/")"
check "patient cannot confirm" "403" "$(status_of "${AUTH[@]}" -X POST "$API_URL/appointments/$appointment_id/confirm/")"
check "patient cannot list patients" "403" "$(status_of "${AUTH[@]}" "$API_URL/patients/")"
check "patient cancels own" "cancelled" "$(post "${AUTH[@]}" "$API_URL/appointments/$appointment_id/cancel/" | json "d.get('status')")"

# 4. Refresh rotation: the old refresh token is blacklisted after use
check "refresh" "200" "$(status_of -H 'Content-Type: application/json' -X POST "$API_URL/auth/token/refresh/" -d "{\"refresh\":\"$refresh\"}")"
check "reuse old refresh" "401" "$(status_of -H 'Content-Type: application/json' -X POST "$API_URL/auth/token/refresh/" -d "{\"refresh\":\"$refresh\"}")"

# 5. Anonymous access
check "anonymous appointments" "401" "$(status_of "$API_URL/appointments/")"
check "anonymous services (public)" "200" "$(status_of "$API_URL/services/")"

echo
if (( FAILURES > 0 )); then
    echo "$FAILURES check(s) failed."
    exit 1
fi
echo "All checks passed."
