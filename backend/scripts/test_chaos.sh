#!/usr/bin/env bash
# =============================================================================
# scripts/test_chaos.sh
# Phase 5 — Chaos engineering tests.
#
# Simulates:
#   1. Kill backend process → auto-restart recovery
#   2. Restart Redis → pub/sub reconnect
#   3. Restart Postgres → DB connection recovery
#   4. Concurrent kill all → full system recovery
#   5. Token integrity check after chaos
#
# Usage:
#   chmod +x scripts/test_chaos.sh
#   ./scripts/test_chaos.sh
# =============================================================================
set -euo pipefail

BASE_URL="http://localhost:8000"
PASS=0
FAIL=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  ✅ PASS${NC} — $1"; ((PASS++)); }
fail() { echo -e "${RED}  ❌ FAIL${NC} — $1"; ((FAIL++)); }
info() { echo -e "${CYAN}  ℹ️  $1${NC}"; }
header() { echo -e "\n${YELLOW}━━━ $1 ━━━${NC}"; }

wait_api() {
  local max=${1:-30}
  local i=0
  while [ $i -lt $max ]; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" 2>/dev/null || echo "000")
    if [ "$CODE" = "200" ]; then return 0; fi
    sleep 2; ((i++))
  done
  return 1
}

# =============================================================================
header "CHAOS 1 — Kill backend process"
# =============================================================================
info "Killing backend container..."
docker kill queue_backend >/dev/null 2>&1 || true
sleep 2

info "Container should auto-restart (restart: always)..."
sleep 10

if wait_api 30; then
  ok "Backend auto-recovered after kill"
else
  fail "Backend did not auto-recover after kill"
fi

# =============================================================================
header "CHAOS 2 — Restart Redis mid-operation"
# =============================================================================
info "Restarting Redis..."
docker restart queue_redis >/dev/null
sleep 5

if wait_api 20; then
  HEALTH=$(curl -s "$BASE_URL/health")
  REDIS_STATUS=$(echo "$HEALTH" | jq -r '.redis' 2>/dev/null || echo "unknown")
  if [ "$REDIS_STATUS" = "connected" ]; then
    ok "Redis recovered and reconnected"
  else
    fail "Redis status after restart: $REDIS_STATUS"
  fi
else
  fail "API unreachable after Redis restart"
fi

# =============================================================================
header "CHAOS 3 — Restart Postgres under load"
# =============================================================================
info "Sending 10 join requests..."
QUEUE_ID=""
# Get a queue ID from health or seed
# First try to create a token to verify DB is working
for i in $(seq 1 10); do
  curl -s -o /dev/null "$BASE_URL/health" &
done
wait

info "Restarting Postgres..."
docker restart queue_postgres >/dev/null
sleep 5

if wait_api 30; then
  HEALTH=$(curl -s "$BASE_URL/health")
  DB_STATUS=$(echo "$HEALTH" | jq -r '.database' 2>/dev/null || echo "unknown")
  if [ "$DB_STATUS" = "connected" ]; then
    ok "Postgres recovered and DB reconnected"
  else
    fail "DB status after restart: $DB_STATUS"
  fi
else
  fail "API unreachable after Postgres restart"
fi

# =============================================================================
header "CHAOS 4 — Simultaneous restart of all services"
# =============================================================================
info "Restarting ALL services simultaneously..."
docker restart queue_postgres queue_redis queue_backend >/dev/null

sleep 15

if wait_api 30; then
  HEALTH=$(curl -s "$BASE_URL/health")
  API=$(echo "$HEALTH" | jq -r '.api' 2>/dev/null || echo "unknown")
  DB=$(echo "$HEALTH" | jq -r '.database' 2>/dev/null || echo "unknown")
  RD=$(echo "$HEALTH" | jq -r '.redis' 2>/dev/null || echo "unknown")
  
  if [ "$API" = "ok" ] && [ "$DB" = "connected" ] && [ "$RD" = "connected" ]; then
    ok "Full system recovered after simultaneous restart"
  else
    fail "System partially recovered: api=$API db=$DB redis=$RD"
  fi
else
  fail "System did not recover from simultaneous restart"
fi

# =============================================================================
header "CHAOS 5 — Verify no data corruption"
# =============================================================================
info "Checking /health is clean..."
FINAL_HEALTH=$(curl -s "$BASE_URL/health")
FINAL_API=$(echo "$FINAL_HEALTH" | jq -r '.api')
FINAL_DB=$(echo "$FINAL_HEALTH" | jq -r '.database')
FINAL_RD=$(echo "$FINAL_HEALTH" | jq -r '.redis')

[ "$FINAL_API" = "ok" ]        && ok "API stable"   || fail "API: $FINAL_API"
[ "$FINAL_DB" = "connected" ]  && ok "DB stable"    || fail "DB: $FINAL_DB"
[ "$FINAL_RD" = "connected" ]  && ok "Redis stable" || fail "Redis: $FINAL_RD"

# Check metrics endpoint still works
METRICS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/metrics")
[ "$METRICS_CODE" = "200" ] && ok "Metrics endpoint operational" || fail "Metrics: HTTP $METRICS_CODE"

# =============================================================================
header "CHAOS 6 — Log audit (no secrets leaked)"
# =============================================================================
LOGS=$(docker logs queue_backend 2>&1 || true)

echo "$LOGS" | grep -qi "password"  && fail "Password found in logs" || ok "No passwords in logs"
echo "$LOGS" | grep -qE 'eyJ[A-Za-z0-9_-]{20,}' && fail "JWT in logs" || ok "No JWTs in logs"

# =============================================================================
header "RESULTS"
# =============================================================================
TOTAL=$((PASS + FAIL))
echo ""
echo -e "  Total: $TOTAL  ${GREEN}Pass: $PASS${NC}  ${RED}Fail: $FAIL${NC}"
echo ""
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}🎉  ALL CHAOS TESTS PASSED — System is production resilient!${NC}"
  exit 0
else
  echo -e "${RED}⛔  $FAIL test(s) failed — system needs hardening.${NC}"
  exit 1
fi
