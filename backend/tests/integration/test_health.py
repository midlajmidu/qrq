"""
tests/integration/test_health.py
PART 1 — Health endpoint behavior tests (Part 2A only; 2B/2C require container control).
"""
import pytest
from httpx import AsyncClient


class TestHealthEndpoint:
    """Test 2A — Normal health baseline."""

    async def test_health_returns_200(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == 200

    async def test_health_api_ok(self, client: AsyncClient):
        data = resp = await client.get("/health")
        data = resp.json()
        assert data["api"] == "ok"

    async def test_health_database_connected(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.json()["database"] == "connected"

    async def test_health_redis_connected(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.json()["redis"] == "connected"

    async def test_health_all_three_keys_present(self, client: AsyncClient):
        resp = await client.get("/health")
        data = resp.json()
        assert set(data.keys()) >= {"api", "database", "redis"}

    async def test_health_v1_prefix_also_works(self, client: AsyncClient):
        """Health is also mounted at /api/v1/health."""
        resp = await client.get("/api/v1/health")
        assert resp.status_code == 200
        assert resp.json()["api"] == "ok"
