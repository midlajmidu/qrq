#!/usr/bin/env bash
# =============================================================================
# scripts/run_tests.sh
# One-command test runner — runs ALL phases inside Docker
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}━━━ Installing test dependencies ━━━${NC}"
docker-compose exec backend pip install -q -r requirements-test.txt

echo -e "\n${YELLOW}━━━ UNIT TESTS ━━━${NC}"
docker-compose exec backend pytest tests/unit/ -v --tb=short

echo -e "\n${YELLOW}━━━ INTEGRATION TESTS — Auth ━━━${NC}"
docker-compose exec backend pytest tests/integration/test_auth.py tests/integration/test_health.py -v --tb=short

echo -e "\n${YELLOW}━━━ INTEGRATION TESTS — Queue Engine ━━━${NC}"
docker-compose exec backend pytest tests/integration/test_queue_engine.py -v --tb=short

echo -e "\n${YELLOW}━━━ SECURITY TESTS ━━━${NC}"
docker-compose exec backend pytest tests/security/ -v --tb=short

echo -e "\n${YELLOW}━━━ CONCURRENCY TESTS ━━━${NC}"
docker-compose exec backend pytest tests/concurrency/ -v --tb=short -s

echo -e "\n${YELLOW}━━━ REAL-TIME TESTS — WebSocket + PubSub ━━━${NC}"
docker-compose exec backend pytest tests/realtime/ -v --tb=short -s

echo -e "\n${YELLOW}━━━ HARDENING TESTS — Rate Limiting + Resilience ━━━${NC}"
docker-compose exec backend pytest tests/hardening/ -v --tb=short -s

echo -e "\n${YELLOW}━━━ FULL SUITE WITH COVERAGE ━━━${NC}"
docker-compose exec backend pytest tests/ --cov=app --cov-report=term-missing -q

echo -e "\n${GREEN}✅  All test suites complete — system is production-ready.${NC}"
