#!/usr/bin/env bash
# =============================================================================
# scripts/test_infrastructure.sh
# PARTS 1, 2, 8 — Docker container and failure-recovery tests
#
# Usage:
#   chmod +x scripts/test_infrastructure.sh
#   ./scripts/test_infrastructure.sh
#
# Requires: docker, curl, jq
# =============================================================================
set -euo pipefail

BASE_URL="http://localhost:8000"
PASS=0
FAIL=0

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ok()   { echo -e "${GREEN}  ✅ PASS${NC} — $1"; ((PASS++)); }
fail() { echo -e "${RED}  ❌ FAIL${NC} — $1"; ((FAIL++)); }
info() { echo -e "${CYAN}  ℹ️  $1${NC}"; }
header() { echo -e "\n${YELLOW}━━━ $1 ━━━${NC}"; }

wait_for_healthy() {
  local name=$1
  local max=30
  local i=0
  info "Waiting for $name to become healthy..."
  while [ $i -lt $max ]; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$name" 2>/dev/null || echo "missing")
    if [ "$STATUS" = "healthy" ]; then
      ok "$name is healthy"
      return 0
    fi
    sleep 2
    ((i++))
  done
  fail "$name did not become healthy in ${max}×2s"
  return 1
}

wait_http_200() {
  local url=$1
  local max=${2:-30}
  local i=0
  while [ $i -lt $max ]; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    if [ "$CODE" = "200" ]; then return 0; fi
    sleep 2; ((i++))
  done
  return 1
}

# =============================================================================
header "PART 1 — Container stability"
# =============================================================================

info "Checking all containers exist and are running..."
for c in queue_postgres queue_redis queue_backend; do
  STATE=$(docker inspect --format='{{.State.Status}}' "$c" 2>/dev/null || echo "missing")
  if [ "$STATE" = "running" ]; then
    ok "$c is running"
  else
    fail "$c state=$STATE (expected running)"
  fi
done

wait_for_healthy "queue_postgres"
wait_for_healthy "queue_redis"

if wait_http_200 "$BASE_URL/health" 30; then
  ok "Backend HTTP endpoint reachable"
else
  fail "Backend not reachable after 60s"
fi

# =============================================================================
header "PART 2A — Health endpoint (all services up)"
# =============================================================================

HEALTH=$(curl -s "$BASE_URL/health")
info "Response: $HEALTH"

API=$(echo "$HEALTH" | jq -r '.api' 2>/dev/null || echo "parse_error")
DB=$(echo "$HEALTH"  | jq -r '.database' 2>/dev/null || echo "parse_error")
RD=$(echo "$HEALTH"  | jq -r '.redis' 2>/dev/null || echo "parse_error")

[ "$API" = "ok" ]        && ok "api=ok"          || fail "api=$API"
[ "$DB" = "connected" ]  && ok "database=connected" || fail "database=$DB"
[ "$RD" = "connected" ]  && ok "redis=connected"  || fail "redis=$RD"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
[ "$HTTP_CODE" = "200" ] && ok "HTTP 200 returned" || fail "HTTP $HTTP_CODE returned"

# =============================================================================
header "PART 2B — DB failure simulation"
# =============================================================================

info "Stopping postgres..."
docker stop queue_postgres >/dev/null

sleep 3
HEALTH_DB_DOWN=$(curl -s "$BASE_URL/health" || echo '{"database":"unreachable"}')
DB_STATUS=$(echo "$HEALTH_DB_DOWN" | jq -r '.database' 2>/dev/null || echo "unreachable")
HTTP_DOWN=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")

info "DB-down health response: $HEALTH_DB_DOWN"
[[ "$DB_STATUS" != "connected" ]] && ok "database shows failure when postgres stopped" \
                                  || fail "database still shows connected while postgres is down"
[ "$HTTP_DOWN" = "503" ] && ok "HTTP 503 returned on DB failure" \
                          || fail "Expected 503, got $HTTP_DOWN"

info "Restarting postgres..."
docker start queue_postgres >/dev/null
wait_for_healthy "queue_postgres"
sleep 5

HEALTH_AFTER=$(curl -s "$BASE_URL/health")
DB_AFTER=$(echo "$HEALTH_AFTER" | jq -r '.database' 2>/dev/null || echo "error")
[ "$DB_AFTER" = "connected" ] && ok "Database recovered after restart" \
                              || fail "Database did not recover: $DB_AFTER"

# =============================================================================
header "PART 2C — Redis failure simulation"
# =============================================================================

info "Stopping redis..."
docker stop queue_redis >/dev/null

sleep 3
HEALTH_RD_DOWN=$(curl -s "$BASE_URL/health" || echo '{"redis":"unreachable"}')
RD_STATUS=$(echo "$HEALTH_RD_DOWN" | jq -r '.redis' 2>/dev/null || echo "unreachable")
HTTP_RD=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")

info "Redis-down health response: $HEALTH_RD_DOWN"
[[ "$RD_STATUS" != "connected" ]] && ok "redis shows failure when redis stopped" \
                                   || fail "redis still shows connected while redis is down"
[ "$HTTP_RD" = "503" ] && ok "HTTP 503 returned on Redis failure" \
                        || fail "Expected 503, got $HTTP_RD"

info "Restarting redis..."
docker start queue_redis >/dev/null

sleep 5
HEALTH_RD_AFTER=$(curl -s "$BASE_URL/health")
RD_AFTER=$(echo "$HEALTH_RD_AFTER" | jq -r '.redis' 2>/dev/null || echo "error")
[ "$RD_AFTER" = "connected" ] && ok "Redis recovered after restart" \
                              || fail "Redis did not recover: $RD_AFTER"

# =============================================================================
header "PART 8 — Failure recovery (container restarts)"
# =============================================================================

for container in queue_backend queue_postgres queue_redis; do
  info "Restarting $container..."
  docker restart "$container" >/dev/null
  sleep 5

  if wait_http_200 "$BASE_URL/health" 20; then
    ok "$container restart: system recovered"
  else
    fail "$container restart: system did not recover within 40s"
  fi
done

# =============================================================================
header "PART 7 — Logging audit"
# =============================================================================

info "Scanning backend logs for forbidden content..."
LOGS=$(docker logs queue_backend 2>&1 || true)

if echo "$LOGS" | grep -qi "password"; then
  fail "CRITICAL: 'password' found in logs"
else
  ok "No 'password' string in logs"
fi

if echo "$LOGS" | grep -qE 'eyJ[A-Za-z0-9_-]{20,}'; then
  fail "CRITICAL: JWT token found in logs"
else
  ok "No JWT tokens in logs"
fi

if echo "$LOGS" | grep -qi "traceback\|exception\|stacktrace"; then
  fail "Stack traces found in logs"
else
  ok "No stack traces in logs"
fi

if echo "$LOGS" | grep -qi "startup\|connected\|ready"; then
  ok "Startup logs present"
else
  fail "No startup logs found"
fi

# =============================================================================
header "RESULTS"
# =============================================================================
TOTAL=$((PASS + FAIL))
echo ""
echo -e "  Total: $TOTAL  ${GREEN}Pass: $PASS${NC}  ${RED}Fail: $FAIL${NC}"
echo ""
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}🎉  ALL INFRASTRUCTURE TESTS PASSED — Ready for Phase 3!${NC}"
  exit 0
else
  echo -e "${RED}⛔  $FAIL test(s) failed — fix before proceeding.${NC}"
  exit 1
fi
